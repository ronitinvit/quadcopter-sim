import { Engine } from "@babylonjs/core/Engines/engine";

export function createEngine(canvas: HTMLCanvasElement): Engine {
  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    adaptToDeviceRatio: true,
  });

  const onResize = (): void => {
    engine.resize();
  };
  window.addEventListener("resize", onResize);
  engine.onDisposeObservable.add(() => {
    window.removeEventListener("resize", onResize);
  });

  return engine;
}
