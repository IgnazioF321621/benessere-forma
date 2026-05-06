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

const PROMPT = 'Flat vector illustration of a person performing standing chest press exercise with resistance band, side profile view, simple geometric shapes, gender-neutral stylized figure, two-tone color palette teal and dark grey, resistance band shown as clear line going behind back at shoulder height, both arms extended forward at chest level, elbows slightly bent, minimalist fitness app icon style, clean white background, no facial features just a simple oval head, modern instructional graphic, full body shown, athletic shorts and tank top';

const NEGATIVE = 'photo, photorealistic, 3D render, anatomy details, muscles, face, eyes, mouth, realistic skin, complex shading, gradients, multiple people, gym equipment machines, weights, dumbbells';

const variants = [
  {
    name: 'flat_vector_v1',
    model: '@cf/black-forest-labs/flux-1-schnell',
    body: { prompt: PROMPT, steps: 8, width: 768, height: 1024 }
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
      console.error(`  ERROR ${response.status}: ${err.substring(0, 300)}`);
      continue;
    }

    const ct = response.headers.get('content-type') || '';
    let buffer;

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

    const outPath = path.join(outDir, `${v.name}.jpg`);
    fs.writeFileSync(outPath, buffer);
    console.log(`  OK Saved ${(buffer.length / 1024).toFixed(1)} KB in ${Date.now() - t0}ms`);
    console.log(`  -> ${outPath}`);
  } catch (e) {
    console.error(`  EXCEPTION: ${e.message}`);
  }
}
