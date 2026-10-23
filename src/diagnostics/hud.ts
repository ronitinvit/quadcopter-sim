import "@babylonjs/core/Physics/v2/physicsEngineComponent";
import type { PhysicsBody } from "@babylonjs/core/Physics/v2/physicsBody";
import type { Scene } from "@babylonjs/core/scene";
import type { ImpulseEvent } from "../input/impulseControl";
import type { ImpactEvent, InteractionMode } from "../input/impactControl";
import { DRONE_MASS_KG, GRAVITY_Y_MPS2 } from "../config";
import type { OperatingMode } from "../drone/rotorThrust";

export interface HudSources {
  scene: Scene;
  body: PhysicsBody;
  lastImpulse: () => ImpulseEvent | null;
  interactionMode: () => InteractionMode;
  lastImpact: () => ImpactEvent | null;
  isGrabbing: () => boolean;
  operatingMode: () => OperatingMode;
  rotorThrustsN: () => readonly number[];
  totalThrustN: () => number;
  controllerActive: () => boolean;
  isSaturated: () => boolean;
  attitudeErrorRad: () => { roll: number; pitch: number };
  targetAltitudeM: () => number;
}

export function bindHud(element: HTMLElement, sources: HudSources): () => void {
  let physicsSteps = 0;
  const afterPhysics = sources.scene.onAfterPhysicsObservable.add(() => {
    physicsSteps += 1;
  });

  const beforeRender = sources.scene.onBeforeRenderObservable.add(() => {
    const engine = sources.scene.getEngine();
    const dt = engine.getDeltaTime() / 1000;
    const pos = sources.body.transformNode.getAbsolutePosition();
    const lin = sources.body.getLinearVelocity();
    const ang = sources.body.getAngularVelocity();
    const rotorThrusts = sources.rotorThrustsN();
    const operatingMode = sources.operatingMode();
    const attitudeError = sources.attitudeErrorRad();
    const controllerActive = sources.controllerActive();
    const physicsEngine = sources.scene.getPhysicsEngine();
    const impulse = sources.lastImpulse();
    const impact = sources.lastImpact();
    const impulseAge =
      impulse === null ? "none" : `${((performance.now() - impulse.atMs) / 1000).toFixed(2)} s ago`;
    const impactAge =
      impact === null ? "none" : `${((performance.now() - impact.atMs) / 1000).toFixed(2)} s ago`;

    element.textContent = [
      "Quadcopter physics (Havok, SI units)",
      `operating mode: ${operatingModeLabel(operatingMode)}   interaction: ${sources.interactionMode()}`,
      `grab: ${sources.isGrabbing() ? "active" : "inactive"}   physics steps: ${physicsSteps}`,
      `physics: ${physicsEngine ? physicsEngine.getPhysicsPluginName() : "missing"}   dt: ${dt.toFixed(4)} s   fps: ${engine.getFps().toFixed(0)}`,
      `mass: ${DRONE_MASS_KG.toFixed(2)} kg   gravity: ${Math.abs(GRAVITY_Y_MPS2).toFixed(2)} m/s²`,
      `altitude: ${fmt(pos.y)} m / target ${sources.targetAltitudeM().toFixed(2)} m   vertical speed: ${fmt(lin.y)} m/s`,
      `roll target 0° / level correction: ${degrees(attitudeError.roll)}   pitch target 0° / level correction: ${degrees(attitudeError.pitch)}`,
      `rotor thrust (N): ${rotorThrusts.map((thrust, index) => `R${index + 1} ${thrust.toFixed(3)}`).join("   ")}`,
      `total thrust: ${sources.totalThrustN().toFixed(3)} N   saturation: ${sources.isSaturated() ? "YES" : "no"}`,
      `attitude controller: ${controllerActive ? "active" : "inactive"}   yaw stabilization: NOT IMPLEMENTED`,
      `position (m):  x ${fmt(pos.x)}  y ${fmt(pos.y)}  z ${fmt(pos.z)}`,
      `lin vel (m/s): x ${fmt(lin.x)}  y ${fmt(lin.y)}  z ${fmt(lin.z)}`,
      `speed: ${lin.length().toFixed(3)} m/s   ang vel (rad/s): x ${fmt(ang.x)}  y ${fmt(ang.y)}  z ${fmt(ang.z)}`,
      `last impulse: ${impulse ? `${impulse.label} [${fmt(impulse.impulseNs.x)}, ${fmt(impulse.impulseNs.y)}, ${fmt(impulse.impulseNs.z)}] N·s` : "none"}`,
      `last impact: ${impact ? `${impact.componentName}, ${impact.magnitudeNs.toFixed(2)} N·s at [${fmt(impact.worldPoint.x)}, ${fmt(impact.worldPoint.y)}, ${fmt(impact.worldPoint.z)}] m` : "none"}`,
      `impulse age: ${impulseAge}   impact age: ${impactAge}`,
      "Space / button: +Y impulse    F / button: +X impulse",
      "Impact: swipe    Grab: hold and drag    Camera: LMB orbit, RMB/MMB pan, wheel zoom",
      "Hover Test balances gravity only when level and undisturbed; Stabilized Hover uses roll/pitch and altitude PD.",
      "Yaw is uncontrolled. Mode switches preserve velocity; Reset sets hover height, level attitude, and zero velocity.",
    ].join("\n");
  });

  return () => {
    sources.scene.onAfterPhysicsObservable.remove(afterPhysics);
    sources.scene.onBeforeRenderObservable.remove(beforeRender);
  };
}

function fmt(value: number): string {
  return value.toFixed(3).padStart(8, " ");
}

function degrees(radians: number): string {
  return `${((radians * 180) / Math.PI).toFixed(1)}°`;
}

function operatingModeLabel(mode: OperatingMode): string {
  switch (mode) {
    case "free":
      return "Free Physics";
    case "hover":
      return "Hover Test";
    case "stabilized":
      return "Stabilized Hover";
  }
}
