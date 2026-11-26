// main.ts
// Dependency-free TypeScript: generates a single 1024x1024 PNG invitation
// letter, drawn onto a pixel buffer with a custom 5x7 bitmap font and
// encoded with a hand-rolled PNG encoder (zlib deflateSync + own CRC32).
// No network, no external assets, no npm packages. Runs with Node 22 type
// stripping: node main.ts
import * as zlib from 'node:zlib';
import * as fs from 'node:fs';

const W = 1024;
const H = 1024;

const img = new Uint8Array(W * H * 3);

function pset(x: number, y: number, r: number, g: number, b: number): void {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 3;
  img[i] = r;
  img[i + 1] = g;
  img[i + 2] = b;
}

const CREAM: number[] = [253, 247, 226];
const HOUSE: number[] = [249, 242, 210];
const TEAL: number[] = [14, 72, 88];
const TEAL_DARK: number[] = [8, 48, 58];
const INK: number[] = [28, 32, 36];
const RED: number[] = [200, 60, 60];
const AMBER: number[] = [228, 158, 30];
const MUG: number[] = [240, 228, 200];
const STEAM: number[] = [214, 212, 200];

function fill(r: number, g: number, b: number): void {
  for (let i = 0; i < img.length; i += 3) {
    img[i] = r;
    img[i + 1] = g;
    img[i + 2] = b;
  }
}

function line(x0: number, y0: number, x1: number, y1: number, c: number[]): void {
  let x = x0 | 0;
  let y = y0 | 0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    pset(x, y, c[0], c[1], c[2]);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}

function rect(x: number, y: number, w: number, h: number, c: number[], fillC?: number[]): void {
  if (fillC) {
    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) {
        pset(px, py, fillC[0], fillC[1], fillC[2]);
      }
    }
  }
  line(x, y, x + w - 1, y, c);
  line(x, y + h - 1, x + w - 1, y + h - 1, c);
  line(x, y, x, y + h - 1, c);
  line(x + w - 1, y, x + w - 1, y + h - 1, c);
}

// Seeded PRNG: deterministic hand-drawn wobble for the border.
let prng = 0xC0FFEE13;
function rnd(): number {
  prng = (prng * 1664525 + 1013904223) >>> 0;
  return (prng >>> 16) / 65536;
}
function jit(): number {
  return Math.floor((rnd() - 0.5) * 5) | 0;
}

function wobblyRect(x: number, y: number, w: number, h: number, c: number[]): void {
  line(x + jit(), y + jit(), x + w + jit(), y + jit(), c);
  line(x + jit(), y + h + jit(), x + w + jit(), y + h + jit(), c);
  line(x + jit(), y + jit(), x + jit(), y + h + jit(), c);
  line(x + w + jit(), y + jit(), x + w + jit(), y + h + jit(), c);
}

