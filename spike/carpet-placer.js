/**
 * Carpet-specific WebXR placement.
 *
 * Generic AR viewers treat a rug like any other 3D object: it can tilt, float,
 * and be scaled to any size. A carpet can do none of those things. This layer
 * encodes what a carpet actually is:
 *
 *   - it always lies flat on the detected floor (no pitch, no roll, no hover)
 *   - one finger slides it across that floor
 *   - two fingers twist it around its own centre
 *   - two fingers pinched apart/together switch to the next size the shop
 *     actually sells — never a free scale, because a size you cannot buy is a
 *     lie about how the carpet will look in your home
 *
 * Everything below sits on top of ARCore/ARKit through WebXR; the tracking and
 * plane detection are the platform's, the carpet semantics are ours.
 */

import * as THREE from './three.module.min.js';
import { GLTFLoader } from './gltf-loader.module.js';

const CARPET_LIFT = 0.003;          // metres above the floor plane, avoids z-fighting
const SHADOW_MARGIN = 0.22;         // contact shadow spread beyond the carpet edge
const PINCH_STEP = 0.18;            // relative pinch travel before the size changes
const SIZE_SWITCH_COOLDOWN = 350;   // ms, stops one gesture racing through sizes
const MIN_FREE_SCALE = 0.35;        // free-size bounds, kept within plausible rug sizes
const MAX_FREE_SCALE = 2.60;

export class CarpetPlacer {
  /**
   * @param {object} options
   * @param {Array}  options.variants  [{glb, widthCm, lengthCm, label, price}] ascending by size
   * @param {number} options.initialIndex
   * @param {HTMLElement} options.overlay  DOM overlay root (also receives touches)
   * @param {(state: object) => void} options.onState  UI callback
   */
  constructor({ variants, initialIndex = 0, overlay, onState = () => {} }) {
    this.variants = variants;
    this.index = initialIndex;
    this.overlay = overlay;
    this.onState = onState;

    this.session = null;
    this.placed = false;
    this.carpetGroup = null;
    this.carpetMesh = null;
    this.shadow = null;
    this.yaw = 0;
    this.modelCache = new Map();

    this.viewerHitSource = null;
    this.transientHitSource = null;
    this.lightProbe = null;

    this.gesture = null;
    this.lastSwitchAt = 0;

    // "Free size" mode: the carpet stops being a product for a moment and
    // becomes a measuring tool — pinch to any size to discover what actually
    // fits the room, with the live dimensions reported back. Scaling is always
    // uniform, so the carpet's real proportions never distort.
    this.freeMode = false;
    this.freeScale = 1;
    this.floorTracked = false; // true once ARCore reports a real surface
  }

  get variant() {
    return this.variants[this.index];
  }

  static get supported() {
    return Boolean(navigator.xr?.isSessionSupported);
  }

