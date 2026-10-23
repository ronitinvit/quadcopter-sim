/**
 * Coordinate frames and SI units used by this simulator.
 *
 * World frame (Babylon.js default, left-handed, Y-up):
 *   +X right
 *   +Y up (opposite gravity)
 *   +Z forward from a typical start camera looking toward -Z
 *
 * Gravity is (0, GRAVITY_Y_MPS2, 0) with GRAVITY_Y_MPS2 = -9.81.
 *
 * Body frame (drone root TransformNode):
 *   Origin at the geometric / mass center for milestone 1
 *   Same axis directions as world when the drone attitude is identity
 *   X-configuration arms lie in the XZ plane at about ±45°
 *
 * Stabilization sign convention:
 *   Rotor force is local +Y. A rotor at (x, y, z) produces body torque
 *   (-z·thrust, 0, x·thrust). Positive corrective X/Z torque means positive
 *   right-hand rotation about that body axis; angular velocity is transformed
 *   from world coordinates into the body frame before PD damping is applied.
 *   Yaw is intentionally uncontrolled.
 *
 * Units are SI only: m, kg, s, N, N·s, rad, rad/s, kg·m².
 *
 * Aerospace NED (Z-down, right-handed) is not used yet. A later controller
 * should convert NED ↔ this world frame rather than changing the renderer.
 */
export const WORLD_UP = { x: 0, y: 1, z: 0 } as const;
