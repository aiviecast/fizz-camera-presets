// wasm-smoke.mjs — camera-presets の wasm が native と同じ framing/ease を出すか検証。
import { readFileSync } from "node:fs";
const mod = await WebAssembly.compile(readFileSync(new URL("../build/camera.wasm", import.meta.url)));
const imports = {};
for (const i of WebAssembly.Module.imports(mod)) (imports[i.module] ??= {})[i.name] = () => 0;
const { exports: ex } = await WebAssembly.instantiate(mod, imports);
try { ex._start(); } catch {}
const near = (a, b) => Math.abs(a - b) < 1e-4;
let ok = true;
const check = (n, got, want) => { if (!near(got, want)) { console.error(`FAIL ${n}: ${got} != ${want}`); ok = false; } };
// head=(0,1.4,0) hips=(0,0.9,0) fwd=(0,0,1)
const cam = (p, ch) => ex.cam_component(p, ch, 0, 1.4, 0, 0, 0.9, 0, 0, 0, 1);
check("face pos_z", cam(0, 2), 0.55);
check("face look_y", cam(0, 4), 1.4);
check("upper pos_y", cam(1, 1), 1.25);
check("full pos_z", cam(2, 2), 2.6);
check("full pos_y", cam(2, 1), 0.95);
check("ease 0.5", ex.cam_ease(0.5), 0.5);
check("ease 1", ex.cam_ease(1.0), 1.0);
if (ok) console.log("wasm OK — framing + ease match native");
else process.exit(1);
