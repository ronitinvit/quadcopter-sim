import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";
import {
  PhysicsActivationControl,
  PhysicsShapeType,
} from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import type { PhysicsBody } from "@babylonjs/core/Physics/v2/physicsBody";
import type { Scene } from "@babylonjs/core/scene";
import type { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import type { DroneVisual } from "./visual";
import {
  DRONE_ANGULAR_DAMPING,
  DRONE_FRICTION,
  DRONE_LINEAR_DAMPING,
  DRONE_MASS_KG,
  DRONE_RESTITUTION,
} from "../config";

export interface DroneBody {
  aggregate: PhysicsAggregate;
  physicsBody: PhysicsBody;
}

export function attachDronePhysics(
  scene: Scene,
  plugin: HavokPlugin,
  visual: DroneVisual,
): DroneBody {
  const aggregate = new PhysicsAggregate(
    visual.root,
    PhysicsShapeType.BOX,
    {
      mass: DRONE_MASS_KG,
      friction: DRONE_FRICTION,
      restitution: DRONE_RESTITUTION,
      extents: visual.colliderExtents,
      startAsleep: false,
    },
    scene,
  );

  const physicsBody = aggregate.body;
  physicsBody.setLinearDamping(DRONE_LINEAR_DAMPING);
  physicsBody.setAngularDamping(DRONE_ANGULAR_DAMPING);
  plugin.setActivationControl(physicsBody, PhysicsActivationControl.ALWAYS_ACTIVE);

  return { aggregate, physicsBody };
}
