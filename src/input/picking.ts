import type { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Ray } from "@babylonjs/core/Culling/ray";
import "@babylonjs/core/Culling/ray";

export interface DronePick {
  point: Vector3;
  componentName: string;
}

export function pickDroneAtPointer(
  scene: Scene,
  camera: ArcRotateCamera,
  canvas: HTMLCanvasElement,
  droneRoot: TransformNode,
  event: PointerEvent,
): DronePick | null {
  const bounds = canvas.getBoundingClientRect();
  if (bounds.width === 0 || bounds.height === 0) {
    return null;
  }
  const x = ((event.clientX - bounds.left) / bounds.width) * scene.getEngine().getRenderWidth();
  const y = ((event.clientY - bounds.top) / bounds.height) * scene.getEngine().getRenderHeight();
  const picked = scene.pick(x, y, (mesh) => mesh.parent === droneRoot, false, camera);
  if (!picked?.hit || !picked.pickedMesh || !picked.pickedPoint) {
    return null;
  }
  return { point: picked.pickedPoint.clone(), componentName: picked.pickedMesh.name };
}

export function cursorRay(
  scene: Scene,
  camera: ArcRotateCamera,
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): Ray | null {
  const bounds = canvas.getBoundingClientRect();
  if (bounds.width === 0 || bounds.height === 0) {
    return null;
  }
  // Convert CSS pointer coordinates to render coordinates before creating the camera ray.
  const x = ((clientX - bounds.left) / bounds.width) * scene.getEngine().getRenderWidth();
  const y = ((clientY - bounds.top) / bounds.height) * scene.getEngine().getRenderHeight();
  return scene.createPickingRay(x, y, Matrix.Identity(), camera);
}
