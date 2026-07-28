import type { SceneBundle } from './renderer';

export function startLoop(bundle: SceneBundle): () => void {
  let running = true;
  let last = performance.now();

  const tick = (now: number) => {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    bundle.update(dt);
    bundle.renderer.render(bundle.scene, bundle.camera);
    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
  return () => {
    running = false;
  };
}
