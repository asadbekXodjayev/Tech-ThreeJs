import * as THREE from 'three';

const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

interface Part {
  obj: THREE.Object3D;
  base: THREE.Vector3;
  explode: THREE.Vector3;
}

/**
 * SUBSTRATE — the whole "zoom across scale" world, built as one nested rig.
 *
 * Five layers live at increasing radius from the origin so a single camera
 * dolly reads as a continuous descent across nine orders of magnitude:
 *   transistor (tiny, at origin) → chip die → exploded device → node network
 *   → data field. Each layer fades in/out by scroll progress, everything is
 *   procedural geometry + shaders, and the node graph is a single InstancedMesh.
 */
export class Substrate {
  readonly group = new THREE.Group();

  // layer roots
  private transistor = new THREE.Group();
  private chip = new THREE.Group();
  private device = new THREE.Group();
  private network = new THREE.Group();

  // animated bits
  private traceMat!: THREE.ShaderMaterial;
  private signal!: THREE.Points;
  private signalMat!: THREE.PointsMaterial;
  private deviceParts: Part[] = [];
  private nodes!: THREE.InstancedMesh;
  private links!: THREE.LineSegments;
  private linkMat!: THREE.LineBasicMaterial;
  private gate!: THREE.Mesh;
  private gateMat!: THREE.MeshStandardMaterial;
  private dataField!: THREE.Points;
  private dataMat!: THREE.PointsMaterial;

  private nodeCount = 0;
  private nodePhase!: Float32Array;
  private accentCol = new THREE.Color('#36e0c4');

  private disposables: (THREE.BufferGeometry | THREE.Material)[] = [];
  private _m = new THREE.Matrix4();
  private _c = new THREE.Color();

  constructor(quality: 'high' | 'low' = 'high') {
    this.buildTransistor();
    this.buildChip();
    this.buildDevice();
    this.buildNetwork(quality === 'high' ? 1400 : 520);
    this.buildDataField(quality === 'high' ? 2600 : 900);

    this.group.add(this.transistor, this.chip, this.device, this.network, this.dataField);
  }

