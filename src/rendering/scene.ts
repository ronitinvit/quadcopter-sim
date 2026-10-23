import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { AxesViewer } from "@babylonjs/core/Debug/axesViewer";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Scene } from "@babylonjs/core/scene";
import type { Engine } from "@babylonjs/core/Engines/engine";
import { GROUND_SIZE_M } from "../config";

export interface SceneBundle {
  scene: Scene;
  camera: ArcRotateCamera;
  groundMesh: AbstractMesh;
}

export function createScene(engine: Engine, canvas: HTMLCanvasElement): SceneBundle {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.05, 0.08, 0.12, 1);

  const camera = new ArcRotateCamera(
    "orbitCamera",
    -Math.PI / 2,
    1.05,
    7,
    new Vector3(0, 0.4, 0),
    scene,
  );
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 1.5;
  camera.upperRadiusLimit = 40;
  camera.wheelPrecision = 30;
  camera.panningSensibility = 80;
  camera.minZ = 0.05;
  camera.maxZ = 200;
  camera.useBouncingBehavior = false;

  const hemi = new HemisphericLight("hemi", new Vector3(0.2, 1, 0.15), scene);
  hemi.intensity = 0.75;
  hemi.groundColor = new Color3(0.12, 0.14, 0.16);

  const sun = new DirectionalLight("sun", new Vector3(-0.35, -1, -0.25), scene);
  sun.position = new Vector3(10, 16, 8);
  sun.intensity = 0.55;

  const groundMesh = MeshBuilder.CreateGround(
    "groundVisual",
    { width: GROUND_SIZE_M, height: GROUND_SIZE_M },
    scene,
  );
  const groundMat = new StandardMaterial("groundMat", scene);
  groundMat.diffuseColor = new Color3(0.22, 0.28, 0.24);
  groundMat.specularColor = new Color3(0.05, 0.05, 0.05);
  groundMesh.material = groundMat;

  createCoordinateGrid(scene);
  const axes = new AxesViewer(scene, 0.6);
  axes.scaleLines = 1;

  return { scene, camera, groundMesh };
}

function createCoordinateGrid(scene: Scene): void {
  const size = GROUND_SIZE_M;
  const divisions = 40;
  const half = size / 2;
  const step = size / divisions;
  const lines: Vector3[][] = [];

  for (let i = 0; i <= divisions; i++) {
    const t = -half + i * step;
    lines.push([new Vector3(t, 0.012, -half), new Vector3(t, 0.012, half)]);
    lines.push([new Vector3(-half, 0.012, t), new Vector3(half, 0.012, t)]);
  }

  const grid = MeshBuilder.CreateLineSystem("worldGrid", { lines }, scene);
  grid.color = new Color3(0.28, 0.38, 0.48);
  grid.alpha = 0.7;
  grid.isPickable = false;
}