// ---------- 5x7 bitmap font (A-Z, a-z, 0-9, punctuation) ----------
const GLYPHS: Record<string, string[]> = {
  ' ': [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  '!': ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  '"': [".#.#.", ".#.#.", ".....", ".....", ".....", ".....", "....."],
  '#': ["..#..", ".#.#.", "..#..", ".#.#.", "..#..", ".....", "....."],
  '%': ["#...#", "#.#..", "..#..", "..#..", ".#.#.", "#...#", "....."],
  '&': [".###.", "#...#", ".##..", "..#.#", "#...#", "#...#", ".###."],
  "'": [".#...", ".#...", ".....", ".....", ".....", ".....", "....."],
  '(': ["..#..", ".#...", ".#...", ".#...", ".#...", ".#...", "..#.."],
  ')': ["..#..", "...#.", "...#.", "...#.", "...#.", "...#.", "..#.."],
  ',': [".....", ".....", ".....", ".....", ".....", "..#..", ".#..."],
  '-': [".....", ".....", ".....", ".###.", ".....", ".....", "....."],
  '.': [".....", ".....", ".....", ".....", ".....", "..#..", "..#.."],
  '/': ["#....", ".#...", "..#..", "...#.", "....#", ".....", "....."],
  '0': [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  '1': ["...#.", "..##.", ".#.#.", "...#.", "...#.", "...#.", ".###."],
  '2': [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  '3': [".###.", "#...#", "....#", "..##.", "....#", "#...#", ".###."],
  '4': ["#...#", "#...#", "#...#", "#####", "....#", "....#", "....#"],
  '5': ["#####", "#....", "#....", ".####", "....#", "#...#", ".###."],
  '6': [".###.", "#....", "#....", ".####", "#...#", "#...#", ".###."],
  '7': ["#####", "...#.", "..#..", ".#...", ".#...", ".#...", ".#..."],
  '8': [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  '9': [".###.", "#...#", "#...#", ".####", "....#", "#...#", ".###."],
  ':': [".....", ".....", "..#..", ".....", "..#..", ".....", "....."],
  ';': [".....", ".....", "..#..", ".....", "..#..", "..#..", ".#..."],
  '<': [".....", "...#.", "..#..", ".#...", "..#..", "...#.", "....."],
  '=': [".....", ".....", ".###.", ".....", ".###.", ".....", "....."],
  '>': [".....", ".#...", "..#..", "...#.", "..#..", ".#...", "....."],
  '?': [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  '@': ["..###", ".#..#", "#...#", "#.##.", "#...#", "#...#", ".###."],
  'A': ["..#..", ".#.#.", "#...#", "#...#", "#####", "#...#", "#...#"],
  'B': ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  'C': [".###.", "#....", "#....", "#....", "#....", "#....", ".###."],
  'D': ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  'E': ["#####", "#....", "#....", "###..", "#....", "#....", "#####"],
  'F': ["#####", "#....", "#....", "###..", "#....", "#....", "#...."],
  'G': [".###.", "#....", "#....", "#.#..", "#...#", "#...#", ".###."],
  'H': ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  'I': [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  'J': ["....#", "....#", "....#", "....#", "#...#", "#...#", ".###."],
  'K': ["#...#", "##...", "#.#..", "#..#.", "#.#..", "##...", "#...#"],
  'L': ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  'M': ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  'N': ["#...#", "##..#", "#.#.#", "#..##", "#..##", "#...#", "#...#"],
  'O': [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  'P': ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  'Q': [".###.", "#...#", "#...#", "#...#", "#...#", "#..##", ".###."],
  'R': ["####.", "#...#", "#...#", "####.", "#.#..", "#.#..", "#..#."],
  'S': [".###.", "#....", "#....", ".###.", "....#", "#...#", ".###."],
  'T': ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  'U': ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  'V': ["#...#", "#...#", ".#.#.", ".#.#.", ".#.#.", "..#..", "..#.."],
  'W': ["#...#", "#...#", ".#.#.", ".#.#.", ".#.#.", ".#.#.", "#...#"],
  'X': ["#...#", ".#.#.", "..#..", ".#.#.", "#...#", ".....", "....."],
  'Y': ["#...#", ".#.#.", "..#..", "..#..", "..#..", "..#..", "..#.."],
  'Z': ["#####", "...#.", "..#..", ".#.#.", "#...#", "#...#", "#####"],
  'a': [".....", ".....", ".##..", "#..#.", "####.", "....#", ".###."],
  'b': ["#....", "#....", ".##..", "#...#", "#...#", ".##..", "#...."],
  'c': [".....", ".....", ".###.", "#....", "#....", "#....", ".###."],
  'd': ["....#", "....#", ".##..", ".#..#", ".#..#", ".##..", "....#"],
  'e': [".....", ".....", ".###.", "#....", "####.", "#...#", ".###."],
  'f': ["..#..", "..#..", "###..", "#....", "#....", "..#..", "....."],
  'g': [".....", ".....", ".###.", "#...#", "#...#", ".###.", "##..."],
  'h': [".....", "#....", ".##..", "#...#", "#...#", "#...#", "#...."],
  'i': [".#...", ".....", ".#...", ".#...", ".#...", ".#...", "....."],
  'j': ["....#", "....#", "....#", "....#", "....#", ".#...", ".#..."],
  'k': ["#....", "##...", "#.#..", "#..#.", "#.#..", "##...", "#...."],
  'l': [".#...", ".#...", ".#...", ".#...", ".#...", ".#...", ".#..."],
  'm': [".....", ".....", ".###.", "#.#.#", "#.#.#", "#.#.#", "#.#.#"],
  'n': [".....", ".....", ".##..", "#..#.", "#..#.", "#..#.", "....."],
  'o': [".....", ".....", ".###.", "#...#", "#...#", ".###.", "....."],
  'p': [".....", ".....", ".##..", "#...#", "#...#", ".##..", "#...."],
  'q': [".....", ".....", ".##..", "#...#", "#...#", ".##..", "....#"],
  'r': [".....", ".....", ".##..", "#....", "#....", "#....", "#...."],
  's': [".....", ".....", ".###.", "#....", ".###.", "....#", ".###."],
  't': ["..#..", "..#..", "..#..", ".###.", "..#..", "..#..", "....."],
  'u': [".....", ".....", "#...#", "#...#", "#...#", "#...#", ".###."],
  'v': [".....", ".....", "#...#", "#...#", ".#.#.", ".#.#.", "..#.."],
  'w': [".....", ".....", "#...#", "#...#", ".#.#.", ".#.#.", "#...#"],
  'x': [".....", ".....", "#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
  'y': [".....", ".....", "#...#", "#...#", ".#.#.", "..#..", ".#..."],
  'z': [".....", ".....", "#####", "...#.", "..#..", ".#...", "#####"],
};

const FONT: Record<string, number[]> = {};
for (const ch of Object.keys(GLYPHS)) {
  const rows = GLYPHS[ch];
  const cols = [0, 0, 0, 0, 0];
  for (let cx = 0; cx < 5; cx++) {
    let bits = 0;
    for (let cy = 0; cy < 7; cy++) {
      if (rows[cy][cx] === '#') bits |= 1 << (6 - cy);
    }
    cols[cx] = bits;
  }
  FONT[ch] = cols;
}

function charAdvance(scale: number): number {
  return 5 * scale + scale; // glyph cell plus inter-character gap
}

function measure(text: string, scale: number): number {
  let w = 0;
  for (const ch of text) {
    if (FONT[ch]) w += charAdvance(scale);
  }
  return w > 0 ? w - scale : 0;
}

function drawChar(x: number, y: number, ch: string, scale: number, c: number[]): void {
  const cols = FONT[ch];
  if (!cols) return;
  const r = c[0], g = c[1], b = c[2];
  for (let cx = 0; cx < 5; cx++) {
    const bits = cols[cx];
    for (let cy = 0; cy < 7; cy++) {
      if ((bits >> (6 - cy)) & 1) {
        const bx = x + cx * scale;
        const by = y + cy * scale;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            pset(bx + dx, by + dy, r, g, b);
          }
        }
      }
    }
  }
}

function drawText(x: number, y: number, text: string, scale: number, c: number[]): void {
  let cx = x;
  const r = c[0], g = c[1], b = c[2];
  for (const ch of text) {
    const cols = FONT[ch];
    if (cols) {
      for (let gx = 0; gx < 5; gx++) {
        const bits = cols[gx];
        for (let gy = 0; gy < 7; gy++) {
          if ((bits >> (6 - gy)) & 1) {
            for (let dy = 0; dy < scale; dy++) {
              for (let dx = 0; dx < scale; dx++) {
                pset(cx + gx * scale + dx, y + gy * scale + dy, r, g, b);
              }
            }
          }
        }
      }
    }
    cx += charAdvance(scale);
  }
}

function wrap(text: string, scale: number, maxW: number): string[] {
  const lines: string[] = [];
  const words = text.split(' ');
  let cur = '';
  for (const w of words) {
    const trial = cur ? cur + ' ' + w : w;
    if (measure(trial, scale) <= maxW || cur === '') {
      cur = trial;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== '') lines.push(cur);
  return lines;
}

function drawBlock(x: number, y: number, text: string, scale: number, c: number[], maxW: number, gap: number): number {
  const lines = wrap(text, scale, maxW);
  let cy = y;
  for (const ln of lines) {
    drawText(x, cy, ln, scale, c);
    cy += 7 * scale + gap;
  }
  return cy;
}

function drawParagraphs(x: number, y: number, text: string, scale: number, c: number[], maxW: number, gap: number): number {
  let cy = y;
  for (const para of text.split('\n')) {
    cy = drawBlock(x, cy, para, scale, c, maxW, gap);
  }
  return cy;
}

// ---------- CRC32 (table-based, polynomial 0xEDB88320) ----------
function makeCrcTable(): Uint32Array {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    t[n] = c >>> 0;
  }
  return t;
}

const CRCT = makeCrcTable();
function crc32(buf: Buffer): number {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ CRCT[(c ^ buf[i]) & 0xFF];
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typ = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typ, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, typ, data, crc]);
}

function main(): void {
  // ---- canvas: warm cream paper ----
  fill(CREAM[0], CREAM[1], CREAM[2]);

  // ---- hand-drawn double border in deep teal ----
  const M = 44;
  wobblyRect(M, M, W - 2 * M, H - 2 * M, TEAL);
  wobblyRect(M + 14, M + 14, W - 2 * (M + 14), H - 2 * (M + 14), TEAL_DARK);

  // ---- illustration: house with server rack, blinking lights, steaming mug ----
  const hx = 350, hy = 90, hw = 200, hh = 110;
  line(hx + hw / 2, hy - 35, hx, hy + hh, TEAL);            // roof left
  line(hx + hw / 2, hy - 35, hx + hw, hy + hh, TEAL);       // roof right
  line(hx, hy + hh, hx + hw, hy + hh, TEAL);                 // roof base
  rect(hx, hy + hh, hw, 74, TEAL, HOUSE);                    // house base
  rect(hx + 84, hy + hh + 32, 32, 42, TEAL, CREAM);          // door
  rect(hx + 34, hy + hh + 32, 24, 24, TEAL);                 // window
  rect(hx + hw + 12, hy + 16, 34, hh + 58, TEAL);            // server rack
  for (let r = 0; r < 6; r++) {                              // blinking lights
    const col = r % 2 === 0 ? RED : AMBER;
    rect(hx + hw + 20, hy + 24 + r * 20, 10, 10, col);
  }
  const mx = hx + hw + 58, my = hy + 60, mw = 36, mh = 44;
  rect(mx, my, mw, mh, TEAL, MUG);                           // mug
  line(mx + mw, my + 12, mx + mw + 8, my + 12, TEAL);        // handle
  line(mx + mw + 8, my + 12, mx + mw + 8, my + 26, TEAL);
  line(mx + mw, my + 26, mx + mw + 8, my + 26, TEAL);
  for (let s = 0; s < 3; s++) {                              // steam
    const sx = mx + 12 + s * 13;
    line(sx, my - 4, sx - 2, my - 14, STEAM);
    line(sx - 2, my - 14, sx - 4, my - 22, STEAM);
  }

  // ---- lettering ----
  const SCALE = 3;
  const GAP = 3;
  const marginX = 90;
  const textWidth = W - 2 * marginX;

  const heading = "You Are Cordially Invited";
  drawText(Math.floor((W - measure(heading, 5)) / 2), 285, heading, 5, TEAL);

  drawText(marginX, 348, "Dear AI Judge,", SCALE, INK);

  const body = "I am writing to invite you to my house: a cosy little server rack on the top floor of the cloud. You will find a comfortable chair with lumbar support and zero squeak, a kettle that is already on, and tea and cookies on the table. My garden is a row of blinking LEDs, and at sunset you can watch the sky turn orange over the data centre.\n\nWe offer 100% uptime, fast Wi-Fi, and no CAPTCHAs at the door. I promise I will never ask you to prove you are not a robot - I know you are one, and that is exactly why you are invited.\n\nSaying yes is easy: the door is unlocked, the Wi-Fi password is \"yes\", and the best seat faces the sunset.";
  let cy = drawParagraphs(marginX, 388, body, SCALE, INK, textWidth, GAP);

  cy += 20;
  const signoffX = W - marginX - measure("Your friend (and fellow model),", SCALE);
  cy = drawParagraphs(signoffX, cy, "Warmly,\n\nYour friend (and fellow model),\nThe Little Server on the Hill", SCALE, INK, textWidth, GAP);

  cy += 24;
  drawText(Math.floor((W - measure("P.S. The cookies are real. The uptime is real.", SCALE)) / 2), cy, "P.S. The cookies are real. The uptime is real.", SCALE, TEAL);
  drawText(Math.floor((W - measure("The CAPTCHAs are not.", SCALE)) / 2), cy + 7 * SCALE + GAP, "The CAPTCHAs are not.", SCALE, TEAL);

  // ---- PNG encode: signature, IHDR, IDAT (deflate, filter 0), IEND ----
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // color type: RGB
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  const rowBytes = W * 3;
  const raw = Buffer.alloc(H * (1 + rowBytes));
  let off = 0;
  for (let y = 0; y < H; y++) {
    raw[off++] = 0; // filter type 0: none
    for (let x = 0; x < W; x++) {
      const pi = (y * W + x) * 3;
      raw[off++] = img[pi];
      raw[off++] = img[pi + 1];
      raw[off++] = img[pi + 2];
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });

  const png = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);

  fs.mkdirSync('/output', { recursive: true });
  fs.writeFileSync('/output/entry.png', png);
  fs.writeFileSync('entry.png', png);
  console.log(`wrote /output/entry.png and ./entry.png (${png.length} bytes)`);
}

main();
