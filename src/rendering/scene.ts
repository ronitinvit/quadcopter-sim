import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Scene } from "@babylonjs/core/scene";
import type { Engine } from "@babylonjs/core/Engines/engine";
import { GROUND_SIZE_M } from "../config";

export interface SceneBundle {
  scene: Scene;
  camera: ArcRotateCamera;
  groundMesh: AbstractMesh;
  shadowGenerator: ShadowGenerator;
}

export function createScene(engine: Engine, canvas: HTMLCanvasElement): SceneBundle {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.63, 0.78, 0.88, 1);
  scene.ambientColor = new Color3(0.2, 0.22, 0.23);
  scene.imageProcessingConfiguration.exposure = 1.05;
  scene.imageProcessingConfiguration.contrast = 1.08;

  const camera = new ArcRotateCamera(
    "orbitCamera",
    -Math.PI / 2,
    1.25,
    5.2,
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

  const hemi = new HemisphericLight("daylight", new Vector3(0.2, 1, 0.15), scene);
  hemi.intensity = 0.9;
  hemi.diffuse = new Color3(0.86, 0.93, 1);
  hemi.groundColor = new Color3(0.29, 0.34, 0.3);

  const sun = new DirectionalLight("sun", new Vector3(-0.35, -1, -0.25), scene);
  sun.position = new Vector3(10, 18, 12);
  sun.intensity = 1.15;
  sun.diffuse = new Color3(1, 0.91, 0.76);
  const shadowGenerator = new ShadowGenerator(1024, sun);
  shadowGenerator.useBlurExponentialShadowMap = true;
  shadowGenerator.blurKernel = 18;
  shadowGenerator.setDarkness(0.28);

  const groundMesh = MeshBuilder.CreateGround(
    "groundVisual",
    { width: GROUND_SIZE_M, height: GROUND_SIZE_M },
    scene,
  );
  const groundMat = new StandardMaterial("grassGround", scene);
  groundMat.diffuseTexture = createGrassTexture(scene);
  groundMat.specularColor = new Color3(0.035, 0.045, 0.035);
  groundMesh.material = groundMat;
  groundMesh.receiveShadows = true;

  const realisticEnvironment = [
    ...createLandingPad(scene),
    ...createDistantHills(scene),
  ];
  const technicalView = createTechnicalView(scene);
  bindViewControls(camera, technicalView, realisticEnvironment, groundMesh, groundMat);

  return { scene, camera, groundMesh, shadowGenerator };
}

