export const TILE_SIZE = 24;
export const CAVE_WIDTH = 80;
export const CAVE_HEIGHT = 60;

export const Tile = {
  Wall: 0,
  Floor: 1,
  Gem: 2,
  Exit: 3,
  Fuel: 4,
} as const;

export type Tile = (typeof Tile)[keyof typeof Tile];

export type CaveMap = Tile[][];

function createGrid(w: number, h: number, fill: Tile): CaveMap {
  return Array.from({ length: h }, () => Array(w).fill(fill));
}

function countWallNeighbors(map: CaveMap, x: number, y: number): number {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= CAVE_WIDTH || ny < 0 || ny >= CAVE_HEIGHT) {
        count++;
      } else if (map[ny][nx] === Tile.Wall) {
        count++;
      }
    }
  }
  return count;
}

function cellularAutomataStep(map: CaveMap): CaveMap {
  const next = createGrid(CAVE_WIDTH, CAVE_HEIGHT, Tile.Wall);
  for (let y = 1; y < CAVE_HEIGHT - 1; y++) {
    for (let x = 1; x < CAVE_WIDTH - 1; x++) {
      const walls = countWallNeighbors(map, x, y);
      next[y][x] = walls >= 5 ? Tile.Wall : Tile.Floor;
    }
  }
  return next;
}

function floodFill(map: CaveMap, sx: number, sy: number, visited: boolean[][]): { x: number; y: number }[] {
  const region: { x: number; y: number }[] = [];
  const stack = [{ x: sx, y: sy }];
  while (stack.length > 0) {
    const { x, y } = stack.pop()!;
    if (x < 0 || x >= CAVE_WIDTH || y < 0 || y >= CAVE_HEIGHT) continue;
    if (visited[y][x] || map[y][x] === Tile.Wall) continue;
    visited[y][x] = true;
    region.push({ x, y });
    stack.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 });
  }
  return region;
}

function connectRegions(map: CaveMap): void {
  const visited = Array.from({ length: CAVE_HEIGHT }, () => Array(CAVE_WIDTH).fill(false));
  const regions: { x: number; y: number }[][] = [];

  for (let y = 0; y < CAVE_HEIGHT; y++) {
    for (let x = 0; x < CAVE_WIDTH; x++) {
      if (!visited[y][x] && map[y][x] !== Tile.Wall) {
        const region = floodFill(map, x, y, visited);
        if (region.length > 0) regions.push(region);
      }
    }
  }

  if (regions.length <= 1) return;

  regions.sort((a, b) => b.length - a.length);

  for (let i = 1; i < regions.length; i++) {
    const from = regions[i][Math.floor(Math.random() * regions[i].length)];
    let bestDist = Infinity;
    let bestTo = regions[0][0];
    for (const to of regions[0]) {
      const dist = Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
      if (dist < bestDist) {
        bestDist = dist;
        bestTo = to;
      }
    }
    carveTunnel(map, from.x, from.y, bestTo.x, bestTo.y);
    regions[0].push(...regions[i]);
  }
}

function carveTunnel(map: CaveMap, x1: number, y1: number, x2: number, y2: number): void {
  let x = x1;
  let y = y1;
  while (x !== x2 || y !== y2) {
    if (map[y] && map[y][x] !== undefined) {
      map[y][x] = Tile.Floor;
      if (y > 0) map[y - 1][x] = Tile.Floor;
      if (y < CAVE_HEIGHT - 1) map[y + 1][x] = Tile.Floor;
    }
    if (Math.random() < 0.5 ? x !== x2 : y === y2) {
      x += x < x2 ? 1 : -1;
    } else {
      y += y < y2 ? 1 : -1;
    }
  }
}

export function generateCave(depth: number): { map: CaveMap; spawn: { x: number; y: number }; exit: { x: number; y: number } } {
  const fillChance = 0.46 + Math.min(depth * 0.005, 0.08);

  let map = createGrid(CAVE_WIDTH, CAVE_HEIGHT, Tile.Wall);
  for (let y = 1; y < CAVE_HEIGHT - 1; y++) {
    for (let x = 1; x < CAVE_WIDTH - 1; x++) {
      map[y][x] = Math.random() < fillChance ? Tile.Wall : Tile.Floor;
    }
  }

  for (let i = 0; i < 5; i++) {
    map = cellularAutomataStep(map);
  }

  connectRegions(map);

  const floors: { x: number; y: number }[] = [];
  for (let y = 0; y < CAVE_HEIGHT; y++) {
    for (let x = 0; x < CAVE_WIDTH; x++) {
      if (map[y][x] === Tile.Floor) floors.push({ x, y });
    }
  }

  if (floors.length < 10) return generateCave(depth);

  floors.sort((a, b) => a.y - b.y || a.x - b.x);
  const spawn = floors[Math.floor(floors.length * 0.05)];

  floors.sort((a, b) => b.y - a.y || b.x - a.x);
  const exit = floors[Math.floor(floors.length * 0.05)];
  map[exit.y][exit.x] = Tile.Exit;

  const gemCount = 5 + Math.floor(depth * 1.5);
  const candidates = floors.filter(
    f => f !== spawn && f !== exit &&
    Math.abs(f.x - spawn.x) + Math.abs(f.y - spawn.y) > 5
  );
  for (let i = 0; i < Math.min(gemCount, candidates.length); i++) {
    const idx = Math.floor(Math.random() * candidates.length);
    const gem = candidates.splice(idx, 1)[0];
    map[gem.y][gem.x] = Tile.Gem;
  }

  // Place fuel pickups
  const fuelCount = 2 + Math.floor(depth * 0.5);
  const fuelCandidates = candidates.filter(f => map[f.y][f.x] === Tile.Floor);
  for (let i = 0; i < Math.min(fuelCount, fuelCandidates.length); i++) {
    const idx = Math.floor(Math.random() * fuelCandidates.length);
    const fuel = fuelCandidates.splice(idx, 1)[0];
    map[fuel.y][fuel.x] = Tile.Fuel;
  }

  return { map, spawn, exit };
}
