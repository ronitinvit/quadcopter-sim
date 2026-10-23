/** Tunable simulator constants. Physical values use SI units. */

export const GRAVITY_Y_MPS2 = -9.81;

export const GROUND_SIZE_M = 40;

export const DRONE_MASS_KG = 1.2;
export const DRONE_BODY_SIZE_M = { x: 0.14, y: 0.05, z: 0.14 };
export const DRONE_ARM_LENGTH_M = 0.18;
export const DRONE_ARM_THICKNESS_M = { y: 0.018, z: 0.024 };
export const DRONE_ROTOR_RADIUS_M = 0.055;
export const DRONE_ROTOR_THICKNESS_M = 0.008;
export const DRONE_SPAWN_HEIGHT_M = 1.5;
export const DRONE_HOVER_HEIGHT_M = 1.5;
export const HOVER_ALTITUDE_KP_PER_S2 = 2.0;
export const HOVER_ALTITUDE_KD_PER_S = 2.2;
export const HOVER_MAX_VERTICAL_ACCEL_MPS2 = 3.5;
export const HOVER_MIN_UP_DOT = 0.25;
export const ATTITUDE_ROLL_PITCH_KP_NM_PER_RAD = 0.18;
export const ATTITUDE_ROLL_PITCH_KD_NM_PER_RAD_S = 0.04;
export const ATTITUDE_MAX_TORQUE_NM = 1.2;

const rotorOffset = DRONE_ARM_LENGTH_M * Math.SQRT1_2;
const rotorHeight = DRONE_BODY_SIZE_M.y * 0.45;
/** Body-relative rotor force application points, matching the visual X layout. */
export const DRONE_ROTOR_POSITIONS_M = [
  { x: rotorOffset, y: rotorHeight, z: rotorOffset },
  { x: -rotorOffset, y: rotorHeight, z: rotorOffset },
  { x: rotorOffset, y: rotorHeight, z: -rotorOffset },
  { x: -rotorOffset, y: rotorHeight, z: -rotorOffset },
] as const;
export const DRONE_MAX_ROTOR_THRUST_N = 8;

export const DRONE_LINEAR_DAMPING = 0.15;
export const DRONE_ANGULAR_DAMPING = 0.25;
export const DRONE_RESTITUTION = 0.05;
export const DRONE_FRICTION = 0.6;

export const GROUND_RESTITUTION = 0.1;
export const GROUND_FRICTION = 0.8;

/** Discrete Havok impulses (N·s) applied by the test controls. */
export const IMPULSE_UP_NS = 4.5;
export const IMPULSE_LATERAL_NS = 2.5;

/** Mouse swipe distance maps to a bounded impact impulse in N·s. */
export const IMPACT_MIN_IMPULSE_NS = 0.35;
export const IMPACT_MAX_IMPULSE_NS = 3.5;
export const IMPACT_MIN_SWIPE_PX = 10;
export const IMPACT_MAX_SWIPE_PX = 250;

/** Grab spring settings in SI units: N/m, N·s/m, N, and meters. */
export const GRAB_STIFFNESS_N_PER_M = 18;
export const GRAB_DAMPING_NS_PER_M = 3.5;
export const GRAB_MAX_FORCE_N = 24;
export const GRAB_MAX_CURSOR_DISTANCE_M = 1.5;
