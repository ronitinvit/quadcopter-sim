import type { Engine } from "@babylonjs/core/Engines/engine";
import { createEngine } from "./rendering/engine";
import { createScene } from "./rendering/scene";
import { createHavokPlugin } from "./physics/havok";
import { enablePhysicsWorld } from "./physics/world";
import { createDroneVisual } from "./drone/visual";
import { attachDronePhysics } from "./drone/body";
import { bindRotorThrust } from "./drone/rotorThrust";
import { bindImpulseControls } from "./input/impulseControl";
import { bindImpactControl } from "./input/impactControl";
import { bindGrabControl } from "./input/grabControl";
import { bindInteractionModes } from "./input/interactionModes";
import { bindHud } from "./diagnostics/hud";

export async function startApp(canvas: HTMLCanvasElement, hud: HTMLElement): Promise<Engine> {
  const hudToggle = document.querySelector<HTMLButtonElement>("#toggle-hud");
  if (!hudToggle) {
    throw new Error("Missing HUD visibility control.");
  }
  hudToggle.addEventListener("click", () => {
    hud.hidden = !hud.hidden;
    hudToggle.textContent = hud.hidden ? "Show readings" : "Hide readings";
    hudToggle.setAttribute("aria-expanded", String(!hud.hidden));
  });

  const engine = createEngine(canvas);
  const { scene, camera, groundMesh, shadowGenerator } = createScene(engine, canvas);

  const plugin = await createHavokPlugin();
  enablePhysicsWorld(scene, plugin, groundMesh);

  const visual = createDroneVisual(scene);
  for (const mesh of visual.root.getChildMeshes()) {
    shadowGenerator.addShadowCaster(mesh);
  }
  const drone = attachDronePhysics(scene, plugin, visual);
  camera.lockedTarget = visual.root;
  const rotorThrust = bindRotorThrust(scene, drone.physicsBody, visual.root, plugin);

  const modes = bindInteractionModes(camera, canvas);
  const impulse = bindImpulseControls(drone.physicsBody);
  const impact = bindImpactControl(scene, camera, canvas, visual.root, drone.physicsBody, modes);
  const grab = bindGrabControl(scene, camera, canvas, visual.root, drone.physicsBody, modes);
  bindHud(hud, {
    scene,
    body: drone.physicsBody,
    lastImpulse: impulse.lastImpulse,
    interactionMode: modes.mode,
    lastImpact: impact.lastImpact,
    isGrabbing: grab.isGrabbing,
    operatingMode: rotorThrust.mode,
    rotorThrustsN: rotorThrust.rotorThrustsN,
    totalThrustN: rotorThrust.totalThrustN,
    controllerActive: rotorThrust.controllerActive,
    isSaturated: rotorThrust.isSaturated,
    attitudeErrorRad: rotorThrust.attitudeErrorRad,
    targetAltitudeM: rotorThrust.targetAltitudeM,
  });

  canvas.focus();
  engine.runRenderLoop(() => {
    scene.render();
  });

  return engine;
}
