import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PhysicsPrestepType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import type { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import type { PhysicsBody } from "@babylonjs/core/Physics/v2/physicsBody";
import type { Scene } from "@babylonjs/core/scene";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import {
  DRONE_HOVER_HEIGHT_M,
  DRONE_MASS_KG,
  DRONE_MAX_ROTOR_THRUST_N,
  DRONE_ROTOR_POSITIONS_M,
  GRAVITY_Y_MPS2,
} from "../config";
import {
  calculateStabilizedThrust,
  measureLevelAttitudeError,
} from "./stabilizedHover";

export type OperatingMode = "free" | "hover" | "stabilized";

export interface RotorThrust {
  mode: () => OperatingMode;
  rotorThrustsN: () => readonly number[];
  totalThrustN: () => number;
  controllerActive: () => boolean;
  isSaturated: () => boolean;
  attitudeErrorRad: () => { roll: number; pitch: number };
  targetAltitudeM: () => number;
  dispose: () => void;
}

export function bindRotorThrust(
  scene: Scene,
  body: PhysicsBody,
  droneRoot: TransformNode,
  plugin: HavokPlugin,
): RotorThrust {
  const freeButton = document.querySelector<HTMLButtonElement>("#mode-free");
  const hoverButton = document.querySelector<HTMLButtonElement>("#mode-hover");
  const stabilizedButton = document.querySelector<HTMLButtonElement>("#mode-stabilized");
  const resetHoverButton = document.querySelector<HTMLButtonElement>("#reset-hover");
  const resetStabilizedButton =
    document.querySelector<HTMLButtonElement>("#reset-stabilized");
  if (
    !freeButton ||
    !hoverButton ||
    !stabilizedButton ||
    !resetHoverButton ||
    !resetStabilizedButton
  ) {
    throw new Error("Missing operating mode or hover reset buttons.");
  }

  let currentMode: OperatingMode = "free";
  let resetPending = false;
  let appliedThrustsN = DRONE_ROTOR_POSITIONS_M.map(() => 0);
  let saturated = false;
  let rollErrorRad = 0;
  let pitchErrorRad = 0;
  const previousPrestepType = body.getPrestepType();

  const updateButtons = (): void => {
    freeButton.setAttribute("aria-pressed", String(currentMode === "free"));
    hoverButton.setAttribute("aria-pressed", String(currentMode === "hover"));
    stabilizedButton.setAttribute("aria-pressed", String(currentMode === "stabilized"));
  };
  const setMode = (mode: OperatingMode): void => {
    currentMode = mode;
    saturated = false;
    if (mode === "free") {
      appliedThrustsN = DRONE_ROTOR_POSITIONS_M.map(() => 0);
      rollErrorRad = 0;
      pitchErrorRad = 0;
    }
    updateButtons();
  };
  const reset = (mode: Exclude<OperatingMode, "free">): void => {
    setMode(mode);
    body.setPrestepType(PhysicsPrestepType.TELEPORT);
    body.transformNode.position.set(0, DRONE_HOVER_HEIGHT_M, 0);
    body.transformNode.rotationQuaternion = Quaternion.Identity();
    droneRoot.computeWorldMatrix(true);
    plugin.setPhysicsBodyTransformation(body, droneRoot);
    body.setLinearVelocity(Vector3.Zero());
    body.setAngularVelocity(Vector3.Zero());
    resetPending = true;
  };

  const beforePhysics = scene.onBeforePhysicsObservable.add(() => {
    appliedThrustsN = DRONE_ROTOR_POSITIONS_M.map(() => 0);
    saturated = false;
    const worldMatrix = droneRoot.computeWorldMatrix(true);
    const bodyRotation =
      droneRoot.rotationQuaternion ?? Quaternion.FromEulerVector(droneRoot.rotation);
    const thrustDirection =
      resetPending
        ? Vector3.Up()
        : Vector3.TransformNormal(Vector3.Up(), worldMatrix).normalize();
    const attitudeError = resetPending
      ? { roll: 0, pitch: 0 }
      : measureLevelAttitudeError(thrustDirection, bodyRotation);
    rollErrorRad = attitudeError.roll;
    pitchErrorRad = attitudeError.pitch;
    if (currentMode === "free") {
      return;
    }

    const thrustPerRotorN = Math.min(
      (DRONE_MASS_KG * Math.abs(GRAVITY_Y_MPS2)) / DRONE_ROTOR_POSITIONS_M.length,
      DRONE_MAX_ROTOR_THRUST_N,
    );
    if (currentMode === "hover" || resetPending) {
      appliedThrustsN = DRONE_ROTOR_POSITIONS_M.map(() => thrustPerRotorN);
    } else {
      const result = calculateStabilizedThrust(
        body.transformNode.getAbsolutePosition().y,
        body.getLinearVelocity().y,
        thrustDirection,
        bodyRotation,
        body.getAngularVelocity(),
      );
      appliedThrustsN = result.motorsN;
      saturated = result.saturated;
    }

    const physicsEngine = scene.getPhysicsEngine();
    const subTimeStepMs = physicsEngine?.getSubTimeStep() ?? 0;
    const stepSeconds =
      subTimeStepMs > 0
        ? subTimeStepMs / 1000
        : scene.getEngine().getDeltaTime() / 1000;
    // PhysicsBody.applyForce converts input force to an impulse using getTimeStep().
    // Scale only to reconcile that internal timestep with the actual physics step.
    const forceScale = physicsEngine
      ? stepSeconds / physicsEngine.getTimeStep()
      : 1;

    DRONE_ROTOR_POSITIONS_M.forEach((position, index) => {
      const localPoint = new Vector3(position.x, position.y, position.z);
      const worldPoint = Vector3.TransformCoordinates(localPoint, worldMatrix);
      body.applyForce(
        thrustDirection.scale(appliedThrustsN[index] * forceScale),
        worldPoint,
      );
    });
  });
  const afterPhysics = scene.onAfterPhysicsObservable.add(() => {
    if (resetPending) {
      body.setLinearVelocity(Vector3.Zero());
      body.setAngularVelocity(Vector3.Zero());
      body.setPrestepType(previousPrestepType);
      resetPending = false;
    }
  });

  const onFreeClick = (): void => setMode("free");
  const onHoverClick = (): void => setMode("hover");
  const onStabilizedClick = (): void => setMode("stabilized");
  const onResetHover = (): void => reset("hover");
  const onResetStabilized = (): void => reset("stabilized");
  freeButton.addEventListener("click", onFreeClick);
  hoverButton.addEventListener("click", onHoverClick);
  stabilizedButton.addEventListener("click", onStabilizedClick);
  resetHoverButton.addEventListener("click", onResetHover);
  resetStabilizedButton.addEventListener("click", onResetStabilized);
  updateButtons();

  return {
    mode: () => currentMode,
    rotorThrustsN: () => appliedThrustsN,
    totalThrustN: () => appliedThrustsN.reduce((total, thrust) => total + thrust, 0),
    controllerActive: () => currentMode === "stabilized",
    isSaturated: () => saturated,
    attitudeErrorRad: () => ({ roll: rollErrorRad, pitch: pitchErrorRad }),
    targetAltitudeM: () => DRONE_HOVER_HEIGHT_M,
    dispose: () => {
      scene.onBeforePhysicsObservable.remove(beforePhysics);
      scene.onAfterPhysicsObservable.remove(afterPhysics);
      freeButton.removeEventListener("click", onFreeClick);
      hoverButton.removeEventListener("click", onHoverClick);
      stabilizedButton.removeEventListener("click", onStabilizedClick);
      resetHoverButton.removeEventListener("click", onResetHover);
      resetStabilizedButton.removeEventListener("click", onResetStabilized);
    },
  };
}
