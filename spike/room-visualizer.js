/**
 * Interactive carpet placement on a still room photo.
 *
 * The server analysed the photo once and handed us three things: the floor
 * plane, the camera intrinsics, and an occlusion mask. Because the carpet never
 * leaves that plane, "which pixels sit in front of the floor" never changes —
 * so dragging and rotating the carpet is pure client-side work, with no round
 * trip and no recomputation.
 *
 * A three.js camera is configured with the *photo's* intrinsics, so a quad
 * placed on the recovered plane lands in the image with the same perspective the
 * real floor has. The occlusion mask is applied in screen space by the carpet's
 * own shader, which is what lets a chair leg cut cleanly through it.
 */

import * as THREE from './three.module.min.js';

const CARPET_LIFT_M = 0.004; // avoids z-fighting with the plane itself

const CARPET_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CARPET_FRAGMENT = /* glsl */ `
  uniform sampler2D carpetMap;
  uniform sampler2D occlusionMap;
  uniform vec2 resolution;
  uniform float exposure;
  varying vec2 vUv;

  void main() {
    // Screen-space lookup: the mask is aligned with the photo, not the carpet.
    vec2 screenUv = gl_FragCoord.xy / resolution;
    float visible = texture2D(occlusionMap, screenUv).r;
    vec4 carpet = texture2D(carpetMap, vUv);
    gl_FragColor = vec4(carpet.rgb * exposure, visible);
  }
`;

export class RoomVisualizer {
  /**
   * @param {object} options
   * @param {HTMLElement} options.container
   * @param {object} options.scene   scene.json produced by export_room_scene.py
   * @param {string} options.assetBase
   * @param {Array} options.variants [{glbTexture, widthCm, lengthCm, label, price}]
   * @param {(state) => void} options.onState
   */
  constructor({ container, scene, assetBase, variants, onState = () => {} }) {
    this.container = container;
    this.data = scene;
    this.assetBase = assetBase.replace(/\/$/, '');
    this.variants = variants;
    this.index = Math.floor(variants.length / 2);
    this.onState = onState;

    this.yaw = 0;
    this.anchor = new THREE.Vector3();
    this.pointers = new Map();
    this.gesture = null;
  }

  get variant() {
    return this.variants[this.index];
  }

  async start() {
    const { width, height, focalPx } = this.data;

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height, false);
    this.renderer.domElement.style.cssText =
      'position:absolute; inset:0; width:100%; height:100%; touch-action:none;';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    // Same intrinsics as the photo: vertical FOV from the focal length in px.
    const vfov = 2 * Math.atan(height / 2 / focalPx) * (180 / Math.PI);
    this.camera = new THREE.PerspectiveCamera(vfov, width / height, 0.05, 60);
    // Camera sits at the origin looking down +Z, matching the convention the
    // depth back-projection used; three.js looks down -Z, so flip it.
    this.camera.rotation.set(0, Math.PI, 0);
    // The photo's Y axis points down; three.js points up.
    this.camera.scale.y = -1;

