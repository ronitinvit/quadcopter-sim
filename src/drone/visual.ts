import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import {
  DRONE_ARM_LENGTH_M,
  DRONE_ARM_THICKNESS_M,
  DRONE_BODY_SIZE_M,
  DRONE_ROTOR_POSITIONS_M,
  DRONE_ROTOR_RADIUS_M,
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

  const carbon = createCarbonMaterial(scene);
  const graphite = createMaterial(scene, "enclosureGraphite", new Color3(0.075, 0.095, 0.115), 0.45);
  const shell = createMaterial(scene, "electronicsCeramic", new Color3(0.24, 0.29, 0.32), 0.28);
  const aluminum = createMaterial(scene, "motorAluminum", new Color3(0.48, 0.55, 0.58), 0.82);
  const darkMetal = createMaterial(scene, "darkTitanium", new Color3(0.12, 0.16, 0.18), 0.72);
  const safety = createMaterial(scene, "safetyOrange", new Color3(0.98, 0.29, 0.055), 0.35);
  const blue = createMaterial(scene, "orientationBlue", new Color3(0.08, 0.42, 0.74), 0.45);
  const fastener = createMaterial(scene, "fastenerSteel", new Color3(0.62, 0.68, 0.7), 0.9);
  const propFront = createMaterial(scene, "frontPropeller", new Color3(0.19, 0.25, 0.27), 0.42);
  const propRear = createMaterial(scene, "rearPropeller", new Color3(0.11, 0.16, 0.18), 0.38);
  const ledFront = createMaterial(scene, "frontStatusLight", new Color3(1, 0.13, 0.025), 0.25);
  const ledRear = createMaterial(scene, "rearStatusLight", new Color3(0.04, 0.48, 1), 0.25);

  addBox(scene, root, "lowerAvionicsTray", DRONE_BODY_SIZE_M.x * 1.28, 0.014, DRONE_BODY_SIZE_M.z * 1.28, 0, -0.018, 0, graphite);
  addBox(scene, root, "electronicsEnclosure", DRONE_BODY_SIZE_M.x, DRONE_BODY_SIZE_M.y, DRONE_BODY_SIZE_M.z, 0, 0, 0, shell);
  addBox(scene, root, "upperElectronicsCover", DRONE_BODY_SIZE_M.x * 0.82, 0.012, DRONE_BODY_SIZE_M.z * 0.82, 0, DRONE_BODY_SIZE_M.y * 0.52, 0, graphite);
  addBox(scene, root, "frontNoseStripe", DRONE_BODY_SIZE_M.x * 0.72, 0.003, 0.018, 0, DRONE_BODY_SIZE_M.y * 0.63, DRONE_BODY_SIZE_M.z * 0.38, safety);
  addBox(scene, root, "rearOrientationStripe", DRONE_BODY_SIZE_M.x * 0.5, 0.003, 0.012, 0, DRONE_BODY_SIZE_M.y * 0.63, -DRONE_BODY_SIZE_M.z * 0.36, blue);

  for (const yaw of [Math.PI / 4, -Math.PI / 4]) {
    const arm = addBox(
      scene,
      root,
      "carbonCompositeArm",
      DRONE_ARM_LENGTH_M * 2,
      DRONE_ARM_THICKNESS_M.y,
      DRONE_ARM_THICKNESS_M.z,
      0,
      0,
      0,
      carbon,
    );
    arm.rotation.y = yaw;
    const inlay = addBox(
      scene,
      root,
      "armSafetyInlay",
      DRONE_ARM_LENGTH_M * 1.72,
      0.0025,
      DRONE_ARM_THICKNESS_M.z * 0.3,
      0,
      DRONE_ARM_THICKNESS_M.y * 0.54,
      0,
      darkMetal,
    );
    inlay.rotation.y = yaw;
  }

  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      addSphere(
        scene,
        root,
        "enclosureFastener",
        0.008,
        x * DRONE_BODY_SIZE_M.x * 0.39,
        DRONE_BODY_SIZE_M.y * 0.63,
        z * DRONE_BODY_SIZE_M.z * 0.39,
        fastener,
      );
    }
  }

  addCylinder(scene, root, "avionicsBeaconBase", 0.016, 0.008, 16, 0, DRONE_BODY_SIZE_M.y * 0.55 + 0.004, 0, darkMetal);
  addSphere(scene, root, "frontStatusBeacon", 0.006, 0, DRONE_BODY_SIZE_M.y * 0.55 + 0.012, DRONE_BODY_SIZE_M.z * 0.3, ledFront);
  addSphere(scene, root, "rearStatusBeacon", 0.006, 0, DRONE_BODY_SIZE_M.y * 0.55 + 0.012, -DRONE_BODY_SIZE_M.z * 0.3, ledRear);

  DRONE_ROTOR_POSITIONS_M.forEach((position, index) => {
    const front = position.z > 0;
    const label = ["frontRight", "frontLeft", "rearRight", "rearLeft"][index];
    const x = position.x;
    const y = position.y;
    const z = position.z;

    addCylinder(scene, root, `motorMount_${label}`, 0.039, 0.009, 24, x, y - 0.031, z, darkMetal);
    addCylinder(scene, root, `motorHousing_${label}`, 0.032, 0.022, 32, x, y - 0.016, z, aluminum);
    addCylinder(scene, root, `motorTopRim_${label}`, 0.034, 0.004, 32, x, y - 0.003, z, fastener);
    addCylinder(scene, root, `propellerHub_${label}`, 0.014, 0.014, 24, x, y, z, graphite);
    addCylinder(scene, root, `propellerNut_${label}`, 0.008, 0.006, 6, x, y + 0.009, z, safety);

    const propMaterial = front ? propFront : propRear;
    for (const side of [-1, 1]) {
      const blade = addBox(
        scene,
        root,
        `propellerBlade_${label}_${side}`,
        DRONE_ROTOR_RADIUS_M * 1.9,
        DRONE_ROTOR_THICKNESS_M,
        0.012,
        x + side * DRONE_ROTOR_RADIUS_M * 0.82,
        y + 0.012,
        z,
        propMaterial,
      );
      blade.rotation.y = (front ? -1 : 1) * 0.12;
      const tip = addBox(
        scene,
        root,
        `propellerTip_${label}_${side}`,
        0.012,
        DRONE_ROTOR_THICKNESS_M * 1.03,
        0.012,
        x + side * DRONE_ROTOR_RADIUS_M * 1.58,
        y + 0.012,
        z,
        front ? safety : blue,
      );
      tip.rotation.y = blade.rotation.y;
    }

    for (const angle of [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2]) {
      addSphere(
        scene,
        root,
        `motorBolt_${label}`,
        0.003,
        x + Math.cos(angle) * 0.026,
        y - 0.007,
        z + Math.sin(angle) * 0.026,
        darkMetal,
      );
    }
  });

  addLandingGear(scene, root, aluminum, darkMetal);

  const span = (DRONE_ARM_LENGTH_M + DRONE_ROTOR_RADIUS_M) * 2;
  const height = DRONE_BODY_SIZE_M.y + DRONE_ROTOR_THICKNESS_M;
  return { root, colliderExtents: new Vector3(span, height, span) };
}

