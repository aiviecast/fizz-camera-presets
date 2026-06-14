# fizz-camera-presets

Fizz の **カメラプリセット計算コア**。プリセット(face/upper/full)と、アバターの
head/hips のワールド座標 + 顔の向き(forward)から、目標カメラ位置と注視点を計算し、
tween 用の `easeInOutCubic` を提供する。

ブラウザは VRM から head/hips/forward を取り、ここで目標カメラ pos/look を得て、現在
位置から `ease(t)` で lerp して Three.js カメラに適用する(適用 = I/O は JS)。lipsync
/ idle / gesture と同じく計算コアを Almide で 1 回書き、native と wasm で使う。
移植元: openaituber `src/vrm/scene.ts`。

## プリセット / 成分

| preset | | ch |
|---|---|---|
| 0 face (顔アップ) | | 0..2 pos x/y/z |
| 1 upper (上半身) | | 3..5 look x/y/z |
| 2 full (全身) | | |

- **face**: pos = head + forward·0.55、look = head
- **upper**: pos = head + forward·1.4(y は head.y-0.15 に固定)、look = head の少し下
- **full**: pos = hips + forward·2.6(y は hips.y+0.05)、look = hips

## ① native — tween 軌跡の precompute / 確認

```sh
almide build src/main.almd -o build/fizz-camera-presets
FIZZ_CAMERA=2 FIZZ_CAMERA_FPS=30 ./build/fizz-camera-presets   # 2 = full
# {"t":0,"x":0,"y":1.4,"z":2.5} … ease で目標へ
```

## ② wasm — カメラ tween

```sh
almide build src/bridge.almd --target wasm -o build/camera.wasm
```

エクスポート: `cam_component(preset, ch, head xyz, hips xyz, fwd xyz) -> Float` /
`cam_ease(t) -> Float`。引数は Float(JS から number で呼べる)。ブラウザ側グルー例は
[`browser/camera-driver.js`](./browser/camera-driver.js):

```js
const cam = await loadCamera("/camera.wasm");
cam.goto("full", camera, controls, vrm);   // プリセットへ tween
// raf ループ内で cam.tick(camera, controls);
```

wasm が native と一致することを CI(`test/wasm-smoke.mjs`)で検証。

## 開発

```sh
almide check src/main.almd
almide test spec/camera_presets_test.almd
almide build src/main.almd -o build/fizz-camera-presets
almide build src/bridge.almd --target wasm -o build/camera.wasm
```

ツールチェーン: [almide](https://github.com/almide/almide) v0.27.6+。依存なし。
