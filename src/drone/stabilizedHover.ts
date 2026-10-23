import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import {
  ATTITUDE_MAX_TORQUE_NM,
  ATTITUDE_ROLL_PITCH_KD_NM_PER_RAD_S,
  ATTITUDE_ROLL_PITCH_KP_NM_PER_RAD,
  DRONE_HOVER_HEIGHT_M,
  DRONE_MASS_KG,
  DRONE_MAX_ROTOR_THRUST_N,
  DRONE_ROTOR_POSITIONS_M,
  GRAVITY_Y_MPS2,
  HOVER_ALTITUDE_KD_PER_S,
  HOVER_ALTITUDE_KP_PER_S2,
  HOVER_MAX_VERTICAL_ACCEL_MPS2,
  HOVER_MIN_UP_DOT,
} from "../config";

export interface StabilizedThrust {
  motorsN: number[];
  rollErrorRad: number;
  pitchErrorRad: number;
  saturated: boolean;
}

export function measureLevelAttitudeError(
  bodyUpWorld: Vector3,
  bodyRotationWorld: Quaternion,
): { roll: number; pitch: number } {
  const worldUp = Vector3.Up();
  const upDot = Math.max(-1, Math.min(1, Vector3.Dot(bodyUpWorld, worldUp)));
  const attitudeErrorWorld = Vector3.Cross(bodyUpWorld, worldUp);
  const sinTilt = attitudeErrorWorld.length();
  if (sinTilt > 1e-6) {
    attitudeErrorWorld.scaleInPlace(Math.atan2(sinTilt, upDot) / sinTilt);
  } else if (upDot < 0) {
    attitudeErrorWorld.set(Math.PI, 0, 0);
  }

  const worldToBody = Matrix.Identity();
  bodyRotationWorld.clone().invert().toRotationMatrix(worldToBody);
  const attitudeErrorBody = Vector3.TransformNormal(attitudeErrorWorld, worldToBody);
  return { roll: attitudeErrorBody.x, pitch: attitudeErrorBody.z };
}

export function calculateStabilizedThrust(
  altitudeM: number,
  verticalVelocityMps: number,
  bodyUpWorld: Vector3,
  bodyRotationWorld: Quaternion,
  angularVelocityWorld: Vector3,
): StabilizedThrust {
  const worldToBody = Matrix.Identity();
  bodyRotationWorld.clone().invert().toRotationMatrix(worldToBody);
  const angularVelocityBody = Vector3.TransformNormal(angularVelocityWorld, worldToBody);
  const attitudeError = measureLevelAttitudeError(bodyUpWorld, bodyRotationWorld);
  const upDot = Math.max(-1, Math.min(1, Vector3.Dot(bodyUpWorld, Vector3.Up())));
  const rollErrorRad = attitudeError.roll;
  const pitchErrorRad = attitudeError.pitch;

  let rollTorqueNm =
    ATTITUDE_ROLL_PITCH_KP_NM_PER_RAD * rollErrorRad -
    ATTITUDE_ROLL_PITCH_KD_NM_PER_RAD_S * angularVelocityBody.x;
  let pitchTorqueNm =
    ATTITUDE_ROLL_PITCH_KP_NM_PER_RAD * pitchErrorRad -
    ATTITUDE_ROLL_PITCH_KD_NM_PER_RAD_S * angularVelocityBody.z;
  const torqueMagnitude = Math.hypot(rollTorqueNm, pitchTorqueNm);
  let saturated = torqueMagnitude > ATTITUDE_MAX_TORQUE_NM;
  if (torqueMagnitude > ATTITUDE_MAX_TORQUE_NM) {
    const scale = ATTITUDE_MAX_TORQUE_NM / torqueMagnitude;
    rollTorqueNm *= scale;
    pitchTorqueNm *= scale;
  }

  const desiredVerticalAcceleration = clamp(
    HOVER_ALTITUDE_KP_PER_S2 * (DRONE_HOVER_HEIGHT_M - altitudeM) -
      HOVER_ALTITUDE_KD_PER_S * verticalVelocityMps,
    -HOVER_MAX_VERTICAL_ACCEL_MPS2,
    HOVER_MAX_VERTICAL_ACCEL_MPS2,
  );
  const maxTotalThrustN = DRONE_MAX_ROTOR_THRUST_N * DRONE_ROTOR_POSITIONS_M.length;
  const requestedCollectiveThrustN =
    upDot <= HOVER_MIN_UP_DOT
      ? Number.POSITIVE_INFINITY
      : (DRONE_MASS_KG *
          (Math.abs(GRAVITY_Y_MPS2) + desiredVerticalAcceleration)) /
        upDot;
  const collectiveThrustN = clamp(
    requestedCollectiveThrustN,
    0,
    maxTotalThrustN,
  );
  saturated ||= !Number.isFinite(requestedCollectiveThrustN) ||
    collectiveThrustN !== requestedCollectiveThrustN;

  const sumX2 = DRONE_ROTOR_POSITIONS_M.reduce(
    (sum, rotor) => sum + rotor.x * rotor.x,
    0,
  );
  const sumZ2 = DRONE_ROTOR_POSITIONS_M.reduce(
    (sum, rotor) => sum + rotor.z * rotor.z,
    0,
  );
  const unconstrainedMotors = DRONE_ROTOR_POSITIONS_M.map((rotor) => {
    const rollCorrection =
      sumZ2 === 0 ? 0 : (rollTorqueNm * -rotor.z) / sumZ2;
    const pitchCorrection =
      sumX2 === 0 ? 0 : (pitchTorqueNm * rotor.x) / sumX2;
    return collectiveThrustN / DRONE_ROTOR_POSITIONS_M.length +
      rollCorrection +
      pitchCorrection;
  });
  const motorsN = unconstrainedMotors.map((thrust) =>
    clamp(thrust, 0, DRONE_MAX_ROTOR_THRUST_N),
  );
  saturated ||= motorsN.some(
    (thrust, index) => Math.abs(thrust - unconstrainedMotors[index]) > 1e-6,
  );

  return { motorsN, rollErrorRad, pitchErrorRad, saturated };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