function addLandingGear(
  scene: Scene,
  root: TransformNode,
  strutMaterial: StandardMaterial,
  skidMaterial: StandardMaterial,
): void {
  const footY = -0.008;
  for (const x of [-0.105, 0.105]) {
    for (const z of [-0.11, 0.11]) {
      addTube(
        scene,
        root,
        "landingGearStrut",
        [new Vector3(x * 0.58, 0.005, z * 0.58), new Vector3(x, footY, z)],
        0.006,
        strutMaterial,
      );
    }
    addTube(
      scene,
      root,
      "landingSkid",
      [new Vector3(x, footY, -0.17), new Vector3(x, footY, 0.17)],
      0.008,
      skidMaterial,
    );
    addSphere(scene, root, "skidEndCap", 0.009, x, footY, -0.17, strutMaterial);
    addSphere(scene, root, "skidEndCap", 0.009, x, footY, 0.17, strutMaterial);
  }
}

function addBox(
  scene: Scene,
  root: TransformNode,
  name: string,
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  material: StandardMaterial,
): Mesh {
  const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, scene);
  mesh.position.set(x, y, z);
  mesh.material = material;
  mesh.parent = root;
  return mesh;
}

function addCylinder(
  scene: Scene,
  root: TransformNode,
  name: string,
  diameter: number,
  height: number,
  tessellation: number,
  x: number,
  y: number,
  z: number,
  material: StandardMaterial,
): Mesh {
  const mesh = MeshBuilder.CreateCylinder(name, { diameter, height, tessellation }, scene);
  mesh.position.set(x, y, z);
  mesh.material = material;
  mesh.parent = root;
  return mesh;
}

function addSphere(
  scene: Scene,
  root: TransformNode,
  name: string,
  diameter: number,
  x: number,
  y: number,
  z: number,
  material: StandardMaterial,
): Mesh {
  const mesh = MeshBuilder.CreateSphere(name, { diameter, segments: 12 }, scene);
  mesh.position.set(x, y, z);
  mesh.material = material;
  mesh.parent = root;
  return mesh;
}

function addTube(
  scene: Scene,
  root: TransformNode,
  name: string,
  path: Vector3[],
  radius: number,
  material: StandardMaterial,
): Mesh {
  const mesh = MeshBuilder.CreateTube(name, { path, radius, tessellation: 8 }, scene);
  mesh.material = material;
  mesh.parent = root;
  return mesh;
}

function createMaterial(
  scene: Scene,
  name: string,
  color: Color3,
  specularPower: number,
): StandardMaterial {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = color;
  material.specularColor = new Color3(0.65, 0.7, 0.72);
  material.specularPower = specularPower * 100;
  return material;
}

function createCarbonMaterial(scene: Scene): StandardMaterial {
  const texture = new DynamicTexture("carbonWeave", { width: 128, height: 128 }, scene, false);
  const context = texture.getContext();
  context.fillStyle = "#171d20";
  context.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 8) {
    for (let x = 0; x < 128; x += 8) {
      const alternate = ((x + y) / 8) % 2 === 0;
      context.fillStyle = alternate ? "#252d30" : "#1d2528";
      context.fillRect(x, y, 6, 6);
      context.fillStyle = alternate ? "#111719" : "#151b1d";
      context.fillRect(x + 4, y + 1, 2, 5);
    }
  }
  texture.update(false);
  texture.uScale = 2;
  texture.vScale = 1;

  const material = new StandardMaterial("carbonCompositeWeave", scene);
  material.diffuseTexture = texture;
  material.specularColor = new Color3(0.32, 0.38, 0.4);
  material.specularPower = 96;
  return material;
}