  async start() {
    if (!navigator.xr) throw new Error('این مرورگر از WebXR پشتیبانی نمی‌کند');
    const ok = await navigator.xr.isSessionSupported('immersive-ar');
    if (!ok) throw new Error('واقعیت افزوده روی این دستگاه در دسترس نیست');

    this.session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test', 'local-floor'],
      optionalFeatures: ['dom-overlay', 'light-estimation'],
      domOverlay: { root: this.overlay },
    });

    this._buildScene();
    await this._bindSession();
    this._bindGestures();
    this.session.requestAnimationFrame(this._onFrame);
    this._emit();
  }

  async end() {
    await this.session?.end();
  }

  // --- scene -----------------------------------------------------------------

  _buildScene() {
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 40);

    // Light estimation refines these every frame when the platform supports it.
    this.ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbbb, 1.0);
    this.scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight(0xffffff, 0.6);
    this.sun.position.set(0.5, 1, 0.25);
    this.scene.add(this.sun);

    this.reticle = this._buildReticle();
    this.scene.add(this.reticle);

    this.carpetGroup = new THREE.Group();
    this.carpetGroup.visible = false;
    this.scene.add(this.carpetGroup);

    this.raycaster = new THREE.Raycaster();
  }

  /** Where a ray through a screen point meets the floor.
   *
   * The session runs in `local-floor` space, so the floor is the y = 0 plane
   * and its height is known from the moment tracking starts. Plane detection,
   * by contrast, needs the user to move the phone enough for parallax — which
   * is the wait that made placement feel slow. Intersecting the known floor
   * height gives an immediate, usable target; a real hit test result is still
   * preferred as soon as one arrives, because it follows uneven ground.
   */
  _floorPoint(ndcX = 0, ndcY = 0) {
    const xrCamera = this.renderer.xr.getCamera();
    const camera = xrCamera.cameras?.[0] ?? xrCamera;
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const { origin, direction } = this.raycaster.ray;
    if (Math.abs(direction.y) < 1e-4) return null; // looking at the horizon
    const distance = -origin.y / direction.y;
    if (distance <= 0 || distance > 12) return null; // behind camera, or absurdly far
    return origin.clone().addScaledVector(direction, distance);
  }

  _screenToNdc(clientX, clientY) {
    return [
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1,
    ];
  }

  /** Did this touch land on the carpet itself? Dragging requires it. */
  _touchHitsCarpet(touch) {
    if (!this.carpetMesh) return false;
    const xrCamera = this.renderer.xr.getCamera();
    const camera = xrCamera.cameras?.[0] ?? xrCamera;
    const ndc = new THREE.Vector2(
      (touch.clientX / window.innerWidth) * 2 - 1,
      -(touch.clientY / window.innerHeight) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, camera);
    return this.raycaster.intersectObject(this.carpetMesh, true).length > 0;
  }

  _buildReticle() {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.09, 0.11, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.9 })
    );
    ring.matrixAutoUpdate = false;
    ring.visible = false;
    return ring;
  }

  /** Soft radial darkening under the rug edge — the cue that sells "it is on the floor". */
  _buildShadow(widthM, lengthM) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.32, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(0,0,0,0.42)');
    gradient.addColorStop(0.65, 'rgba(0,0,0,0.16)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(widthM + SHADOW_MARGIN, lengthM + SHADOW_MARGIN).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })
    );
    mesh.position.y = 0.001;
    mesh.renderOrder = -1;
    return mesh;
  }

  async _loadVariant(index) {
    const variant = this.variants[index];
    if (!this.modelCache.has(variant.glb)) {
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(variant.glb);
      this.modelCache.set(variant.glb, gltf.scene);
    }
    return this.modelCache.get(variant.glb).clone(true);
  }

  async _showVariant(index) {
    const variant = this.variants[index];
    const model = await this._loadVariant(index);

    this.carpetGroup.clear();
    this.shadow = this._buildShadow(variant.widthCm / 100, variant.lengthCm / 100);
    this.carpetGroup.add(this.shadow);

    model.position.y = CARPET_LIFT;
    this.carpetGroup.add(model);
    this.carpetMesh = model;
    this._emit();
  }

  // --- xr session ------------------------------------------------------------

  async _bindSession() {
    this.renderer.xr.setReferenceSpaceType('local-floor');
    await this.renderer.xr.setSession(this.session);

    const viewerSpace = await this.session.requestReferenceSpace('viewer');
    this.refSpace = this.renderer.xr.getReferenceSpace();
    this.viewerHitSource = await this.session.requestHitTestSource({ space: viewerSpace });

    // Touch-driven hit tests: this is what makes dragging follow the finger
    // rather than the phone's centre.
    if (this.session.requestHitTestSourceForTransientInput) {
      this.transientHitSource = await this.session.requestHitTestSourceForTransientInput({
        profile: 'generic-touchscreen',
      });
    }

    if (this.session.requestLightProbe) {
      try {
        this.lightProbe = await this.session.requestLightProbe();
      } catch {
        this.lightProbe = null; // optional feature, never fatal
      }
    }

    this.session.addEventListener('end', () => {
      this.renderer.domElement.remove();
      this.onState({ ended: true });
    });

    await this._showVariant(this.index);
  }

  _onFrame = (time, frame) => {
    if (!this.session) return;
    this.session.requestAnimationFrame(this._onFrame);

    if (!this.placed) this._updateReticle(frame);
    if (this.gesture?.kind === 'drag') this._updateDrag(frame);
    if (this.lightProbe) this._updateLighting(frame);

    this.renderer.render(this.scene, this.camera);
  };

  _updateReticle(frame) {
    const hits = frame.getHitTestResults(this.viewerHitSource);
    if (hits.length) {
      this.reticle.matrix.fromArray(hits[0].getPose(this.refSpace).transform.matrix);
      this.reticle.visible = true;
      if (!this.floorTracked) {
        this.floorTracked = true;
        this._emit();
      }
      return;
    }

    // Plane detection has not converged — aim at the known floor height so the
    // user can place right away instead of waving the phone around first.
    const point = this._floorPoint();
    if (!point) {
      this.reticle.visible = false;
      return;
    }
    this.reticle.matrix.makeTranslation(point.x, point.y, point.z);
    this.reticle.visible = true;
  }

  /** Follow the finger across the floor, keeping the carpet flat and its yaw.
   *
   * The offset between the grab point and the carpet's centre is captured on
   * the first frame of the drag, so grabbing a corner slides the carpet from
   * that corner instead of snapping its centre under the finger.
   */
  _updateDrag(frame) {
    let target = null;
    if (this.transientHitSource) {
      const [result] = frame.getHitTestResultsForTransientInput(this.transientHitSource);
      const hit = result?.results?.[0];
      if (hit) target = hit.getPose(this.refSpace).transform.position;
    }
    if (!target && this.gesture.touch) {
      // Same fallback as the reticle: slide along the known floor plane when no
      // detected surface is under the finger.
      const [ndcX, ndcY] = this._screenToNdc(this.gesture.touch.x, this.gesture.touch.y);
      target = this._floorPoint(ndcX, ndcY);
    }
    if (!target) return;

    const { x, y, z } = target;
    if (!this.gesture.grabOffset) {
      this.gesture.grabOffset = new THREE.Vector3(
        this.carpetGroup.position.x - x,
        this.carpetGroup.position.y - y,
        this.carpetGroup.position.z - z
      );
    }
    const offset = this.gesture.grabOffset;
    this.carpetGroup.position.set(x + offset.x, y + offset.y, z + offset.z);
  }

  /** Match room brightness so the rug does not glow against a dim floor. */
  _updateLighting(frame) {
    const estimate = frame.getLightEstimate?.(this.lightProbe);
    if (!estimate) return;
    const sh = estimate.sphericalHarmonicsCoefficients;
    if (sh?.length >= 3) {
      // DC term of the SH expansion approximates overall irradiance.
      const intensity = Math.max(0.25, Math.min(2.0, (sh[0] + sh[1] + sh[2]) / 3));
      this.ambient.intensity = intensity;
    }
    const direction = estimate.primaryLightDirection;
    if (direction) this.sun.position.set(-direction.x, -direction.y, -direction.z);
    const primary = estimate.primaryLightIntensity;
    if (primary) {
      this.sun.intensity = Math.max(0.15, Math.min(1.2, (primary.x + primary.y + primary.z) / 3));
    }
  }

  // --- gestures --------------------------------------------------------------

  _bindGestures() {
    const overlay = this.overlay;
    overlay.addEventListener('touchstart', this._onTouchStart, { passive: false });
    overlay.addEventListener('touchmove', this._onTouchMove, { passive: false });
    overlay.addEventListener('touchend', this._onTouchEnd);
    overlay.addEventListener('touchcancel', this._onTouchEnd);
  }

  _onTouchStart = (event) => {
    if (event.target.closest('button')) return; // let UI controls work normally
    event.preventDefault();

    if (!this.placed) {
      if (!this.reticle.visible) return;
      // Only the FIRST touch may land anywhere: seed at the reticle, then drag
      // for one gesture so the carpet appears under the finger that placed it.
      const position = new THREE.Vector3().setFromMatrixPosition(this.reticle.matrix);
      this.carpetGroup.position.copy(position);
      this.carpetGroup.visible = true;
      this.reticle.visible = false;
      this.placed = true;
      this.gesture = {
        kind: 'drag',
        grabOffset: null,
        touch: this._touchPoint(event.touches[0]),
      };
      this._emit();
      return;
    }

    if (event.touches.length === 1) {
      // Once placed, the carpet stays put unless the user grabs the carpet
      // itself. Tapping bare floor must not teleport it — otherwise every
      // attempt to rotate or resize would also move it.
      if (!this._touchHitsCarpet(event.touches[0])) return;
      this.gesture = { kind: 'drag', grabOffset: null, touch: this._touchPoint(event.touches[0]) };
    } else if (event.touches.length === 2) {
      this.gesture = {
        kind: 'two-finger',
        startAngle: this._touchAngle(event.touches),
        startYaw: this.yaw,
        startSpread: this._touchSpread(event.touches),
        startScale: this.freeScale,
      };
    }
  };

  _onTouchMove = (event) => {
    if (!this.placed || !this.gesture) return;
    event.preventDefault();

    if (this.gesture.kind === 'drag' && event.touches.length === 1) {
      this.gesture.touch = this._touchPoint(event.touches[0]);
    }

    if (this.gesture.kind === 'two-finger' && event.touches.length === 2) {
      // Twist -> yaw. Screen angles grow clockwise (y points down) while a
      // positive yaw turns counter-clockwise seen from above, so the delta is
      // negated — otherwise the carpet turns against the fingers.
      const angle = this._touchAngle(event.touches);
      this.yaw = this.gesture.startYaw - (angle - this.gesture.startAngle);
      this.carpetGroup.rotation.y = this.yaw;

      const spread = this._touchSpread(event.touches);
      const ratio = spread / this.gesture.startSpread;

      if (this.freeMode) {
        // Continuous, uniform: the carpet's proportions are a property of the
        // product and never distort, only the overall size changes.
        this.freeScale = Math.max(
          MIN_FREE_SCALE,
          Math.min(MAX_FREE_SCALE, this.gesture.startScale * ratio)
        );
        this.carpetGroup.scale.setScalar(this.freeScale);
        this._emit();
        return;
      }

      // Stock mode: pinch steps through the sizes the shop actually sells.
      const now = performance.now();
      if (now - this.lastSwitchAt > SIZE_SWITCH_COOLDOWN) {
        if (ratio > 1 + PINCH_STEP) this._stepSize(+1, event);
        else if (ratio < 1 - PINCH_STEP) this._stepSize(-1, event);
      }
    }
  };

  /** Switch between "sizes we stock" and "any size, tell me the number". */
  setFreeMode(enabled) {
    this.freeMode = enabled;
    this.freeScale = 1;
    this.carpetGroup.scale.setScalar(1);
    this._emit();
  }

  /** Live dimensions in cm under the current free-mode scale. */
  get liveSize() {
    return {
      widthCm: Math.round(this.variant.widthCm * this.freeScale),
      lengthCm: Math.round(this.variant.lengthCm * this.freeScale),
      percent: Math.round(this.freeScale * 100),
    };
  }

  /** The stock size closest in area to the current free size — keeps the
   *  measuring tool connected to something the customer can actually buy. */
  get nearestStockVariant() {
    const target = this.variant.widthCm * this.variant.lengthCm * this.freeScale ** 2;
    return this.variants.reduce((best, candidate) =>
      Math.abs(candidate.widthCm * candidate.lengthCm - target) <
      Math.abs(best.widthCm * best.lengthCm - target)
        ? candidate
        : best
    );
  }

  _onTouchEnd = () => {
    this.gesture = null;
  };

  _stepSize(direction, event) {
    const next = this.index + direction;
    if (next < 0 || next >= this.variants.length) {
      this._emit({ atLimit: direction > 0 ? 'largest' : 'smallest' });
      return;
    }
    this.index = next;
    this.lastSwitchAt = performance.now();
    this.gesture.startSpread = this._touchSpread(event.touches);
    navigator.vibrate?.(12);
    this._showVariant(next);
  }

  _touchPoint(touch) {
    return { x: touch.clientX, y: touch.clientY };
  }

  _touchAngle(touches) {
    return Math.atan2(
      touches[1].clientY - touches[0].clientY,
      touches[1].clientX - touches[0].clientX
    );
  }

  _touchSpread(touches) {
    return Math.hypot(
      touches[1].clientX - touches[0].clientX,
      touches[1].clientY - touches[0].clientY
    );
  }

  _emit(extra = {}) {
    this.onState({
      placed: this.placed,
      variant: this.variant,
      index: this.index,
      count: this.variants.length,
      freeMode: this.freeMode,
      floorTracked: this.floorTracked,
      liveSize: this.liveSize,
      nearestStock: this.freeMode ? this.nearestStockVariant : null,
      ...extra,
    });
  }
}
