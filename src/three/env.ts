import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * The "clean room" — a dark volumetric field with a procedural environment map
 * for PBR reflections on the metallic chip parts (no HDRI download needed), a
 * key light, and a rim light that is re-tinted by the current scale accent.
 */
export class Env {
  readonly group = new THREE.Group();
  readonly rim: THREE.PointLight;
  private envRT: THREE.WebGLRenderTarget;

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    scene.background = new THREE.Color(0x060810);
    scene.fog = new THREE.FogExp2(0x060810, 0.018);

    // environment map for reflections (RoomEnvironment is built into three)
    const pmrem = new THREE.PMREMGenerator(renderer);
    this.envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = this.envRT.texture;
    scene.environmentIntensity = 0.45;
    pmrem.dispose();

    // key light — cool overhead wash
    const key = new THREE.DirectionalLight(0xdfe9ff, 1.6);
    key.position.set(6, 12, 8);
    this.group.add(key);

    // rim light — tinted by the active scale accent
    this.rim = new THREE.PointLight(0x36e0c4, 60, 80, 1.6);
    this.rim.position.set(-7, 3, -5);
    this.group.add(this.rim);

    // gentle ambient fill
    this.group.add(new THREE.HemisphereLight(0x1a2436, 0x05060a, 0.45));

    scene.add(this.group);
  }

  /** Drive the rim-light colour from the live scale accent. */
  setAccent(hex: string): void {
    this.rim.color.set(hex);
  }

  dispose(): void {
    this.envRT.dispose();
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
  }
}
