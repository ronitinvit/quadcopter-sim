import HavokPhysics from "@babylonjs/havok";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";

/**
 * Documented npm initialization: load the WASM module, then construct HavokPlugin.
 * Vite WASM workarounds are added only if this path fails at runtime.
 */
export async function createHavokPlugin(): Promise<HavokPlugin> {
  const havok = await HavokPhysics();
  return new HavokPlugin(true, havok);
}
