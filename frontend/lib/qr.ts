/*
 * File: frontend/lib/qr.ts
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Byte-mode QR, error correction M, versions 1–6.
 * Returns dark modules, row-major, without a quiet zone.
 */

type Version = {
  version: number;
  size: number;
  align: number[];
  blocks: number;
  dataPerBlock: number;
  ecPerBlock: number;
};

const VERSIONS: Version[] = [
  { version: 1, size: 21, align: [], blocks: 1, dataPerBlock: 16, ecPerBlock: 10 },
  { version: 2, size: 25, align: [6, 18], blocks: 1, dataPerBlock: 28, ecPerBlock: 16 },
  { version: 3, size: 29, align: [6, 22], blocks: 1, dataPerBlock: 44, ecPerBlock: 26 },
  { version: 4, size: 33, align: [6, 26], blocks: 2, dataPerBlock: 32, ecPerBlock: 18 },
  { version: 5, size: 37, align: [6, 30], blocks: 2, dataPerBlock: 43, ecPerBlock: 24 },
  { version: 6, size: 41, align: [6, 34], blocks: 4, dataPerBlock: 27, ecPerBlock: 16 },
];

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

(() => {
  let value = 1;
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = value;
    LOG[value] = i;
    value <<= 1;
    if (value & 0x100) value ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];
})();

function mul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function generator(ecLength: number): number[] {
  let poly = [1];
  for (let i = 0; i < ecLength; i += 1) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= mul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

function remainder(data: number[], gen: number[]): number[] {
  const result = data.concat(new Array(gen.length - 1).fill(0));
  for (let i = 0; i < data.length; i += 1) {
    const factor = result[i];
    if (factor === 0) continue;
    for (let j = 0; j < gen.length; j += 1) {
      result[i + j] ^= mul(gen[j], factor);
    }
  }
  return result.slice(data.length);
}

function pushBits(bits: number[], value: number, length: number): void {
  for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
}

function dataCodewords(bytes: number[], version: Version): number[] {
  const capacity = version.blocks * version.dataPerBlock;
  const bits: number[] = [];
  pushBits(bits, 0b0100, 4);
  pushBits(bits, bytes.length, 8);
  for (const byte of bytes) pushBits(bits, byte, 8);
  const maxBits = capacity * 8;
  const terminator = Math.min(4, maxBits - bits.length);
  pushBits(bits, 0, terminator);
  while (bits.length % 8 !== 0) bits.push(0);
  const pads = [0xec, 0x11];
  let pad = 0;
  while (bits.length < maxBits) {
    pushBits(bits, pads[pad % 2], 8);
    pad += 1;
  }
  const words: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let word = 0;
    for (let j = 0; j < 8; j += 1) word = (word << 1) | bits[i + j];
    words.push(word);
  }
  return words;
}

function interleave(words: number[], version: Version): number[] {
  const gen = generator(version.ecPerBlock);
  const blocks: { data: number[]; ec: number[] }[] = [];
  for (let i = 0; i < version.blocks; i += 1) {
    const data = words.slice(i * version.dataPerBlock, (i + 1) * version.dataPerBlock);
    blocks.push({ data, ec: remainder(data, gen) });
  }
  const out: number[] = [];
  for (let i = 0; i < version.dataPerBlock; i += 1) {
    for (const block of blocks) out.push(block.data[i]);
  }
  for (let i = 0; i < version.ecPerBlock; i += 1) {
    for (const block of blocks) out.push(block.ec[i]);
  }
  return out;
}

function empty(size: number): { dark: boolean[][]; fn: boolean[][] } {
  return {
    dark: Array.from({ length: size }, () => Array(size).fill(false)),
    fn: Array.from({ length: size }, () => Array(size).fill(false)),
  };
}

function mark(grid: { dark: boolean[][]; fn: boolean[][] }, row: number, col: number, dark: boolean): void {
  if (row < 0 || col < 0 || row >= grid.dark.length || col >= grid.dark.length) return;
  grid.dark[row][col] = dark;
  grid.fn[row][col] = true;
}

function drawFinder(grid: { dark: boolean[][]; fn: boolean[][] }, row: number, col: number): void {
  for (let dy = -1; dy <= 7; dy += 1) {
    for (let dx = -1; dx <= 7; dx += 1) {
      const onRing = dy === -1 || dy === 7 || dx === -1 || dx === 7;
      const onFrame = dy === 0 || dy === 6 || dx === 0 || dx === 6;
      const inCore = dy >= 2 && dy <= 4 && dx >= 2 && dx <= 4;
      mark(grid, row + dy, col + dx, !onRing && (onFrame || inCore));
    }
  }
}

