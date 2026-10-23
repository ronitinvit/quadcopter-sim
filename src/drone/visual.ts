import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import {
  DRONE_ARM_LENGTH_M,
  DRONE_ARM_THICKNESS_M,
  DRONE_BODY_SIZE_M,
  DRONE_ROTOR_RADIUS_M,
  DRONE_ROTOR_POSITIONS_M,
  DRONE_ROTOR_THICKNESS_M,
  DRONE_SPAWN_HEIGHT_M,
} from "../config";

export interface DroneVisual {
  root: TransformNode;
  /** Axis-aligned box size used for the milestone-1 collider. */
  colliderExtents: Vector3;
}

export function createDroneVisual(scene: Scene): DroneVisual {
  const root = new TransformNode("droneRoot", scene);
  root.position = new Vector3(0, DRONE_SPAWN_HEIGHT_M, 0);
  root.rotationQuaternion = new Quaternion();

  const bodyMat = makeMaterial(scene, "droneBodyMat", new Color3(0.12, 0.14, 0.18));
  const armMat = makeMaterial(scene, "droneArmMat", new Color3(0.55, 0.58, 0.62));
  const plusXMat = makeMaterial(scene, "rotorPlusX", new Color3(0.85, 0.18, 0.16));
  const plusZMat = makeMaterial(scene, "rotorPlusZ", new Color3(0.15, 0.45, 0.9));
  const minusMat = makeMaterial(scene, "rotorMinus", new Color3(0.18, 0.18, 0.2));

  const body = MeshBuilder.CreateBox(
    "droneBody",
    {
      width: DRONE_BODY_SIZE_M.x,
      height: DRONE_BODY_SIZE_M.y,
      depth: DRONE_BODY_SIZE_M.z,
    },
    scene,
  );
  body.material = bodyMat;
  body.parent = root;

  const armSpan = DRONE_ARM_LENGTH_M * 2;
  for (const yaw of [Math.PI / 4, -Math.PI / 4]) {
    const arm = MeshBuilder.CreateBox(
      "droneArm",
      {
        width: armSpan,
        height: DRONE_ARM_THICKNESS_M.y,
        depth: DRONE_ARM_THICKNESS_M.z,
      },
      scene,
    );
    arm.material = armMat;
    arm.parent = root;
    arm.rotation.y = yaw;
  }

  const rotors: Array<{ name: string; x: number; z: number; material: StandardMaterial }> = [
    { name: "rotorFrontRight", x: DRONE_ROTOR_POSITIONS_M[0].x, z: DRONE_ROTOR_POSITIONS_M[0].z, material: plusZMat },
    { name: "rotorFrontLeft", x: DRONE_ROTOR_POSITIONS_M[1].x, z: DRONE_ROTOR_POSITIONS_M[1].z, material: plusZMat },
    { name: "rotorRearRight", x: DRONE_ROTOR_POSITIONS_M[2].x, z: DRONE_ROTOR_POSITIONS_M[2].z, material: plusXMat },
    { name: "rotorRearLeft", x: DRONE_ROTOR_POSITIONS_M[3].x, z: DRONE_ROTOR_POSITIONS_M[3].z, material: minusMat },
  ];

  for (const [index, spec] of rotors.entries()) {
    const disc = MeshBuilder.CreateCylinder(
      spec.name,
      {
        diameter: DRONE_ROTOR_RADIUS_M * 2,
        height: DRONE_ROTOR_THICKNESS_M,
        tessellation: 24,
      },
      scene,
    );
    disc.material = spec.material;
    disc.parent = root;
    disc.position = new Vector3(
      spec.x,
      DRONE_ROTOR_POSITIONS_M[index].y,
      spec.z,
    );
  }

  const marker = MeshBuilder.CreateBox(
    "plusXMarker",
    { width: 0.04, height: 0.02, depth: 0.02 },
    scene,
  );
  marker.material = plusXMat;
  marker.parent = root;
  marker.position = new Vector3(DRONE_BODY_SIZE_M.x * 0.45, DRONE_BODY_SIZE_M.y * 0.55, 0);

  const span = (DRONE_ARM_LENGTH_M + DRONE_ROTOR_RADIUS_M) * 2;
  const height = DRONE_BODY_SIZE_M.y + DRONE_ROTOR_THICKNESS_M;
  const colliderExtents = new Vector3(span, height, span);

  return { root, colliderExtents };
}

function makeMaterial(scene: Scene, name: string, color: Color3): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = color;
  mat.specularColor = new Color3(0.15, 0.15, 0.15);
  return mat;
}
