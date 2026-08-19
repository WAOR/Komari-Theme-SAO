import { createWriteStream, existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { finished } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const manifest = JSON.parse(readFileSync(resolve(root, "komari-theme.json"), "utf8"));
const version = manifest.version ?? "0.0.0";
const packageName = manifest.name ?? "Komari-Theme-SAO";
const outPath = resolve(root, `${packageName}-v${version}.zip`);
const ZIP_VERSION = 20;
const UTF8_FLAG = 0x0800;
const DEFLATE_METHOD = 8;
const DOS_EPOCH_DATE = 0x0021;

const CRC32_TABLE = new Uint32Array(256);
for (let n = 0; n < CRC32_TABLE.length; n++) {
  let value = n;
  for (let bit = 0; bit < 8; bit++) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  CRC32_TABLE[n] = value >>> 0;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function walk(dir, base = dir) {
  const out = [];
  const dirEntries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name, "en"),
  );
  for (const entry of dirEntries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, base));
    else if (entry.isFile()) out.push({ path: relative(base, full), full });
  }
  return out;
}

const distDir = resolve(root, "dist");
const previewPath = resolve(root, "preview.png");

for (const [path, hint] of [
  [previewPath, "run `node scripts/make-preview.mjs` (or `npm run package`) first"],
  [distDir, "run `npm run build` (or `npm run package`) first"],
]) {
  if (!existsSync(path)) {
    console.error(`package-zip: missing ${relative(root, path)} — ${hint}.`);
    process.exit(1);
  }
}

const entries = [
  { path: "komari-theme.json", full: resolve(root, "komari-theme.json") },
  { path: "preview.png", full: previewPath },
  ...walk(distDir, root),
];

const stream = createWriteStream(outPath);
let offset = 0;
const cdEntries = [];

for (const entry of entries) {
  const data = readFileSync(entry.full);
  const deflated = zlib.deflateRawSync(data, { level: 9 });
  const nameBuf = Buffer.from(entry.path.replace(/\\/g, "/"), "utf8");
  const crc = crc32(data);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(ZIP_VERSION, 4);
  local.writeUInt16LE(UTF8_FLAG, 6);
  local.writeUInt16LE(DEFLATE_METHOD, 8);
  local.writeUInt16LE(0, 10);
  local.writeUInt16LE(DOS_EPOCH_DATE, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(deflated.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  local.writeUInt16LE(0, 28);
  stream.write(local);
  stream.write(nameBuf);
  stream.write(deflated);
  cdEntries.push({
    nameBuf,
    crc,
    compSize: deflated.length,
    uncompSize: data.length,
    offset,
  });
  offset += 30 + nameBuf.length + deflated.length;
}

const cdStart = offset;
for (const e of cdEntries) {
  const cd = Buffer.alloc(46);
  cd.writeUInt32LE(0x02014b50, 0);
  cd.writeUInt16LE(ZIP_VERSION, 4);
  cd.writeUInt16LE(ZIP_VERSION, 6);
  cd.writeUInt16LE(UTF8_FLAG, 8);
  cd.writeUInt16LE(DEFLATE_METHOD, 10);
  cd.writeUInt16LE(0, 12);
  cd.writeUInt16LE(DOS_EPOCH_DATE, 14);
  cd.writeUInt32LE(e.crc, 16);
  cd.writeUInt32LE(e.compSize, 20);
  cd.writeUInt32LE(e.uncompSize, 24);
  cd.writeUInt16LE(e.nameBuf.length, 28);
  cd.writeUInt16LE(0, 30);
  cd.writeUInt16LE(0, 32);
  cd.writeUInt16LE(0, 34);
  cd.writeUInt16LE(0, 36);
  cd.writeUInt32LE(0, 38);
  cd.writeUInt32LE(e.offset, 42);
  stream.write(cd);
  stream.write(e.nameBuf);
  offset += 46 + e.nameBuf.length;
}

const cdSize = offset - cdStart;

const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);
eocd.writeUInt16LE(0, 4);
eocd.writeUInt16LE(0, 6);
eocd.writeUInt16LE(cdEntries.length, 8);
eocd.writeUInt16LE(cdEntries.length, 10);
eocd.writeUInt32LE(cdSize, 12);
eocd.writeUInt32LE(cdStart, 16);
eocd.writeUInt16LE(0, 20);
stream.write(eocd);
stream.end();
await finished(stream);
console.log(`Wrote ${outPath}`);
