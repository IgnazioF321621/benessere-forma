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

const STYLE = 'Flat vector illustration, side profile view body facing left, gender-neutral stylized figure, two-tone color palette teal and dark grey, white tank top and dark teal shorts, blank oval head with no facial features, no eyes no mouth no nose, minimalist fitness app icon style, clean white background, modern instructional graphic, full body shown, athletic build, simple geometric shapes, no shading';

const PROMPT_START = `${STYLE}, person standing upright with feet shoulder width apart, both arms bent at elbows at 90 degrees, fists held close to chest at sternum level, elbows pointing back behind body, resistance band stretched behind back at shoulder blade height, starting position of chest press exercise, ready to push forward`;

const PROMPT_END = `${STYLE}, person standing upright with feet shoulder width apart, both arms fully extended straight forward at shoulder height, fists clenched in front of chest, elbows almost locked, resistance band stretched and visible going behind back at shoulder blade height, end position of chest press exercise, peak contraction`;

const variants = [
  { name: 'chest_press_START', prompt: PROMPT_START },
  { name: 'chest_press_END', prompt: PROMPT_END }
];

const outDir = path.join(__dirname, 'test-output');
fs.mkdirSync(outDir, { recursive: true });

for (const v of variants) {
  console.log(`\n[${v.name}] Generating...`);
  const t0 = Date.now();

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: v.prompt, steps: 8, width: 768, height: 1024 })
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
  } catch (e) {
    console.error(`  EXCEPTION: ${e.message}`);
  }
}
