import fs from 'node:fs/promises';

const tsPath = './dist/dedent.d.ts';
const mtsPath = './dist/dedent.d.mts';

const source = await fs.readFile(tsPath, 'utf8');

await fs.writeFile(tsPath, source.replace('export default', 'export ='));
await fs.writeFile(mtsPath, source);