    const loader = new THREE.TextureLoader();
    const [occlusion, carpetTexture] = await Promise.all([
      loader.loadAsync(`${this.assetBase}/${this.data.mask}`),
      loader.loadAsync(`${this.assetBase}/${this.variant.texture}`),
    ]);
    occlusion.colorSpace = THREE.NoColorSpace;
    carpetTexture.colorSpace = THREE.SRGBColorSpace;
    this.occlusion = occlusion;
    this.carpetTexture = carpetTexture;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        carpetMap: { value: carpetTexture },
        occlusionMap: { value: occlusion },
        resolution: { value: new THREE.Vector2(width, height) },
        exposure: { value: 1.0 },
      },
      vertexShader: CARPET_VERTEX,
      fragmentShader: CARPET_FRAGMENT,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.plane = {
      normal: new THREE.Vector3(...this.data.plane.normal),
      offset: this.data.plane.offset,
    };
    this.carpet = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.material);
    this.scene.add(this.carpet);

    this.anchor.copy(this._rayToFloor(0, 0.28) ?? new THREE.Vector3(0, this.plane.offset, 2.5));
    this._rebuildCarpet();
    this._bindPointer();
    this._render();
    this._emit();
  }

  /** Point where a ray through normalised image coords meets the floor. */
  _rayToFloor(ndcX, ndcYOffset = 0) {
    const { focalPx, cx, cy, height } = this.data;
    const u = cx + ndcX * (this.data.width / 2);
    const v = cy + ndcYOffset * height;
    const dir = new THREE.Vector3((u - cx) / focalPx, (v - cy) / focalPx, 1);
    const denominator = dir.dot(this.plane.normal);
    if (Math.abs(denominator) < 1e-6) return null;
    const t = -this.plane.offset / denominator;
    if (t <= 0) return null;
    return dir.multiplyScalar(t);
  }

  _screenToFloor(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const u = ((clientX - rect.left) / rect.width) * this.data.width;
    const v = ((clientY - rect.top) / rect.height) * this.data.height;
    const { focalPx, cx, cy } = this.data;
    const dir = new THREE.Vector3((u - cx) / focalPx, (v - cy) / focalPx, 1);
    const denominator = dir.dot(this.plane.normal);
    if (Math.abs(denominator) < 1e-6) return null;
    const t = -this.plane.offset / denominator;
    if (t <= 0) return null;
    return dir.multiplyScalar(t);
  }

  /** Orthonormal axes lying in the floor plane. */
  _basis() {
    const normal = this.plane.normal.clone().normalize();
    let right = new THREE.Vector3(1, 0, 0);
    right.addScaledVector(normal, -right.dot(normal));
    if (right.lengthSq() < 1e-8) {
      right = new THREE.Vector3(0, 0, 1);
      right.addScaledVector(normal, -right.dot(normal));
    }
    right.normalize();
    const forward = new THREE.Vector3().crossVectors(normal, right).normalize();
    return { normal, right, forward };
  }

  _rebuildCarpet() {
    const { widthCm, lengthCm } = this.variant;
    const { normal, right, forward } = this._basis();
    const cos = Math.cos(this.yaw);
    const sin = Math.sin(this.yaw);

    const axisU = right.clone().multiplyScalar(cos).addScaledVector(forward, sin);
    const axisV = right.clone().multiplyScalar(-sin).addScaledVector(forward, cos);

    this.carpet.geometry.dispose();
    this.carpet.geometry = new THREE.PlaneGeometry(widthCm / 100, lengthCm / 100);

    const matrix = new THREE.Matrix4().makeBasis(axisU, axisV, normal);
    this.carpet.quaternion.setFromRotationMatrix(matrix);
    this.carpet.position.copy(this.anchor).addScaledVector(normal, CARPET_LIFT_M);
  }

  _bindPointer() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this._onDown);
    canvas.addEventListener('pointermove', this._onMove);
    canvas.addEventListener('pointerup', this._onUp);
    canvas.addEventListener('pointercancel', this._onUp);
  }

  _onDown = (event) => {
    event.preventDefault();
    this.renderer.domElement.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pointers.size === 1) {
      const hit = this._screenToFloor(event.clientX, event.clientY);
      this.gesture = hit
        ? { kind: 'drag', offset: this.anchor.clone().sub(hit) }
        : null;
    } else if (this.pointers.size === 2) {
      this.gesture = { kind: 'twist', startAngle: this._angle(), startYaw: this.yaw };
    }
  };

  _onMove = (event) => {
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (!this.gesture) return;
    event.preventDefault();

    if (this.gesture.kind === 'drag' && this.pointers.size === 1) {
      const hit = this._screenToFloor(event.clientX, event.clientY);
      if (hit) {
        this.anchor.copy(hit.add(this.gesture.offset));
        this._rebuildCarpet();
        this._render();
      }
    } else if (this.gesture.kind === 'twist' && this.pointers.size === 2) {
      // Screen angles grow clockwise; the in-plane basis turns the other way.
      this.yaw = this.gesture.startYaw - (this._angle() - this.gesture.startAngle);
      this._rebuildCarpet();
      this._render();
    }
  };

  _onUp = (event) => {
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) this.gesture = null;
  };

  _angle() {
    const [a, b] = [...this.pointers.values()];
    return Math.atan2(b.y - a.y, b.x - a.x);
  }

  setYaw(radians) {
    this.yaw = radians;
    this._rebuildCarpet();
    this._render();
  }

  async setVariant(index) {
    if (index < 0 || index >= this.variants.length) return;
    this.index = index;
    const texture = await new THREE.TextureLoader().loadAsync(
      `${this.assetBase}/${this.variant.texture}`
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    this.carpetTexture?.dispose();
    this.carpetTexture = texture;
    this.material.uniforms.carpetMap.value = texture;
    this._rebuildCarpet();
    this._render();
    this._emit();
  }

  setExposure(value) {
    this.material.uniforms.exposure.value = value;
    this._render();
  }

  _render() {
    this.renderer.render(this.scene, this.camera);
  }

  _emit() {
    this.onState({
      variant: this.variant,
      index: this.index,
      count: this.variants.length,
      confidence: this.data.confidence,
      cameraHeightM: this.data.cameraHeightM,
    });
  }
}
