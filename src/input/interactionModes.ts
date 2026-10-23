import type { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";

export type InteractionMode = "camera" | "impact" | "grab";

export interface InteractionModes {
  mode: () => InteractionMode;
  onChange: (listener: (mode: InteractionMode) => void) => () => void;
}

export function bindInteractionModes(
  camera: ArcRotateCamera,
  canvas: HTMLCanvasElement,
): InteractionModes & { dispose: () => void } {
  const buttons: Record<InteractionMode, HTMLButtonElement | null> = {
    camera: document.querySelector<HTMLButtonElement>("#mode-camera"),
    impact: document.querySelector<HTMLButtonElement>("#mode-impact"),
    grab: document.querySelector<HTMLButtonElement>("#mode-grab"),
  };
  if (!buttons.camera || !buttons.impact || !buttons.grab) {
    throw new Error("Missing interaction mode buttons.");
  }

  let currentMode: InteractionMode = "camera";
  const listeners = new Set<(mode: InteractionMode) => void>();
  const updateButtons = (): void => {
    for (const mode of Object.keys(buttons) as InteractionMode[]) {
      buttons[mode]?.setAttribute("aria-pressed", String(currentMode === mode));
    }
  };
  const setMode = (mode: InteractionMode): void => {
    if (currentMode === mode) {
      return;
    }
    currentMode = mode;
    if (mode === "camera") {
      camera.attachControl(canvas, true);
      canvas.style.cursor = "";
    } else {
      camera.detachControl();
      canvas.style.cursor = mode === "impact" ? "crosshair" : "grab";
    }
    updateButtons();
    for (const listener of listeners) {
      listener(mode);
    }
  };
  const onCameraClick = (): void => setMode("camera");
  const onImpactClick = (): void => setMode("impact");
  const onGrabClick = (): void => setMode("grab");

  buttons.camera.addEventListener("click", onCameraClick);
  buttons.impact.addEventListener("click", onImpactClick);
  buttons.grab.addEventListener("click", onGrabClick);
  updateButtons();

  return {
    mode: () => currentMode,
    onChange: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose: () => {
      buttons.camera?.removeEventListener("click", onCameraClick);
      buttons.impact?.removeEventListener("click", onImpactClick);
      buttons.grab?.removeEventListener("click", onGrabClick);
      listeners.clear();
      if (currentMode !== "camera") {
        camera.attachControl(canvas, true);
        canvas.style.cursor = "";
      }
    },
  };
}
