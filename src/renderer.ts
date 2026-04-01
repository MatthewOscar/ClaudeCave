import { type CaveMap, Tile, TILE_SIZE, CAVE_WIDTH, CAVE_HEIGHT } from './cave';

let WALL_COLORS = ['#2a1a0a', '#3a2510', '#2e1c0c', '#342012'];
let FLOOR_COLORS = ['#4a3a20', '#3e3218', '#45361c', '#4f3e24'];

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private lightCanvas: HTMLCanvasElement;
  private lightCtx: CanvasRenderingContext2D;
  private tileColorMap: number[][] = [];
  private decorations: { x: number; y: number; type: 'stalactite' | 'moss' | 'crack' }[] = [];
  shakeX = 0;
  shakeY = 0;

  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.lightCanvas = document.createElement('canvas');
    this.lightCtx = this.lightCanvas.getContext('2d')!;
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
    this.ctx.scale(dpr, dpr);

    this.lightCanvas.width = this.canvas.width;
    this.lightCanvas.height = this.canvas.height;
  }

  initTileColors(map: CaveMap, wallColors?: string[], floorColors?: string[]): void {
    if (wallColors) WALL_COLORS = wallColors;
    if (floorColors) FLOOR_COLORS = floorColors;
    this.tileColorMap = Array.from({ length: CAVE_HEIGHT }, () =>
      Array.from({ length: CAVE_WIDTH }, () => Math.floor(Math.random() * 4))
    );
    this.generateDecorations(map);
  }

  private generateDecorations(map: CaveMap): void {
    this.decorations = [];
    for (let y = 1; y < CAVE_HEIGHT - 1; y++) {
      for (let x = 1; x < CAVE_WIDTH - 1; x++) {
        if (map[y][x] !== Tile.Floor) continue;
        if (map[y - 1][x] === Tile.Wall && Math.random() < 0.15) {
          this.decorations.push({ x, y, type: 'stalactite' });
        } else if (map[y + 1][x] === Tile.Wall && Math.random() < 0.08) {
          this.decorations.push({ x, y, type: 'moss' });
        } else if (Math.random() < 0.02) {
          this.decorations.push({ x, y, type: 'crack' });
        }
      }
    }
  }

  render(
    map: CaveMap,
    playerX: number,
    playerY: number,
    cameraX: number,
    cameraY: number,
    time: number,
    particles: { x: number; y: number; life: number; maxLife: number; vx: number; vy: number; color: string }[],
    fadeAlpha: number,
    lightRadius: number,
    bats: { x: number; y: number; wingPhase: number }[]
  ): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    cameraX += this.shakeX;
    cameraY += this.shakeY;

    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, w, h);

    const startCol = Math.max(0, Math.floor(cameraX / TILE_SIZE) - 1);
    const endCol = Math.min(CAVE_WIDTH, Math.ceil((cameraX + w) / TILE_SIZE) + 1);
    const startRow = Math.max(0, Math.floor(cameraY / TILE_SIZE) - 1);
    const endRow = Math.min(CAVE_HEIGHT, Math.ceil((cameraY + h) / TILE_SIZE) + 1);

    for (let y = startRow; y < endRow; y++) {
      for (let x = startCol; x < endCol; x++) {
        const tile = map[y][x];
        const sx = x * TILE_SIZE - cameraX;
        const sy = y * TILE_SIZE - cameraY;
        const colorIdx = this.tileColorMap[y]?.[x] ?? 0;

        if (tile === Tile.Wall) {
          this.ctx.fillStyle = WALL_COLORS[colorIdx];
          this.ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        } else if (tile === Tile.Floor) {
          this.ctx.fillStyle = FLOOR_COLORS[colorIdx];
          this.ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        } else if (tile === Tile.Gem) {
          this.ctx.fillStyle = FLOOR_COLORS[colorIdx];
          this.ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
          this.drawGem(sx + TILE_SIZE / 2, sy + TILE_SIZE / 2, time);
        } else if (tile === Tile.Exit) {
          this.ctx.fillStyle = FLOOR_COLORS[colorIdx];
          this.ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
          this.drawExit(sx + TILE_SIZE / 2, sy + TILE_SIZE / 2, time);
        } else if (tile === Tile.Fuel) {
          this.ctx.fillStyle = FLOOR_COLORS[colorIdx];
          this.ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
          this.drawFuel(sx + TILE_SIZE / 2, sy + TILE_SIZE / 2, time);
        }

        // Wall edge shadows
        if (tile !== Tile.Wall) {
          if (y > 0 && map[y - 1][x] === Tile.Wall) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.25)';
            this.ctx.fillRect(sx, sy, TILE_SIZE, 4);
          }
          if (x > 0 && map[y][x - 1] === Tile.Wall) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.15)';
            this.ctx.fillRect(sx, sy, 3, TILE_SIZE);
          }
        }
      }
    }

    this.drawDecorations(cameraX, cameraY, startCol, endCol, startRow, endRow, time);
    this.drawBats(bats, cameraX, cameraY, time);
    this.drawPlayer(playerX * TILE_SIZE + TILE_SIZE / 2 - cameraX, playerY * TILE_SIZE + TILE_SIZE / 2 - cameraY, time);
    this.drawParticles(particles, cameraX, cameraY);
    this.applyLighting(playerX * TILE_SIZE + TILE_SIZE / 2 - cameraX, playerY * TILE_SIZE + TILE_SIZE / 2 - cameraY, time, lightRadius);

    if (fadeAlpha > 0) {
      this.ctx.save();
      this.ctx.globalAlpha = fadeAlpha;
      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(0, 0, w, h);
      this.ctx.restore();
    }
  }

  private drawPlayer(sx: number, sy: number, time: number): void {
    const bob = Math.sin(time * 3) * 1.5;
    const r = TILE_SIZE * 0.4;

    this.ctx.save();
    this.ctx.shadowColor = '#ffa030';
    this.ctx.shadowBlur = 15;
    this.ctx.fillStyle = '#ffd080';
    this.ctx.beginPath();
    this.ctx.arc(sx, sy + bob, r, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = '#2a1a00';
    this.ctx.beginPath();
    this.ctx.arc(sx - 3, sy + bob - 2, 2, 0, Math.PI * 2);
    this.ctx.arc(sx + 3, sy + bob - 2, 2, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  private drawGem(sx: number, sy: number, time: number): void {
    const pulse = 0.8 + Math.sin(time * 4) * 0.2;
    const r = TILE_SIZE * 0.3 * pulse;

    this.ctx.save();
    this.ctx.shadowColor = '#40f0ff';
    this.ctx.shadowBlur = 10;
    this.ctx.fillStyle = '#60e0f0';
    this.ctx.beginPath();
    this.ctx.moveTo(sx, sy - r);
    this.ctx.lineTo(sx + r * 0.7, sy);
    this.ctx.lineTo(sx, sy + r * 0.6);
    this.ctx.lineTo(sx - r * 0.7, sy);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();
  }

  private drawExit(sx: number, sy: number, time: number): void {
    const pulse = 0.7 + Math.sin(time * 2) * 0.3;
    const r = TILE_SIZE * 0.45;

    this.ctx.save();
    this.ctx.shadowColor = '#f0c040';
    this.ctx.shadowBlur = 20 * pulse;
    this.ctx.strokeStyle = `rgba(240, 192, 64, ${pulse})`;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(sx, sy, r, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.fillStyle = `rgba(240, 192, 64, ${pulse * 0.3})`;
    this.ctx.fill();

    this.ctx.fillStyle = '#f0c040';
    this.ctx.font = '14px Courier New';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('\u25BC', sx, sy);
    this.ctx.restore();
  }

  private drawFuel(sx: number, sy: number, time: number): void {
    const pulse = 0.8 + Math.sin(time * 3) * 0.2;
    const r = TILE_SIZE * 0.25;

    this.ctx.save();
    this.ctx.shadowColor = '#ff8020';
    this.ctx.shadowBlur = 8 * pulse;
    this.ctx.fillStyle = `rgba(255, 160, 40, ${pulse})`;
    this.ctx.beginPath();
    // Flame shape
    this.ctx.moveTo(sx, sy - r * 1.2);
    this.ctx.quadraticCurveTo(sx + r, sy - r * 0.3, sx + r * 0.5, sy + r * 0.5);
    this.ctx.quadraticCurveTo(sx, sy + r, sx - r * 0.5, sy + r * 0.5);
    this.ctx.quadraticCurveTo(sx - r, sy - r * 0.3, sx, sy - r * 1.2);
    this.ctx.fill();
    this.ctx.restore();
  }

  private drawParticles(
    particles: { x: number; y: number; life: number; maxLife: number; color: string }[],
    cameraX: number,
    cameraY: number
  ): void {
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      const sx = p.x - cameraX;
      const sy = p.y - cameraY;
      this.ctx.save();
      this.ctx.globalAlpha = alpha * 0.8;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, 2 * alpha, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private drawDecorations(
    cameraX: number, cameraY: number,
    startCol: number, endCol: number, startRow: number, endRow: number,
    _time: number
  ): void {
    for (const d of this.decorations) {
      if (d.x < startCol || d.x >= endCol || d.y < startRow || d.y >= endRow) continue;
      const sx = d.x * TILE_SIZE - cameraX;
      const sy = d.y * TILE_SIZE - cameraY;

      this.ctx.save();
      if (d.type === 'stalactite') {
        this.ctx.fillStyle = '#5a4a28';
        this.ctx.beginPath();
        this.ctx.moveTo(sx + TILE_SIZE * 0.3, sy);
        this.ctx.lineTo(sx + TILE_SIZE * 0.5, sy + TILE_SIZE * 0.6);
        this.ctx.lineTo(sx + TILE_SIZE * 0.7, sy);
        this.ctx.fill();
      } else if (d.type === 'moss') {
        this.ctx.fillStyle = '#2a5a20';
        this.ctx.globalAlpha = 0.4;
        this.ctx.fillRect(sx + 2, sy + TILE_SIZE - 6, TILE_SIZE - 4, 4);
      } else if (d.type === 'crack') {
        this.ctx.strokeStyle = '#2a1a08';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(sx + 4, sy + 4);
        this.ctx.lineTo(sx + TILE_SIZE / 2, sy + TILE_SIZE / 2);
        this.ctx.lineTo(sx + TILE_SIZE - 6, sy + TILE_SIZE - 4);
        this.ctx.stroke();
      }
      this.ctx.restore();
    }
  }

  private drawBats(
    bats: { x: number; y: number; wingPhase: number }[],
    cameraX: number,
    cameraY: number,
    time: number
  ): void {
    for (const bat of bats) {
      const sx = bat.x * TILE_SIZE + TILE_SIZE / 2 - cameraX;
      const sy = bat.y * TILE_SIZE + TILE_SIZE / 2 - cameraY;
      const wingAngle = Math.sin(time * 12 + bat.wingPhase) * 0.5;

      this.ctx.save();
      this.ctx.fillStyle = '#604050';
      // Body
      this.ctx.beginPath();
      this.ctx.ellipse(sx, sy, 4, 3, 0, 0, Math.PI * 2);
      this.ctx.fill();
      // Wings
      this.ctx.beginPath();
      this.ctx.ellipse(sx - 7, sy - 2, 6, 2, wingAngle, 0, Math.PI * 2);
      this.ctx.ellipse(sx + 7, sy - 2, 6, 2, -wingAngle, 0, Math.PI * 2);
      this.ctx.fill();
      // Eyes
      this.ctx.fillStyle = '#ff4040';
      this.ctx.beginPath();
      this.ctx.arc(sx - 2, sy - 1, 1, 0, Math.PI * 2);
      this.ctx.arc(sx + 2, sy - 1, 1, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private applyLighting(px: number, py: number, time: number, lightRadius: number): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    this.lightCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.lightCtx.scale(dpr, dpr);

    this.lightCtx.fillStyle = 'rgba(0, 0, 0, 0.92)';
    this.lightCtx.fillRect(0, 0, w, h);

    this.lightCtx.globalCompositeOperation = 'destination-out';

    const flicker = 1 + Math.sin(time * 8) * 0.02 + Math.sin(time * 13) * 0.015;
    const radius = lightRadius * flicker;

    const gradient = this.lightCtx.createRadialGradient(px, py, 0, px, py, radius);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
    gradient.addColorStop(0.4, 'rgba(0, 0, 0, 0.8)');
    gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    this.lightCtx.fillStyle = gradient;
    this.lightCtx.beginPath();
    this.lightCtx.arc(px, py, radius, 0, Math.PI * 2);
    this.lightCtx.fill();

    this.lightCtx.globalCompositeOperation = 'source-over';

    this.ctx.drawImage(this.lightCanvas, 0, 0, w * dpr, h * dpr, 0, 0, w, h);

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';
    const warmGlow = this.ctx.createRadialGradient(px, py, 0, px, py, radius * 0.6);
    warmGlow.addColorStop(0, 'rgba(255, 150, 50, 0.08)');
    warmGlow.addColorStop(1, 'rgba(255, 100, 20, 0)');
    this.ctx.fillStyle = warmGlow;
    this.ctx.beginPath();
    this.ctx.arc(px, py, radius * 0.6, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }
}
