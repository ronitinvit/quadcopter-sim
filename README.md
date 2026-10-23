# Quadcopter physics simulator (milestones 1, 2A, 2B, 3A, and 3B)

Standalone browser app: Babylon.js 9.31.0 rendering plus Havok 1.3.14 rigid-body physics. Independent of Streamlit, ArduPilot, SITL, and Mission Planner.

## Run

From `quadcopter-sim`:

```bash
npm install
npm run dev
```

Open http://localhost:5173

Production check:

```bash
npm run build
npm run preview
```

## What is implemented

Motion is driven by Havok, not by a canned animation. The drone falls under gravity and collides with the ground. The HUD reads position and velocity from the physics body and counts `onAfterPhysicsObservable` steps.

Milestone 2A adds a mouse impact interaction. In Impact mode, swipe across a drone component to apply a bounded `PhysicsBody.applyImpulse` at the picked world-space point. Swipe direction is mapped through the camera's screen-right and screen-up directions, so an off-centre hit can create angular motion. The HUD and short-lived scene marker show the hit component, point, and impulse magnitude.

Milestone 2B adds a spring-like mouse grab. In Grab mode, hold a picked point and drag it; a damped force is applied at the corresponding point on the rigid body through Physics V2. The mouse target stays on a plane perpendicular to the initial view direction, and the cursor displacement and force are bounded. Releasing the pointer, losing focus, cancelling the pointer, or switching modes immediately ends the grab.

There is no motor mixer or flight controller.

Milestone 3A adds **Free Physics** and **Hover Test** operating modes. In Hover Test, four equal forces are applied at the visual rotor locations on every physics step. Each motor's hover thrust is calculated from configured mass × gravity magnitude / 4 (2.943 N at the current 1.2 kg and 9.81 m/s² settings), subject to the configured per-rotor maximum. The HUD reports the applied motor forces and body altitude/vertical velocity. Hover Test balances gravity only for a level, undisturbed drone: it does not stabilize attitude, and a tilted drone can drift or descend.

Use **Reset Hover Test** to start at the configured hover height with level attitude and zero linear/angular velocity; this action also selects Hover Test. Switching between Free Physics and Hover Test preserves current velocity. Free Physics disables all rotor forces; switching into Hover Test does not reset velocity or automatically lift the drone off the ground.

Milestone 3B adds **Stabilized Hover**, using a proportional-derivative controller for level attitude and the configured altitude target. The roll/pitch gains are 0.18 N·m/rad and 0.04 N·m/(rad/s); the altitude gains are 2.0 s⁻² and 2.2 s⁻¹. Desired vertical acceleration is limited to ±3.5 m/s², controller torque to 1.2 N·m, and each mixed motor command to 0–8 N. A low or negative body-up/world-up dot product is handled by limiting collective thrust to the available maximum. Saturation is reported in the HUD; the controller has no integral state and does not assume clipped torques were achieved. It derives the roll/pitch thrust allocation from the configured rotor positions. Yaw stabilization is not implemented because rotor reaction torque is not modeled.

The existing Havok plugin steps with render delta while `PhysicsBody.applyForce()` converts the input force using the physics engine's configured timestep. The rotor model scales only the API input by actual-step/configured-step so the applied impulse corresponds to force × elapsed physics time; the HUD motor values remain the intended thrust in newtons. Hover Test uses the same scheduling adjustment.

**Reset Stabilized Hover** selects the mode and resets the single dynamic body to the configured target altitude, level attitude, and zero linear/angular velocity. Switching operating modes preserves velocity. Stabilized Hover continues to accept physics-based impacts and grab disturbances; recovery depends on the available motor authority and is not guaranteed after extreme impacts or while motors saturate.

## Controls

- **Camera mode**: left mouse drag orbits, right/middle drag pans, and the wheel zooms
- **Impact mode**: left mouse swipe across the drone applies a physics impulse; camera controls are detached until Camera mode is selected
- **Grab mode**: hold a point on the drone and drag to pull it with a damped spring force; release to stop
- **Free Physics / Hover Test / Stabilized Hover**: select operating thrust/control behavior
- **Reset Hover Test**: place the drone at the configured hover height and clear its velocities
- **Reset Stabilized Hover**: start the feedback controller level at target altitude
- Space or **Impulse +Y**: 4.5 N·s upward at the center of mass
- F or **Impulse +X**: 2.5 N·s along world +X

Impact swipe distance maps to 0.35–3.5 N·s, capped at 250 screen pixels to prevent excessive impulses.
The grab spring uses stiffness 18 N/m, damping 3.5 N·s/m, a 24 N force cap, and a 1.5 m maximum cursor offset.

## Coordinates and units

World is Babylon’s default left-handed Y-up frame. Gravity is `(0, -9.81, 0)` m/s². Lengths are meters, mass kilograms, impulses newton-seconds. See `src/conventions.ts`.

Pinned packages: `@babylonjs/core@9.31.0`, `@babylonjs/havok@1.3.14`.
