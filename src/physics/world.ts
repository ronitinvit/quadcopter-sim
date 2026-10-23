import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";
import { PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { Scene } from "@babylonjs/core/scene";
import type { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import "@babylonjs/core/Physics/joinedPhysicsEngineComponent";
import "@babylonjs/core/Physics/v2/physicsEngineComponent";
import { GRAVITY_Y_MPS2, GROUND_FRICTION, GROUND_RESTITUTION } from "../config";

export interface PhysicsWorld {
  plugin: HavokPlugin;
  groundAggregate: PhysicsAggregate;
}

export function enablePhysicsWorld(
  scene: Scene,
  plugin: HavokPlugin,
  groundMesh: AbstractMesh,
): PhysicsWorld {
  const enabled = scene.enablePhysics(new Vector3(0, GRAVITY_Y_MPS2, 0), plugin);
  if (!enabled || !scene.getPhysicsEngine()) {
    throw new Error("Failed to enable the Havok physics engine.");
  }

  const groundAggregate = new PhysicsAggregate(
    groundMesh,
    PhysicsShapeType.BOX,
    {
      mass: 0,
      friction: GROUND_FRICTION,
      restitution: GROUND_RESTITUTION,
    },
    scene,
  );

  return { plugin, groundAggregate };
}