  /* ============================================================
     LAYER 0 — the transistor (at origin, the hero of the descent)
     ============================================================ */
  private buildTransistor(): void {
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x202a3a, roughness: 0.5, metalness: 0.6,
    });
    this.gateMat = new THREE.MeshStandardMaterial({
      color: 0x0e2c2a, roughness: 0.35, metalness: 0.4,
      emissive: new THREE.Color('#36e0c4'), emissiveIntensity: 0,
    });
    this.track(baseMat, this.gateMat);

    // substrate slab
    const slabGeo = new THREE.BoxGeometry(2.4, 0.18, 1.6);
    this.track(slabGeo);
    this.transistor.add(new THREE.Mesh(slabGeo, baseMat));

    // source / drain fins
    const finGeo = new THREE.BoxGeometry(0.34, 0.5, 1.2);
    this.track(finGeo);
    const source = new THREE.Mesh(finGeo, baseMat);
    source.position.set(-0.7, 0.32, 0);
    const drain = new THREE.Mesh(finGeo, baseMat);
    drain.position.set(0.7, 0.32, 0);
    this.transistor.add(source, drain);

    // the gate — the switch that "flips" (glows)
    const gGeo = new THREE.BoxGeometry(0.5, 0.7, 1.35);
    this.track(gGeo);
    this.gate = new THREE.Mesh(gGeo, this.gateMat);
    this.gate.position.y = 0.4;
    this.transistor.add(this.gate);

    this.transistor.scale.setScalar(0.85);
  }

  /* ============================================================
     LAYER 1 — the chip die (procedural circuit traces shader)
     ============================================================ */
  private buildChip(): void {
    // the die slab
    const dieMat = new THREE.MeshStandardMaterial({
      color: 0x0a0f18, roughness: 0.6, metalness: 0.3,
    });
    this.track(dieMat);
    const dieGeo = new THREE.BoxGeometry(9, 0.3, 9);
    this.track(dieGeo);
    const die = new THREE.Mesh(dieGeo, dieMat);
    die.position.y = -0.16;
    this.chip.add(die);

    // procedural circuit-trace plane sitting just above the die
    this.traceMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uReveal: { value: 0 },
        uAccent: { value: new THREE.Color('#36e0c4') },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime;
        uniform float uReveal;
        uniform vec3 uAccent;

        // a manhattan-routed circuit grid: bright traces on a dark die
        float trace(vec2 uv, float scale) {
          vec2 g = uv * scale;
          vec2 id = floor(g);
          vec2 f = fract(g);
          float r = fract(sin(dot(id, vec2(41.3, 289.1))) * 43758.5);
          // horizontal or vertical run per cell
          float h = 1.0 - smoothstep(0.0, 0.06, abs(f.y - 0.5));
          float v = 1.0 - smoothstep(0.0, 0.06, abs(f.x - 0.5));
          float pick = step(0.5, r);
          float t = mix(h, v, pick);
          // pads at some junctions
          float pad = 1.0 - smoothstep(0.10, 0.16, length(f - 0.5));
          pad *= step(0.85, fract(r * 7.0));
          return max(t, pad);
        }

        void main() {
          vec2 uv = vUv;
          float t = trace(uv, 14.0) * 0.7 + trace(uv + 0.37, 26.0) * 0.5;
          t = clamp(t, 0.0, 1.0);

          // signal pulse sweeping diagonally across the die
          float pulse = sin((uv.x + uv.y) * 18.0 - uTime * 3.0) * 0.5 + 0.5;
          pulse = pow(pulse, 6.0);

          // radial reveal from centre as the chip "powers on"
          float d = length(uv - 0.5) * 1.42;
          float reveal = smoothstep(uReveal + 0.12, uReveal - 0.02, d);

          vec3 base = uAccent * 0.30;
          vec3 hot = uAccent + vec3(0.25);
          vec3 col = mix(base, hot, pulse) * t;
          float a = t * reveal;
          if (a < 0.01) discard;
          gl_FragColor = vec4(col, a * 0.9);
        }
      `,
    });
    this.disposables.push(this.traceMat);

    const traceGeo = new THREE.PlaneGeometry(9, 9, 1, 1);
    traceGeo.rotateX(-Math.PI / 2);
    this.track(traceGeo);
    const tracePlane = new THREE.Mesh(traceGeo, this.traceMat);
    tracePlane.position.y = 0.02;
    this.chip.add(tracePlane);

    // flowing signal dots that race along the die (Points)
    const N = 240;
    const pos = new Float32Array(N * 3);
    const spd = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 8.4;
      pos[i * 3 + 1] = 0.12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8.4;
      spd[i] = 0.6 + Math.random() * 1.6;
    }
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sGeo.setAttribute('aSpd', new THREE.BufferAttribute(spd, 1));
    this.track(sGeo);
    this.signalMat = new THREE.PointsMaterial({
      color: new THREE.Color('#9af5e4'),
      size: 0.12, sizeAttenuation: true, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.track(this.signalMat);
    this.signal = new THREE.Points(sGeo, this.signalMat);
    this.chip.add(this.signal);

    this.chip.visible = false;
  }

  /* ============================================================
     LAYER 2 — the exploded device stack
     ============================================================ */
  private buildDevice(): void {
    const layers: { y: number; col: number; rough: number; metal: number; h: number; size: number }[] = [
      { y: 0.0, col: 0x10202c, rough: 0.7, metal: 0.2, h: 0.18, size: 6.0 }, // PCB
      { y: 0.6, col: 0x1d2a3a, rough: 0.5, metal: 0.6, h: 0.22, size: 4.6 }, // substrate
      { y: 1.2, col: 0x0d1218, rough: 0.4, metal: 0.7, h: 0.3, size: 3.0 },  // silicon die
      { y: 1.9, col: 0x223044, rough: 0.55, metal: 0.5, h: 0.16, size: 4.2 }, // memory
      { y: 2.5, col: 0x2a1c10, rough: 0.5, metal: 0.6, h: 0.2, size: 3.4 },  // power stage
    ];
    let i = 0;
    for (const L of layers) {
      const mat = new THREE.MeshStandardMaterial({
        color: L.col, roughness: L.rough, metalness: L.metal,
        emissive: i === 2 ? new THREE.Color('#0e3a36') : new THREE.Color(0x000000),
        emissiveIntensity: i === 2 ? 0.6 : 0,
      });
      this.track(mat);
      const geo = new THREE.BoxGeometry(L.size, L.h, L.size);
      this.track(geo);
      const mesh = new THREE.Mesh(geo, mat);
      // base = stacked tight; explode = spread along Y
      const base = new THREE.Vector3(0, i * 0.34 - 0.4, 0);
      const explode = new THREE.Vector3(0, L.y * 1.5 - 0.8, 0);
      mesh.position.copy(base);
      this.device.add(mesh);
      this.deviceParts.push({ obj: mesh, base, explode });
      i++;
    }
    // connector pins ring around the PCB
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xc9b06a, roughness: 0.25, metalness: 0.95 });
    this.track(pinMat);
    const pinGeo = new THREE.BoxGeometry(0.12, 0.5, 0.12);
    this.track(pinGeo);
    const pins = new THREE.InstancedMesh(pinGeo, pinMat, 40);
    let p = 0;
    for (let side = 0; side < 4; side++) {
      for (let k = 0; k < 10; k++) {
        const t = (k / 9 - 0.5) * 5.2;
        const m = new THREE.Matrix4();
        const pos = side === 0 ? new THREE.Vector3(t, -0.4, 3)
          : side === 1 ? new THREE.Vector3(t, -0.4, -3)
            : side === 2 ? new THREE.Vector3(3, -0.4, t)
              : new THREE.Vector3(-3, -0.4, t);
        m.setPosition(pos);
        pins.setMatrixAt(p++, m);
      }
    }
    pins.instanceMatrix.needsUpdate = true;
    this.device.add(pins);

    this.device.visible = false;
  }

  /* ============================================================
     LAYER 3 — the instanced node network (one draw call)
     ============================================================ */
  private buildNetwork(count: number): void {
    this.nodeCount = count;
    const geo = new THREE.IcosahedronGeometry(0.16, 0);
    this.track(geo);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0c2a30, roughness: 0.4, metalness: 0.3,
      emissive: new THREE.Color('#36e0c4'), emissiveIntensity: 0.6,
    });
    this.track(mat);
    this.nodes = new THREE.InstancedMesh(geo, mat, count);
    this.nodes.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);

    this.nodePhase = new Float32Array(count);
    const positions: THREE.Vector3[] = [];
    // distribute nodes in a flattened shell (a "globe of devices")
    for (let i = 0; i < count; i++) {
      const r = 16 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const v = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        (r * Math.cos(phi)) * 0.55,
        r * Math.sin(phi) * Math.sin(theta)
      );
      positions.push(v);
      this.nodePhase[i] = Math.random() * Math.PI * 2;
      this._m.makeTranslation(v.x, v.y, v.z);
      this.nodes.setMatrixAt(i, this._m);
      this.nodes.setColorAt(i, this._c.set('#36e0c4'));
    }
    this.nodes.instanceMatrix.needsUpdate = true;
    this.network.add(this.nodes);

    // links — connect each node to a couple of near neighbours (capped)
    const segs: number[] = [];
    const maxLinks = Math.min(count, 900);
    for (let i = 0; i < maxLinks; i++) {
      const a = positions[i];
      // connect to 2 pseudo-near nodes by index hop
      for (let k = 1; k <= 2; k++) {
        const j = (i * 7 + k * 131) % count;
        const b = positions[j];
        if (a.distanceTo(b) < 14) {
          segs.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
      }
    }
    const lGeo = new THREE.BufferGeometry();
    lGeo.setAttribute('position', new THREE.Float32BufferAttribute(segs, 3));
    this.track(lGeo);
    this.linkMat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#36e0c4'), transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.track(this.linkMat);
    this.links = new THREE.LineSegments(lGeo, this.linkMat);
    this.network.add(this.links);

    this.network.visible = false;
  }

  /* ============================================================
     LAYER 4 — the data field (far points, the "planet of data")
     ============================================================ */
  private buildDataField(count: number): void {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 34 + Math.random() * 22;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.track(geo);
    this.dataMat = new THREE.PointsMaterial({
      color: new THREE.Color('#ff9e3d'),
      size: 0.22, sizeAttenuation: true, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.track(this.dataMat);
    this.dataField = new THREE.Points(geo, this.dataMat);
    this.dataField.visible = false;
  }

  /* ============================================================
     PUBLIC — drive everything from scroll progress s (0..5)
     ============================================================ */

  /** s ranges 0..(chapters-1). Sets visibility, fades, explode, glow. */
  update(s: number, time: number, dt: number, reduced: boolean): void {
    // ---- transistor: present at the very start, gate flips on ----
    const tShow = 1 - smoothstep(0.6, 1.3, s);
    this.transistor.visible = tShow > 0.001;
    this.transistor.scale.setScalar(0.85 * (0.6 + tShow * 0.6));
    const flip = (Math.sin(time * 0.004) * 0.5 + 0.5) * smoothstep(0.0, 0.4, s);
    this.gateMat.emissiveIntensity = (0.4 + flip * 2.2) * tShow;
    if (!reduced) this.transistor.rotation.y = time * 0.0002;

    // ---- chip: reveal across chapter 1 ----
    const chipIn = smoothstep(0.4, 1.2, s);
    const chipOut = smoothstep(1.7, 2.3, s);
    const chipShow = chipIn * (1 - chipOut);
    this.chip.visible = chipShow > 0.001;
    if (this.chip.visible) {
      this.traceMat.uniforms.uTime.value = time * 0.001;
      this.traceMat.uniforms.uReveal.value = chipIn; // radial power-on
      (this.traceMat.uniforms.uAccent.value as THREE.Color).copy(this.accentCol);
      this.signalMat.opacity = chipShow * 0.9;
      // race the signal dots
      const arr = this.signal.geometry.getAttribute('position') as THREE.BufferAttribute;
      const spd = this.signal.geometry.getAttribute('aSpd') as THREE.BufferAttribute;
      const a = arr.array as Float32Array;
      for (let i = 0; i < arr.count; i++) {
        a[i * 3] += spd.getX(i) * dt * 2.4;
        if (a[i * 3] > 4.2) a[i * 3] = -4.2;
      }
      arr.needsUpdate = true;
      this.chip.scale.setScalar(0.5 + chipShow * 0.6);
    }

    // ---- device: explode across chapter 2 ----
    const devIn = smoothstep(1.6, 2.2, s);
    const devOut = smoothstep(2.7, 3.3, s);
    const devShow = devIn * (1 - devOut);
    this.device.visible = devShow > 0.001;
    if (this.device.visible) {
      const explodeT = smoothstep(1.9, 2.6, s) - smoothstep(2.6, 3.1, s);
      const k = explodeT * explodeT * (3 - 2 * explodeT);
      for (const part of this.deviceParts) {
        part.obj.position.lerpVectors(part.base, part.explode, k);
      }
      if (!reduced) this.device.rotation.y = time * 0.00025 + 0.3;
      this.device.scale.setScalar(0.7 + devShow * 0.5);
      const op = devShow;
      this.device.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.InstancedMesh) {
          const m = o.material as THREE.MeshStandardMaterial;
          m.transparent = true;
          m.opacity = op;
        }
      });
    }

    // ---- network: assemble across chapter 3 ----
    const netIn = smoothstep(2.6, 3.3, s);
    const netOut = smoothstep(4.2, 4.8, s);
    const netShow = netIn * (1 - netOut);
    this.network.visible = netShow > 0.001;
    if (this.network.visible) {
      if (!reduced) this.network.rotation.y = time * 0.00012;
      this.linkMat.opacity = netShow * 0.5;
      (this.linkMat.color as THREE.Color).copy(this.accentCol);
      // node twinkle + progressive ignite by index fraction
      const ignite = netIn;
      const mat = this.nodes.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.4 + netShow * 1.2;
      mat.emissive.copy(this.accentCol);
      for (let i = 0; i < this.nodeCount; i++) {
        const frac = i / this.nodeCount;
        const on = frac < ignite ? 1 : 0.12;
        const tw = (Math.sin(time * 0.003 + this.nodePhase[i]) * 0.5 + 0.5) * 0.6 + 0.4;
        this._c.copy(this.accentCol).multiplyScalar(on * tw);
        this.nodes.setColorAt(i, this._c);
      }
      if (this.nodes.instanceColor) this.nodes.instanceColor.needsUpdate = true;
    }

    // ---- data field: the macro resolve, chapters 4-5 ----
    const dataIn = smoothstep(3.6, 4.3, s);
    this.dataField.visible = dataIn > 0.001;
    if (this.dataField.visible) {
      this.dataMat.opacity = dataIn * 0.9;
      if (!reduced) this.dataField.rotation.y = time * 0.00008;
    }
  }

  /** Set the live accent colour (also tints node graph + traces). */
  setAccent(hex: string): void {
    this.accentCol.set(hex);
  }

  /** count of currently-ignited nodes, for the HUD readout. */
  igniteCount(s: number): number {
    const ignite = smoothstep(2.6, 3.3, s);
    return Math.round(ignite * this.nodeCount);
  }

  private track(...items: (THREE.BufferGeometry | THREE.Material)[]): void {
    this.disposables.push(...items);
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
    this.nodes.dispose();
  }
}
