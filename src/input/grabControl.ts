import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import type { PhysicsBody } from "@babylonjs/core/Physics/v2/physicsBody";
import type { Scene } from "@babylonjs/core/scene";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import {
  GRAB_DAMPING_NS_PER_M,
  GRAB_MAX_CURSOR_DISTANCE_M,
  GRAB_MAX_FORCE_N,
  GRAB_STIFFNESS_N_PER_M,
} from "../config";
import type { InteractionModes } from "./interactionModes";
import { cursorRay, pickDroneAtPointer } from "./picking";

interface ActiveGrab {
  pointerId: number;
  componentName: string;
  localPoint: Vector3;
  planePoint: Vector3;
  planeNormal: Vector3;
  targetPoint: Vector3;
}

export function bindGrabControl(
  scene: Scene,
  camera: ArcRotateCamera,
  canvas: HTMLCanvasElement,
  droneRoot: TransformNode,
  body: PhysicsBody,
  modes: InteractionModes,
): {
  isGrabbing: () => boolean;
  dispose: () => void;
} {
  let activeGrab: ActiveGrab | null = null;
  let marker: Mesh | null = null;
  let indicator: LinesMesh | null = null;
  let markerMaterial: StandardMaterial | null = null;

  const getWorldGrabPoint = (grab: ActiveGrab): Vector3 => {
    return Vector3.TransformCoordinates(grab.localPoint, droneRoot.computeWorldMatrix(true));
  };

  const updateTarget = (event: PointerEvent, grab: ActiveGrab): void => {
    const ray = cursorRay(scene, camera, canvas, event.clientX, event.clientY);
    if (!ray) {
      return;
    }
    // Intersect the cursor ray with the fixed plane through the initial hit point.
    const denominator = Vector3.Dot(ray.direction, grab.planeNormal);
    if (Math.abs(denominator) < 1e-5) {
      return;
    }
    const distance = Vector3.Dot(
      grab.planePoint.subtract(ray.origin),
      grab.planeNormal,
    ) / denominator;
    if (distance < 0) {
      return;
    }
    const target = ray.origin.add(ray.direction.scale(distance));
    const offset = target.subtract(grab.planePoint);
    if (offset.length() > GRAB_MAX_CURSOR_DISTANCE_M) {
      offset.normalize().scaleInPlace(GRAB_MAX_CURSOR_DISTANCE_M);
      target.copyFrom(grab.planePoint.add(offset));
    }
    grab.targetPoint.copyFrom(target);
  };

  const clearVisuals = (): void => {
    marker?.dispose();
    indicator?.dispose();
    markerMaterial?.dispose();
    marker = null;
    indicator = null;
    markerMaterial = null;
  };

  const releaseGrab = (): void => {
    const grab = activeGrab;
    if (!grab) {
      return;
    }
    activeGrab = null;
    if (canvas.hasPointerCapture(grab.pointerId)) {
      canvas.releasePointerCapture(grab.pointerId);
    }
    clearVisuals();
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (modes.mode() !== "grab" || event.button !== 0 || activeGrab) {
      return;
    }
    const picked = pickDroneAtPointer(scene, camera, canvas, droneRoot, event);
    if (!picked) {
      return;
    }
    event.preventDefault();
    const worldMatrix = droneRoot.computeWorldMatrix(true);
    const inverseWorldMatrix = worldMatrix.clone().invert();
    const localPoint = Vector3.TransformCoordinates(picked.point, inverseWorldMatrix);
    const planeNormal = camera.getDirection(Vector3.Forward()).normalize();
    activeGrab = {
      pointerId: event.pointerId,
      componentName: picked.componentName,
      localPoint,
      planePoint: picked.point.clone(),
      planeNormal,
      targetPoint: picked.point.clone(),
    };
    markerMaterial = new StandardMaterial("grabMarkerMaterial", scene);
    markerMaterial.emissiveColor = new Color3(0.15, 0.9, 1);
    marker = MeshBuilder.CreateSphere("grabPoint", { diameter: 0.05, segments: 12 }, scene);
    marker.material = markerMaterial;
    marker.isPickable = false;
    indicator = MeshBuilder.CreateLines(
      "grabTargetIndicator",
      { points: [picked.point, picked.point], updatable: true },
      scene,
    );
    indicator.color = new Color3(0.15, 0.9, 1);
    indicator.isPickable = false;
    canvas.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (modes.mode() === "grab" && activeGrab?.pointerId === event.pointerId) {
      updateTarget(event, activeGrab);
    }
  };

  const onPointerUp = (event: PointerEvent): void => {
    if (activeGrab?.pointerId === event.pointerId) {
      releaseGrab();
    }
  };

  const onPointerCancel = (event: PointerEvent): void => {
    if (activeGrab?.pointerId === event.pointerId) {
      releaseGrab();
    }
  };

  const onLostPointerCapture = (event: PointerEvent): void => {
    if (activeGrab?.pointerId === event.pointerId) {
      releaseGrab();
    }
  };

  const onWindowBlur = (): void => releaseGrab();
  const onVisibilityChange = (): void => {
    if (document.visibilityState === "hidden") {
      releaseGrab();
    }
  };

  const beforePhysics = scene.onBeforePhysicsObservable.add(() => {
    const grab = activeGrab;
    if (!grab) {
      return;
    }
    const worldPoint = getWorldGrabPoint(grab);
    const center = body.getObjectCenterWorld();
    const linearVelocity = body.getLinearVelocity();
    const angularVelocity = body.getAngularVelocity();
    const pointVelocity = linearVelocity.add(
      Vector3.Cross(angularVelocity, worldPoint.subtract(center)),
    );
    const displacement = grab.targetPoint.subtract(worldPoint);
    const force = displacement
      .scale(GRAB_STIFFNESS_N_PER_M)
      .subtract(pointVelocity.scale(GRAB_DAMPING_NS_PER_M));
    const forceMagnitude = force.length();
    if (forceMagnitude > GRAB_MAX_FORCE_N) {
      force.scaleInPlace(GRAB_MAX_FORCE_N / forceMagnitude);
    }
    // Physics V2 takes force in newtons and the application point in world meters.
    body.applyForce(force, worldPoint);
  });

  const beforeRender = scene.onBeforeRenderObservable.add(() => {
    const grab = activeGrab;
    if (!grab || !marker || !indicator) {
      return;
    }
    const point = getWorldGrabPoint(grab);
    marker.position.copyFrom(point);
    MeshBuilder.CreateLines(
      "grabTargetIndicator",
      { points: [point, grab.targetPoint], instance: indicator },
      scene,
    );
  });

  const unsubscribeMode = modes.onChange((mode) => {
    if (mode !== "grab") {
      releaseGrab();
    }
  });

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("lostpointercapture", onLostPointerCapture);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerCancel);
  window.addEventListener("blur", onWindowBlur);
  document.addEventListener("visibilitychange", onVisibilityChange);

  return {
    isGrabbing: () => activeGrab !== null,
    dispose: () => {
      unsubscribeMode();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("lostpointercapture", onLostPointerCapture);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      scene.onBeforePhysicsObservable.remove(beforePhysics);
      scene.onBeforeRenderObservable.remove(beforeRender);
      releaseGrab();
    },
  };
}
