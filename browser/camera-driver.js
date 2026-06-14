// camera-driver.js — camera-presets の wasm でカメラ tween を駆動するグルー例。
// framing/ease の計算は Almide(wasm)、Three.js カメラへの適用は JS。
//
//   const cam = await loadCamera("/camera.wasm");
//   cam.goto("full", camera, controls, vrm);   // プリセットへ tween 開始
//   // raf ループ内で cam.tick(camera, controls) を毎フレーム

const PRESETS = ["face", "upper", "full"];

export async function loadCamera(wasmUrl) {
  const bytes = await (await fetch(wasmUrl)).arrayBuffer();
  const mod = await WebAssembly.compile(bytes);
  const imports = {};
  for (const i of WebAssembly.Module.imports(mod)) (imports[i.module] ??= {})[i.name] = () => 0;
  const { exports: ex } = await WebAssembly.instantiate(mod, imports);
  try { ex._start(); } catch {}

  let tween = null; // { startT, dur, fromPos, fromTgt, toPos, toTgt }

  // VRM から head / hips ワールド座標 + 顔の向きを取る(プロジェクト依存。例)。
  function anchors(vrm) {
    const h = vrm.humanoid;
    const head = h.getNormalizedBoneNode("head").getWorldPosition(new THREE.Vector3());
    const hips = h.getNormalizedBoneNode("hips").getWorldPosition(new THREE.Vector3());
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(vrm.scene.quaternion).normalize();
    return [head, hips, fwd];
  }

  return {
    goto(name, camera, controls, vrm, durationMs = 600) {
      const p = PRESETS.indexOf(name);
      if (p < 0) return;
      const [head, hips, fwd] = anchors(vrm);
      const c = (ch) => ex.cam_component(p, ch, head.x, head.y, head.z, hips.x, hips.y, hips.z, fwd.x, fwd.y, fwd.z);
      tween = {
        startT: Date.now() / 1000, dur: durationMs / 1000,
        fromPos: camera.position.clone(), fromTgt: controls.target.clone(),
        toPos: new THREE.Vector3(c(0), c(1), c(2)),
        toTgt: new THREE.Vector3(c(3), c(4), c(5)),
      };
    },
    // raf ループで毎フレーム呼ぶ。
    tick(camera, controls) {
      if (!tween) return;
      const t = (Date.now() / 1000 - tween.startT) / tween.dur;
      if (t >= 1) {
        camera.position.copy(tween.toPos); controls.target.copy(tween.toTgt); controls.update();
        tween = null; return;
      }
      const k = ex.cam_ease(t);
      camera.position.lerpVectors(tween.fromPos, tween.toPos, k);
      controls.target.lerpVectors(tween.fromTgt, tween.toTgt, k);
      controls.update();
    },
  };
}
