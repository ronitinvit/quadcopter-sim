import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import type { PhysicsBody } from "@babylonjs/core/Physics/v2/physicsBody";
import type { Scene } from "@babylonjs/core/scene";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { pickDroneAtPointer } from "./picking";
import type { InteractionModes } from "./interactionModes";
import {
  IMPACT_MAX_IMPULSE_NS,
  IMPACT_MAX_SWIPE_PX,
  IMPACT_MIN_IMPULSE_NS,
  IMPACT_MIN_SWIPE_PX,
} from "../config";

export type { InteractionMode } from "./interactionModes";

export interface ImpactEvent {
  componentName: string;
  impulseNs: Vector3;
  magnitudeNs: number;
  worldPoint: Vector3;
  atMs: number;
}

interface SwipeGesture {
  pointerId: number;
  startX: number;
  startY: number;
  hitPoint: Vector3 | null;
  componentName: string | null;
}

export function bindImpactControl(
  scene: Scene,
  camera: ArcRotateCamera,
  canvas: HTMLCanvasElement,
  droneRoot: TransformNode,
  body: PhysicsBody,
  modes: InteractionModes,
): {
  lastImpact: () => ImpactEvent | null;
  dispose: () => void;
} {
  let gesture: SwipeGesture | null = null;
  let last: ImpactEvent | null = null;
  let feedbackMeshes: Array<{ dispose: () => void }> = [];
  let feedbackTimer: number | undefined;

  const pickDrone = (event: PointerEvent): { point: Vector3; componentName: string } | null => {
    return pickDroneAtPointer(scene, camera, canvas, droneRoot, event);
  };

  const updateGestureHit = (event: PointerEvent, current: SwipeGesture): void => {
    const hit = pickDrone(event);
    if (hit) {
      current.hitPoint = hit.point;
      current.componentName = hit.componentName;
    }
  };

  const clearFeedback = (): void => {
    if (feedbackTimer !== undefined) {
      window.clearTimeout(feedbackTimer);
      feedbackTimer = undefined;
    }
    for (const mesh of feedbackMeshes) {
      mesh.dispose();
    }
    feedbackMeshes = [];
  };

  const showFeedback = (point: Vector3, direction: Vector3, magnitudeNs: number): void => {
    clearFeedback();
    const markerMaterial = new StandardMaterial("impactMarkerMaterial", scene);
    markerMaterial.emissiveColor = new Color3(1, 0.35, 0.08);
    const marker = MeshBuilder.CreateSphere("impactPoint", { diameter: 0.045, segments: 12 }, scene);
    marker.position.copyFrom(point);
    marker.material = markerMaterial;
    marker.isPickable = false;

    const side = Vector3.Cross(direction, camera.getDirection(Vector3.Up())).normalize();
    if (side.lengthSquared() < 1e-6) {
      side.copyFrom(camera.getDirection(Vector3.Right())).normalize();
    }
    const arrowLength = 0.2 + (magnitudeNs / IMPACT_MAX_IMPULSE_NS) * 0.45;
    const tip = point.add(direction.scale(arrowLength));
    const headLength = arrowLength * 0.22;
    const headHalfWidth = headLength * 0.55;
    const arrowBase = tip.subtract(direction.scale(headLength));
    const lines = MeshBuilder.CreateLineSystem(
      "impactDirection",
      {
        lines: [
          [point, tip],
          [tip, arrowBase.add(side.scale(headHalfWidth))],
          [tip, arrowBase.subtract(side.scale(headHalfWidth))],
        ],
      },
      scene,
    );
    lines.color = new Color3(1, 0.35, 0.08);
    lines.isPickable = false;

    feedbackMeshes = [marker, markerMaterial, lines];
    feedbackTimer = window.setTimeout(clearFeedback, 2000);
  };

  const finishGesture = (event: PointerEvent): void => {
    if (!gesture || event.pointerId !== gesture.pointerId) {
      return;
    }
    const current = gesture;
    updateGestureHit(event, current);
    gesture = null;

    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    const swipeDistance = Math.hypot(dx, dy);
    if (
      !current.hitPoint ||
      !current.componentName ||
      swipeDistance < IMPACT_MIN_SWIPE_PX
    ) {
      return;
    }

    // Map screen-right and screen-up swipe distance into the camera's world-space basis.
    const direction = camera
      .getDirection(Vector3.Right())
      .scale(dx)
      .add(camera.getDirection(Vector3.Up()).scale(-dy))
      .normalize();
    const clampedDistance = Math.min(swipeDistance, IMPACT_MAX_SWIPE_PX);
    const impulseMagnitude =
      IMPACT_MIN_IMPULSE_NS +
      ((clampedDistance - IMPACT_MIN_SWIPE_PX) /
        (IMPACT_MAX_SWIPE_PX - IMPACT_MIN_SWIPE_PX)) *
        (IMPACT_MAX_IMPULSE_NS - IMPACT_MIN_IMPULSE_NS);
    const impulse = direction.scale(impulseMagnitude);

    // Physics V2 expects an impulse in N·s and its contact point in world coordinates.
    body.applyImpulse(impulse, current.hitPoint);
    last = {
      componentName: current.componentName,
      impulseNs: impulse.clone(),
      magnitudeNs: impulseMagnitude,
      worldPoint: current.hitPoint.clone(),
      atMs: performance.now(),
    };
    showFeedback(current.hitPoint, direction, impulseMagnitude);
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (modes.mode() !== "impact" || event.button !== 0 || gesture) {
      return;
    }
    event.preventDefault();
    gesture = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      hitPoint: null,
      componentName: null,
    };
    updateGestureHit(event, gesture);
    canvas.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (modes.mode() === "impact" && gesture?.pointerId === event.pointerId) {
      updateGestureHit(event, gesture);
    }
  };

  const onPointerUp = (event: PointerEvent): void => {
    if (modes.mode() === "impact") {
      finishGesture(event);
    }
  };

  const onPointerCancel = (): void => {
    gesture = null;
  };

  const unsubscribeMode = modes.onChange((mode) => {
    if (mode !== "impact") {
      gesture = null;
    }
  });
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerCancel);

  return {
    lastImpact: () => last,
    dispose: () => {
      unsubscribeMode();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      clearFeedback();
    },
  };
}
