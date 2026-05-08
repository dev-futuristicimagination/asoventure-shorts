// test-resvg.mjs - in asoventure-shorts directory
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// CJS require でロード
const resvgPkg = require('@resvg/resvg-wasm');
console.log('exports:', Object.keys(resvgPkg));

const wasmPath = require.resolve('@resvg/resvg-wasm/index_bg.wasm');
console.log('wasm path:', wasmPath);

const wasmBuf = readFileSync(wasmPath);
console.log('wasm size:', wasmBuf.length);

try {
  await resvgPkg.initWasm(wasmBuf);
  console.log('initWasm: OK');
  
  const svg = '<svg width="50" height="50" xmlns="http://www.w3.org/2000/svg"><rect width="50" height="50" fill="red"/></svg>';
  const resvg = new resvgPkg.Resvg(svg);
  const rendered = resvg.render();
  const png = rendered.asPng();
  console.log('PNG bytes:', png.length, ' ✅ WORKS!');
} catch(e) {
  console.error('FAIL:', e.message);
}
