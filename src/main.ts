import "./styles.css";
import "./conventions";
import { startApp } from "./app";

const canvas = document.querySelector<HTMLCanvasElement>("#renderCanvas");
const hud = document.querySelector<HTMLElement>("#hud");

if (!canvas || !hud) {
  throw new Error("Missing #renderCanvas or #hud in index.html");
}

startApp(canvas, hud).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  hud.textContent = `Failed to start simulator:\n${message}`;
  console.error(error);
});
