import fs from 'fs';

const BASE = 'https://oss.exercisedb.dev/api/v1/exercises';
const OUT = '/Users/ignaziofiorito/benessere-forma/scripts/exercisedb-catalog.json';
const DELAY_MS = 500;
const MAX_RETRIES = 6;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchPage(after) {
  const params = new URLSearchParams({ limit: '25' });
  if (after) params.set('after', after);
  let lastErr;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const backoff = Math.min(15000, 2000 * Math.pow(2, attempt - 1));
      console.log(`  retry ${attempt} in ${backoff}ms...`);
      await sleep(backoff);
    }
    const resp = await fetch(`${BASE}?${params.toString()}`);
    if (resp.ok) return resp.json();
    lastErr = `HTTP ${resp.status}`;
    if (resp.status !== 429 && resp.status < 500) {
      throw new Error(`${lastErr}: ${(await resp.text()).slice(0,200)}`);
    }
  }
  throw new Error(`Exhausted retries: ${lastErr}`);
}

const all = [];
const seen = new Set();
let after = null;
let page = 0;
const t0 = Date.now();

while (true) {
  page++;
  const json = await fetchPage(after);
  const data = json.data || [];
  let newCount = 0;
  for (const e of data) {
    const id = e.exerciseId || e.id;
    if (!seen.has(id)) { seen.add(id); all.push(e); newCount++; }
  }
  const meta = json.meta || {};
  console.log(`Page ${page}: +${newCount} new (running ${all.length} / target ${meta.total ?? '?'})`);

  fs.writeFileSync(OUT, JSON.stringify(all, null, 2));

  if (!meta.hasNextPage || !meta.nextCursor || newCount === 0) break;
  after = meta.nextCursor;
  await sleep(DELAY_MS);
}

console.log(`\nDone in ${((Date.now()-t0)/1000).toFixed(1)}s. Total unique: ${all.length}`);
console.log(`Saved -> ${OUT}`);