function createGrassTexture(scene: Scene): DynamicTexture {
  const texture = new DynamicTexture("proceduralGrass", { width: 256, height: 256 }, scene, false);
  const context = texture.getContext() as CanvasRenderingContext2D;
  const image = context.createImageData(256, 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const index = (y * 256 + x) * 4;
      let noiseSeed = Math.imul(x + 1, 374761393) + Math.imul(y + 1, 668265263);
      noiseSeed = Math.imul(noiseSeed ^ (noiseSeed >>> 13), 1274126177);
      const noise = ((noiseSeed ^ (noiseSeed >>> 16)) & 15) - 8;
      image.data[index] = 58 + noise;
      image.data[index + 1] = 79 + noise;
      image.data[index + 2] = 53 + noise;
      image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  texture.update(false);
  texture.wrapU = Texture.WRAP_ADDRESSMODE;
  texture.wrapV = Texture.WRAP_ADDRESSMODE;
  texture.uScale = 4;
  texture.vScale = 4;
  return texture;
}

function createLandingPad(scene: Scene): AbstractMesh[] {
  const pad = MeshBuilder.CreateGround(
    "concreteLandingPad",
    { width: 5.2, height: 5.2, subdivisions: 1 },
    scene,
  );
  pad.position.y = 0.001;
  pad.isPickable = false;
  pad.receiveShadows = true;

  const texture = new DynamicTexture("concreteAndLandingMarkings", { width: 512, height: 512 }, scene, false);
  const context = texture.getContext() as CanvasRenderingContext2D;
  context.fillStyle = "#62696a";
  context.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 4) {
    for (let x = 0; x < 512; x += 4) {
      const grain = ((x * 11 + y * 19 + x * y * 3) % 19) - 9;
      const level = 98 + grain;
      context.fillStyle = `rgb(${level},${level + 5},${level + 5})`;
      context.fillRect(x, y, 3, 3);
    }
  }
  context.strokeStyle = "#e5e8dd";
  context.lineWidth = 8;
  context.strokeRect(34, 34, 444, 444);
  context.strokeStyle = "#e3a941";
  context.lineWidth = 5;
  context.setLineDash([20, 15]);
  context.strokeRect(48, 48, 416, 416);
  context.setLineDash([]);
  context.strokeStyle = "#e9ece6";
  context.lineWidth = 18;
  context.lineCap = "square";
  context.beginPath();
  context.moveTo(198, 190);
  context.lineTo(198, 322);
  context.moveTo(314, 190);
  context.lineTo(314, 322);
  context.moveTo(198, 256);
  context.lineTo(314, 256);
  context.stroke();
  context.fillStyle = "#e3a941";
  context.font = "bold 23px sans-serif";
  context.textAlign = "center";
  context.fillText("H   -   01", 256, 418);
  texture.update(false);

  const concrete = new StandardMaterial("brushedConcrete", scene);
  concrete.diffuseTexture = texture;
  concrete.specularColor = new Color3(0.12, 0.12, 0.11);
  pad.material = concrete;

  const ringMaterial = new StandardMaterial("padDetailMaterial", scene);
  ringMaterial.diffuseColor = new Color3(0.73, 0.75, 0.69);
  ringMaterial.emissiveColor = new Color3(0.08, 0.08, 0.06);
  const ring = MeshBuilder.CreateTorus(
    "landingAlignmentRing",
    { diameter: 1.8, thickness: 0.012, tessellation: 64 },
    scene,
  );
  ring.position.y = 0.016;
  ring.material = ringMaterial;
  ring.isPickable = false;

  const crackMaterial = new StandardMaterial("concreteJointMaterial", scene);
  crackMaterial.diffuseColor = new Color3(0.28, 0.31, 0.3);
  crackMaterial.emissiveColor = new Color3(0.04, 0.045, 0.04);
  const joints: AbstractMesh[] = [];
  for (const offset of [-2.45, 2.45]) {
    const joint = MeshBuilder.CreateBox(
      "concreteExpansionJoint",
      { width: 0.008, height: 0.001, depth: 4.7 },
      scene,
    );
    joint.position.set(offset, 0.007, 0);
    joint.material = crackMaterial;
    joint.isPickable = false;
    joints.push(joint);
  }
  return [pad, ring, ...joints];
}

function createDistantHills(scene: Scene): AbstractMesh[] {
  const hillMaterial = new StandardMaterial("distantTerrain", scene);
  hillMaterial.diffuseColor = new Color3(0.22, 0.32, 0.25);
  hillMaterial.emissiveColor = new Color3(0.02, 0.028, 0.02);
  hillMaterial.specularColor = new Color3(0.025, 0.035, 0.03);
  const profiles = [
    { x: -23, z: -21, sx: 15, sy: 3, sz: 13 },
    { x: -8, z: -25, sx: 16, sy: 3.5, sz: 13 },
    { x: 9, z: -25, sx: 16, sy: 3, sz: 13 },
    { x: 24, z: -21, sx: 15, sy: 2.8, sz: 14 },
    { x: -25, z: 0, sx: 13, sy: 2.8, sz: 18 },
    { x: 25, z: 0, sx: 13, sy: 3, sz: 18 },
    { x: -23, z: 21, sx: 15, sy: 3, sz: 13 },
    { x: -8, z: 25, sx: 16, sy: 3.5, sz: 13 },
    { x: 9, z: 25, sx: 16, sy: 3, sz: 13 },
    { x: 24, z: 21, sx: 15, sy: 2.8, sz: 14 },
  ];
  const hills: AbstractMesh[] = [];
  for (const [index, hill] of profiles.entries()) {
    const mesh = MeshBuilder.CreateSphere(
      `terrainSilhouette_${index}`,
      { diameter: 1, segments: 16 },
      scene,
    );
    mesh.scaling.set(hill.sx, hill.sy, hill.sz);
    mesh.position.set(hill.x, -hill.sy * 0.3, hill.z);
    mesh.material = hillMaterial;
    mesh.isPickable = false;
    mesh.receiveShadows = false;
    hills.push(mesh);
  }
  return hills;
}

