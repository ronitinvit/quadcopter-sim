import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { PhysicsBody } from "@babylonjs/core/Physics/v2/physicsBody";
import { IMPULSE_LATERAL_NS, IMPULSE_UP_NS } from "../config";

export interface ImpulseEvent {
  label: string;
  impulseNs: Vector3;
  atMs: number;
}

export function bindImpulseControls(body: PhysicsBody): {
  lastImpulse: () => ImpulseEvent | null;
  dispose: () => void;
} {
  let last: ImpulseEvent | null = null;
  const upButton = document.querySelector<HTMLButtonElement>("#impulse-up");
  const xButton = document.querySelector<HTMLButtonElement>("#impulse-x");

  const apply = (label: string, impulse: Vector3): void => {
    const location = body.getObjectCenterWorld();
    body.applyImpulse(impulse, location);
    last = { label, impulseNs: impulse.clone(), atMs: performance.now() };
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) {
      return;
    }
    if (event.code === "Space") {
      event.preventDefault();
      apply("lift +Y", new Vector3(0, IMPULSE_UP_NS, 0));
    } else if (event.code === "KeyF") {
      apply("lateral +X", new Vector3(IMPULSE_LATERAL_NS, 0, 0));
    }
  };

  const onUp = (): void => {
    apply("lift +Y", new Vector3(0, IMPULSE_UP_NS, 0));
  };
  const onX = (): void => {
    apply("lateral +X", new Vector3(IMPULSE_LATERAL_NS, 0, 0));
  };

  window.addEventListener("keydown", onKeyDown);
  upButton?.addEventListener("click", onUp);
  xButton?.addEventListener("click", onX);

  return {
    lastImpulse: () => last,
    dispose: () => {
      window.removeEventListener("keydown", onKeyDown);
      upButton?.removeEventListener("click", onUp);
      xButton?.removeEventListener("click", onX);
    },
  };
}