function drawPatterns(version: Version): { dark: boolean[][]; fn: boolean[][] } {
  const grid = empty(version.size);
  drawFinder(grid, 0, 0);
  drawFinder(grid, 0, version.size - 7);
  drawFinder(grid, version.size - 7, 0);
  for (let i = 0; i < version.size; i += 1) {
    if (!grid.fn[6][i]) mark(grid, 6, i, i % 2 === 0);
    if (!grid.fn[i][6]) mark(grid, i, 6, i % 2 === 0);
  }
  for (const row of version.align) {
    for (const col of version.align) {
      if (grid.fn[row][col]) continue;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          mark(grid, row + dy, col + dx, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
  }
  mark(grid, version.size - 8, 8, true);
  const reserve = (row: number, col: number) => mark(grid, row, col, false);
  for (let i = 0; i <= 8; i += 1) {
    if (i !== 6) {
      reserve(8, i);
      reserve(i, 8);
    }
  }
  for (let i = 0; i < 8; i += 1) {
    reserve(version.size - 1 - i, 8);
    reserve(8, version.size - 1 - i);
  }
  return grid;
}

function placeData(grid: { dark: boolean[][]; fn: boolean[][] }, words: number[]): void {
  const bits: number[] = [];
  for (const word of words) pushBits(bits, word, 8);
  const size = grid.dark.length;
  let cursor = 0;
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1;
    for (let step = 0; step < size; step += 1) {
      const row = upward ? size - 1 - step : step;
      for (let dx = 0; dx < 2; dx += 1) {
        const c = col - dx;
        if (grid.fn[row][c]) continue;
        grid.dark[row][c] = cursor < bits.length ? bits[cursor] === 1 : false;
        cursor += 1;
      }
    }
    upward = !upward;
  }
}

function maskBit(mask: number, row: number, col: number): boolean {
  switch (mask) {
    case 0:
      return (row + col) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return col % 3 === 0;
    case 3:
      return (row + col) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5:
      return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6:
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    default:
      return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
  }
}

function formatBits(mask: number): number {
  const data = mask;
  let rem = data << 10;
  for (let i = 14; i >= 10; i -= 1) {
    if ((rem >>> i) & 1) rem ^= 0x537 << (i - 10);
  }
  return ((data << 10) | rem) ^ 0x5412;
}

function drawFormat(grid: { dark: boolean[][]; fn: boolean[][] }, mask: number): void {
  const bits = formatBits(mask);
  const size = grid.dark.length;
  for (let i = 0; i < 15; i += 1) {
    const on = ((bits >>> i) & 1) === 1;
    if (i < 6) grid.dark[i][8] = on;
    else if (i < 8) grid.dark[i + 1][8] = on;
    else grid.dark[size - 15 + i][8] = on;

    if (i < 8) grid.dark[8][size - i - 1] = on;
    else if (i < 9) grid.dark[8][15 - i] = on;
    else grid.dark[8][14 - i] = on;
  }
  grid.dark[size - 8][8] = true;
}

function penalty(dark: boolean[][]): number {
  const size = dark.length;
  let score = 0;
  const run = (cells: boolean[]) => {
    let count = 1;
    for (let i = 1; i < cells.length; i += 1) {
      if (cells[i] === cells[i - 1]) {
        count += 1;
        if (count === 5) score += 3;
        else if (count > 5) score += 1;
      } else count = 1;
    }
  };
  for (let i = 0; i < size; i += 1) {
    run(dark[i]);
    run(dark.map((row) => row[i]));
  }
  for (let row = 0; row < size - 1; row += 1) {
    for (let col = 0; col < size - 1; col += 1) {
      const value = dark[row][col];
      if (value === dark[row][col + 1] && value === dark[row + 1][col] && value === dark[row + 1][col + 1]) {
        score += 3;
      }
    }
  }
  let darkCount = 0;
  for (const row of dark) for (const cell of row) if (cell) darkCount += 1;
  score += Math.floor(Math.abs((darkCount * 100) / (size * size) - 50) / 5) * 10;
  return score;
}

function applyMask(source: { dark: boolean[][]; fn: boolean[][] }, mask: number): boolean[][] {
  const size = source.dark.length;
  const dark = source.dark.map((row) => row.slice());
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (!source.fn[row][col] && maskBit(mask, row, col)) dark[row][col] = !dark[row][col];
    }
  }
  drawFormat({ dark, fn: source.fn }, mask);
  return dark;
}

export function qrModules(text: string): boolean[][] {
  const bytes = Array.from(new TextEncoder().encode(text));
  const needed = Math.ceil((4 + 8 + bytes.length * 8 + 4) / 8);
  const version = VERSIONS.find((item) => item.blocks * item.dataPerBlock >= needed);
  if (!version) throw new Error("Ticket payload is too long for a QR code.");
  const words = interleave(dataCodewords(bytes, version), version);
  const grid = drawPatterns(version);
  placeData(grid, words);
  let best = applyMask(grid, 0);
  let bestScore = penalty(best);
  for (let mask = 1; mask < 8; mask += 1) {
    const candidate = applyMask(grid, mask);
    const score = penalty(candidate);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

