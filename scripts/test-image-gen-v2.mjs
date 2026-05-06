import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = Object.fromEntries(
  envFile
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);
const ACCOUNT_ID = env.CF_ACCOUNT_ID;
const API_TOKEN = env.CF_API_TOKEN;

const PROMPT_DESCRIPTIVE = '3D render of athletic male figure performing standing chest press exercise with resistance band, band anchored behind back at shoulder height, both hands pushing forward at chest level, side view, plain white background, clean fitness app illustration style, neutral grey skin tone, no facial features, soft studio lighting, anatomically correct, full body visible';

const PROMPT_ANATOMICAL = 'Anatomical exercise illustration, male figure shown from the side, arms fully extended forward at chest height, fists clenched holding band handles, elbows nearly straight, resistance band visible going behind body anchored at shoulder height, simple 3D rendered figure, faceless mannequin head, instructional fitness manual style, white background, full body visible';

const NEGATIVE = 'face, facial features, eyes, mouth, looking at camera, frontal view, photorealistic skin, tattoos, text, watermark';

const variants = [
  {
    name: 'A_flux_schnell',
    model: '@cf/black-forest-labs/flux-1-schnell',
    body: { prompt: PROMPT_DESCRIPTIVE, steps: 8 }
  },
  {
    name: 'B_sdxl_base',
    model: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    body: { prompt: PROMPT_DESCRIPTIVE, negative_prompt: NEGATIVE, num_steps: 20 }
  },
  {
    name: 'C_lightning_anatomical',
    model: '@cf/bytedance/stable-diffusion-xl-lightning',
    body: { prompt: PROMPT_ANATOMICAL, negative_prompt: NEGATIVE, num_steps: 4 }
  }
];

const outDir = path.join(__dirname, 'test-output');
fs.mkdirSync(outDir, { recursive: true });

for (const v of variants) {
  console.log(`\n[${v.name}] Calling ${v.model}...`);
  const t0 = Date.now();

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${v.model}`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(v.body)
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error(`  ERROR ${response.status}: ${err.substring(0, 200)}`);
      continue;
    }

    const ct = response.headers.get('content-type') || '';
    let buffer;
    let ext = 'jpg';

    if (ct.includes('application/json')) {
      const json = await response.json();
      if (json.result && json.result.image) {
        buffer = Buffer.from(json.result.image, 'base64');
      } else {
        console.error('  Unexpected JSON:', JSON.stringify(json).substring(0, 300));
        continue;
      }
    } else {
      buffer = Buffer.from(await response.arrayBuffer());
    }

    const outPath = path.join(outDir, `${v.name}.${ext}`);
    fs.writeFileSync(outPath, buffer);
    console.log(`  OK Saved ${(buffer.length / 1024).toFixed(1)} KB in ${Date.now() - t0}ms`);
    console.log(`  -> ${outPath}`);
  } catch (e) {
    console.error(`  EXCEPTION: ${e.message}`);
  }
}

console.log('\nDone.');
