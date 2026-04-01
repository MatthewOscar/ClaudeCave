import { type CaveMap, Tile, CAVE_WIDTH, CAVE_HEIGHT } from './cave';

export class Minimap {
  private explored: boolean[][] = [];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scale = 2;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = CAVE_WIDTH * this.scale;
    this.canvas.height = CAVE_HEIGHT * this.scale;
    this.canvas.style.cssText = `
      position: absolute;
      bottom: 16px;
      right: 16px;
      border: 1px solid rgba(240, 192, 64, 0.4);
      border-radius: 4px;
      opacity: 0.8;
      z-index: 15;
      background: rgba(0,0,0,0.6);
    `;
    this.ctx = this.canvas.getContext('2d')!;
    document.getElementById('app')!.appendChild(this.canvas);
  }

  reset(): void {
    this.explored = Array.from({ length: CAVE_HEIGHT }, () =>
      Array(CAVE_WIDTH).fill(false)
    );
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  reveal(px: number, py: number, radius: number): void {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = px + dx;
        const y = py + dy;
        if (x >= 0 && x < CAVE_WIDTH && y >= 0 && y < CAVE_HEIGHT) {
          if (dx * dx + dy * dy <= radius * radius) {
            this.explored[y][x] = true;
          }
        }
      }
    }
  }

  render(map: CaveMap, playerX: number, playerY: number): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const s = this.scale;

    for (let y = 0; y < CAVE_HEIGHT; y++) {
      for (let x = 0; x < CAVE_WIDTH; x++) {
        if (!this.explored[y][x]) continue;
        const tile = map[y][x];
        if (tile === Tile.Wall) {
          this.ctx.fillStyle = '#3a2510';
        } else if (tile === Tile.Gem) {
          this.ctx.fillStyle = '#40b0c0';
        } else if (tile === Tile.Exit) {
          this.ctx.fillStyle = '#f0c040';
        } else if (tile === Tile.Fuel) {
          this.ctx.fillStyle = '#ff8020';
        } else {
          this.ctx.fillStyle = '#6a5a30';
        }
        this.ctx.fillRect(x * s, y * s, s, s);
      }
    }

    this.ctx.fillStyle = '#ffd080';
    this.ctx.fillRect(playerX * s - 1, playerY * s - 1, s + 2, s + 2);
  }
}
