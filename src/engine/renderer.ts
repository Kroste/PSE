import {
  BoxGeometry,
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';

export type SceneBundle = {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  update: (dt: number) => void;
};

export function createRenderer(canvas: HTMLCanvasElement): SceneBundle {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  const scene = new Scene();
  scene.background = new Color(0x0a0f14);

  const camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(2.5, 2, 3.5);
  camera.lookAt(0, 0, 0);

  scene.add(new HemisphereLight(0x66ffee, 0x0a0f14, 0.6));
  const key = new DirectionalLight(0x88ffcc, 1.2);
  key.position.set(3, 5, 4);
  scene.add(key);

  const cube = new Mesh(
    new BoxGeometry(1, 1, 1),
    new MeshStandardMaterial({ color: 0x00ffb0, roughness: 0.35, metalness: 0.2 }),
  );
  scene.add(cube);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  });

  return {
    renderer,
    scene,
    camera,
    update(dt) {
      cube.rotation.x += dt * 0.4;
      cube.rotation.y += dt * 0.6;
    },
  };
}
