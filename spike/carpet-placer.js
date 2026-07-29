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
    if (!hits.length) {
      this.reticle.visible = false;
      return;
    }
    const pose = hits[0].getPose(this.refSpace);
    this.reticle.visible = true;
    this.reticle.matrix.fromArray(pose.transform.matrix);
  }

  /** Follow the finger across the floor, keeping the carpet flat and its yaw. */
  _updateDrag(frame) {
    if (!this.transientHitSource) return;
    const [result] = frame.getHitTestResultsForTransientInput(this.transientHitSource);
    const hit = result?.results?.[0];
    if (!hit) return;
    const pose = hit.getPose(this.refSpace);
    this.carpetGroup.position.set(
      pose.transform.position.x,
      pose.transform.position.y,
      pose.transform.position.z
    );
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
      // Seed at the reticle, then immediately drag: the next frame's
      // transient hit test snaps the carpet under the finger that placed it,
      // so it lands where you touched rather than at the screen centre.
      const position = new THREE.Vector3().setFromMatrixPosition(this.reticle.matrix);
      this.carpetGroup.position.copy(position);
      this.carpetGroup.visible = true;
      this.reticle.visible = false;
      this.placed = true;
      this.gesture = { kind: 'drag' };
      this._emit();
      return;
    }

    if (event.touches.length === 1) {
      this.gesture = { kind: 'drag' };
    } else if (event.touches.length === 2) {
      this.gesture = {
        kind: 'two-finger',
        startAngle: this._touchAngle(event.touches),
        startYaw: this.yaw,
        startSpread: this._touchSpread(event.touches),
      };
    }
  };

  _onTouchMove = (event) => {
    if (!this.placed || !this.gesture) return;
    event.preventDefault();

    if (this.gesture.kind === 'two-finger' && event.touches.length === 2) {
      // twist -> yaw
      const angle = this._touchAngle(event.touches);
      this.yaw = this.gesture.startYaw + (angle - this.gesture.startAngle);
      this.carpetGroup.rotation.y = this.yaw;

      // pinch -> step through the sizes the shop actually stocks
      const spread = this._touchSpread(event.touches);
      const ratio = spread / this.gesture.startSpread;
      const now = performance.now();
      if (now - this.lastSwitchAt > SIZE_SWITCH_COOLDOWN) {
        if (ratio > 1 + PINCH_STEP) this._stepSize(+1, event);
        else if (ratio < 1 - PINCH_STEP) this._stepSize(-1, event);
      }
    }
  };

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
      ...extra,
    });
  }
}