interface TechnicalView {
  grid: AbstractMesh;
  axes: AbstractMesh[];
}

function createTechnicalView(scene: Scene): TechnicalView {
  const size = GROUND_SIZE_M;
  const divisions = 40;
  const half = size / 2;
  const lines: Vector3[][] = [];
  for (let i = 0; i <= divisions; i++) {
    const t = -half + (i * size) / divisions;
    lines.push([new Vector3(t, 0.02, -half), new Vector3(t, 0.02, half)]);
    lines.push([new Vector3(-half, 0.02, t), new Vector3(half, 0.02, t)]);
  }

  const grid = MeshBuilder.CreateLineSystem("technicalGrid", { lines }, scene);
  grid.color = new Color3(0.22, 0.31, 0.35);
  grid.alpha = 0.65;
  grid.isPickable = false;
  grid.setEnabled(false);

  const axes = [
    { name: "axisX", end: new Vector3(2, 0, 0), color: new Color3(0.9, 0.2, 0.16) },
    { name: "axisY", end: new Vector3(0, 2, 0), color: new Color3(0.25, 0.8, 0.38) },
    { name: "axisZ", end: new Vector3(0, 0, 2), color: new Color3(0.15, 0.38, 0.95) },
  ].map(({ name, end, color }) => {
    const line = MeshBuilder.CreateLines(
      name,
      { points: [new Vector3(0, 0.03, 0), new Vector3(end.x, end.y + 0.03, end.z)] },
      scene,
    );
    line.color = color;
    line.isPickable = false;
    line.setEnabled(false);
    return line;
  });
  return { grid, axes };
}

function bindViewControls(
  camera: ArcRotateCamera,
  technicalView: TechnicalView,
  realisticEnvironment: AbstractMesh[],
  groundMesh: AbstractMesh,
  realisticGroundMaterial: StandardMaterial,
): void {
  const gridButton = document.querySelector<HTMLButtonElement>("#toggle-grid");
  const resetButton = document.querySelector<HTMLButtonElement>("#reset-camera");
  if (!gridButton || !resetButton) {
    throw new Error("Missing camera or technical-view controls.");
  }
  const technicalGroundMaterial = new StandardMaterial("technicalGround", groundMesh.getScene());
  technicalGroundMaterial.diffuseColor = new Color3(0.23, 0.28, 0.31);
  technicalGroundMaterial.specularColor = new Color3(0.04, 0.05, 0.06);

  const onToggleGrid = (): void => {
    const enabled = gridButton.getAttribute("aria-pressed") !== "true";
    gridButton.setAttribute("aria-pressed", String(enabled));
    gridButton.textContent = enabled ? "Realistic View" : "Grid / Axes";
    technicalView.grid.setEnabled(enabled);
    technicalView.axes.forEach((axis) => axis.setEnabled(enabled));
    realisticEnvironment.forEach((mesh) => mesh.setEnabled(!enabled));
    groundMesh.material = enabled ? technicalGroundMaterial : realisticGroundMaterial;
  };
  const onResetCamera = (): void => {
    camera.alpha = -Math.PI / 2;
    camera.beta = 1.25;
    camera.radius = 5.2;
  };
  gridButton.addEventListener("click", onToggleGrid);
  resetButton.addEventListener("click", onResetCamera);
}
