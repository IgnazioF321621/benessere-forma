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
const MODEL = '@cf/bytedance/stable-diffusion-xl-lightning';

if (!ACCOUNT_ID || !API_TOKEN) {
  console.error('Missing CF_ACCOUNT_ID or CF_API_TOKEN in .env.local');
  process.exit(1);
}

const prompt = '3D render of athletic male figure performing standing chest press exercise with resistance band, band anchored behind back at shoulder height, both hands pushing forward at chest level, side view, plain white background, clean fitness app illustration style, neutral grey skin tone, no facial features, soft studio lighting, anatomically correct, full body visible';

console.log('Generating image...');
console.log('Model:', MODEL);
console.log('Prompt:', prompt.substring(0, 80) + '...');

const response = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${MODEL}`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prompt, num_steps: 4 })
  }
);

if (!response.ok) {
  const err = await response.text();
  console.error('ERROR', response.status, err);
  process.exit(1);
}

const buffer = Buffer.from(await response.arrayBuffer());
const outPath = path.join(__dirname, 'test-output', 'chest-press-test.png');
fs.writeFileSync(outPath, buffer);
console.log('OK Saved:', outPath);
console.log('   Size:', (buffer.length / 1024).toFixed(1), 'KB');
