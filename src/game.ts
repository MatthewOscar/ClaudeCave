import { generateCave, type CaveMap, Tile, TILE_SIZE, CAVE_WIDTH, CAVE_HEIGHT } from './cave';
import { Renderer } from './renderer';
import { InputManager } from './input';
import { AudioManager } from './audio';
import { Minimap } from './minimap';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

interface Bat {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  wingPhase: number;
  moveTimer: number;
}

const BIOMES = [
  { wall: ['#2a1a0a', '#3a2510', '#2e1c0c', '#342012'], floor: ['#4a3a20', '#3e3218', '#45361c', '#4f3e24'] },
  { wall: ['#0a1a2a', '#102535', '#0c1c2e', '#122034'], floor: ['#203a4a', '#18323e', '#1c3645', '#243e4f'] },
  { wall: ['#1a0a1a', '#251025', '#1c0c1e', '#201224'], floor: ['#3a204a', '#32183e', '#361c45', '#3e244f'] },
  { wall: ['#0a2a1a', '#103520', '#0c2e1c', '#123424'], floor: ['#204a3a', '#183e32', '#1c4536', '#244f3e'] },
  { wall: ['#2a0a0a', '#351010', '#2e0c0c', '#341212'], floor: ['#4a2020', '#3e1818', '#451c1c', '#4f2424'] },
];

export class Game {
  private renderer: Renderer;
  private input: InputManager;
  private audio: AudioManager;
  private minimap: Minimap;
  private map: CaveMap = [];
  private playerTileX = 0;
  private playerTileY = 0;
  private playerRenderX = 0;
  private playerRenderY = 0;
  private cameraX = 0;
  private cameraY = 0;
  private depth = 0;
  private gems = 0;
  private particles: Particle[] = [];
  private bats: Bat[] = [];
  private running = false;
  private lastTime = 0;
  private moveTimer = 0;
  private fadeAlpha = 0;
  private fading: 'none' | 'out' | 'in' = 'none';
  private ambientTimer = 0;
  private torchFuel = 1.0;
  private shakeIntensity = 0;
  private highScore = 0;
  private depthAnnouncementTimer = 0;
  private playTime = 0;
  private ambientMusicTimer = 0;
  private gemCountEl: HTMLElement;
  private depthCountEl: HTMLElement;
  private canvas: HTMLCanvasElement;
  private hudEl: HTMLElement;
  private fuelBarEl: HTMLElement;
  private highScoreEl: HTMLElement;
  private gameOverEl: HTMLElement;
  private finalScoreEl: HTMLElement;
  private depthAnnounceEl: HTMLElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.input = new InputManager();
    this.audio = new AudioManager();
    this.minimap = new Minimap();
    this.gemCountEl = document.getElementById('gem-count')!;
    this.depthCountEl = document.getElementById('depth-count')!;
    this.hudEl = document.getElementById('hud')!;
    this.fuelBarEl = document.getElementById('fuel-bar')!;
    this.highScoreEl = document.getElementById('high-score')!;
    this.gameOverEl = document.getElementById('game-over')!;
    this.finalScoreEl = document.getElementById('final-score')!;
    this.depthAnnounceEl = document.getElementById('depth-announce')!;

    this.highScore = parseInt(localStorage.getItem('claudecave-highscore') || '0', 10);
    this.highScoreEl.textContent = String(this.highScore);

    document.getElementById('restart-btn')!.addEventListener('click', () => {
      this.gameOverEl.classList.remove('visible');
      this.start();
    });

    window.addEventListener('resize', () => this.renderer.resize());
    this.renderer.resize();
  }

  start(): void {
    this.running = true;
    this.depth = 0;
    this.gems = 0;
    this.torchFuel = 1.0;
    this.playTime = 0;
    this.audio.init();
    this.hudEl.classList.add('visible');
    this.loadLevel();
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  private loadLevel(): void {
    this.depth++;
    const biome = BIOMES[(this.depth - 1) % BIOMES.length];
    const { map, spawn } = generateCave(this.depth);
    this.map = map;
    this.playerTileX = spawn.x;
    this.playerTileY = spawn.y;
    this.playerRenderX = spawn.x;
    this.playerRenderY = spawn.y;
    this.renderer.initTileColors(map, biome.wall, biome.floor);
    this.minimap.reset();
    this.minimap.reveal(spawn.x, spawn.y, 6);
    this.torchFuel = Math.min(1, this.torchFuel + 0.3);
    this.spawnBats();
    this.updateHUD();
    this.showDepthAnnouncement();

    for (let i = 0; i < 20; i++) {
      this.spawnParticle(
        spawn.x * TILE_SIZE + TILE_SIZE / 2,
        spawn.y * TILE_SIZE + TILE_SIZE / 2,
        '#ffd080'
      );
    }

    this.fading = 'in';
    this.fadeAlpha = 1;
  }

  private showDepthAnnouncement(): void {
    this.depthAnnouncementTimer = 2.5;
    this.depthAnnounceEl.textContent = `Depth ${this.depth}`;
    this.depthAnnounceEl.classList.add('visible');
  }

  private triggerGameOver(): void {
    this.running = false;
    const minutes = Math.floor(this.playTime / 60);
    const seconds = Math.floor(this.playTime % 60);
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    this.finalScoreEl.innerHTML = `Gems: ${this.gems} | Depth: ${this.depth}<br>Time: ${timeStr} | Gems/min: ${this.playTime > 0 ? (this.gems / (this.playTime / 60)).toFixed(1) : '0'}`;
    this.gameOverEl.classList.add('visible');
    this.hudEl.classList.remove('visible');
  }

  private spawnBats(): void {
    this.bats = [];
    const batCount = 2 + this.depth;
    const floors: { x: number; y: number }[] = [];
    for (let y = 0; y < CAVE_HEIGHT; y++) {
      for (let x = 0; x < CAVE_WIDTH; x++) {
        if (this.map[y][x] === Tile.Floor) {
          const dist = Math.abs(x - this.playerTileX) + Math.abs(y - this.playerTileY);
          if (dist > 10) floors.push({ x, y });
        }
      }
    }
    for (let i = 0; i < Math.min(batCount, floors.length); i++) {
      const idx = Math.floor(Math.random() * floors.length);
      const pos = floors.splice(idx, 1)[0];
      this.bats.push({
        x: pos.x, y: pos.y,
        targetX: pos.x, targetY: pos.y,
        wingPhase: Math.random() * Math.PI * 2,
        moveTimer: Math.random() * 2,
      });
    }
  }

  private updateHUD(): void {
    this.gemCountEl.textContent = String(this.gems);
    this.depthCountEl.textContent = String(this.depth);
    this.fuelBarEl.style.width = `${this.torchFuel * 100}%`;

    if (this.gems > this.highScore) {
      this.highScore = this.gems;
      localStorage.setItem('claudecave-highscore', String(this.highScore));
      this.highScoreEl.textContent = String(this.highScore);
    }
  }

  private loop(time: number): void {
    if (!this.running) return;

    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    this.update(dt);
    const lightRadius = 60 + this.torchFuel * 120;
    this.renderer.render(
      this.map,
      this.playerRenderX,
      this.playerRenderY,
      this.cameraX,
      this.cameraY,
      time / 1000,
      this.particles,
      this.fadeAlpha,
      lightRadius,
      this.bats
    );
    this.minimap.render(this.map, this.playerTileX, this.playerTileY);

    requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number): void {
    // Depth announcement timer
    if (this.depthAnnouncementTimer > 0) {
      this.depthAnnouncementTimer -= dt;
      if (this.depthAnnouncementTimer <= 0) {
        this.depthAnnounceEl.classList.remove('visible');
      }
    }

    // Fade transitions
    if (this.fading === 'out') {
      this.fadeAlpha = Math.min(1, this.fadeAlpha + dt * 3);
      if (this.fadeAlpha >= 1) {
        this.fading = 'none';
        this.loadLevel();
      }
      return;
    }
    if (this.fading === 'in') {
      this.fadeAlpha = Math.max(0, this.fadeAlpha - dt * 2);
      if (this.fadeAlpha <= 0) {
        this.fading = 'none';
      }
    }

    // Screen shake decay
    this.shakeIntensity *= Math.pow(0.01, dt);
    if (this.shakeIntensity < 0.1) this.shakeIntensity = 0;
    this.renderer.shakeX = (Math.random() - 0.5) * this.shakeIntensity;
    this.renderer.shakeY = (Math.random() - 0.5) * this.shakeIntensity;

    // Play time
    this.playTime += dt;

    // Ambient music
    this.ambientMusicTimer -= dt;
    if (this.ambientMusicTimer <= 0) {
      this.audio.playAmbientDrone();
      this.ambientMusicTimer = 4 + Math.random() * 3;
    }

    // Torch fuel depletion
    this.torchFuel = Math.max(0, this.torchFuel - dt * 0.02);
    this.fuelBarEl.style.width = `${this.torchFuel * 100}%`;

    // Game over check
    if (this.torchFuel <= 0) {
      this.triggerGameOver();
      return;
    }

    // Ambient drips
    this.ambientTimer -= dt;
    if (this.ambientTimer <= 0) {
      this.audio.playAmbientDrip();
      this.ambientTimer = 2 + Math.random() * 5;
    }

    // Bat AI with chase behavior
    const CHASE_RADIUS = 8;
    for (const bat of this.bats) {
      bat.moveTimer -= dt;
      if (bat.moveTimer <= 0) {
        const distToPlayer = Math.abs(bat.x - this.playerTileX) + Math.abs(bat.y - this.playerTileY);

        if (distToPlayer <= CHASE_RADIUS) {
          // Chase the player
          bat.moveTimer = 0.15 + Math.random() * 0.2;
          bat.targetX = this.playerTileX;
          bat.targetY = this.playerTileY;
        } else {
          bat.moveTimer = 0.3 + Math.random() * 0.5;
        }

        const dx = bat.targetX - bat.x;
        const dy = bat.targetY - bat.y;
        if (Math.abs(dx) + Math.abs(dy) < 2 && distToPlayer > CHASE_RADIUS) {
          const nx = bat.x + Math.floor(Math.random() * 10 - 5);
          const ny = bat.y + Math.floor(Math.random() * 10 - 5);
          if (nx >= 0 && nx < CAVE_WIDTH && ny >= 0 && ny < CAVE_HEIGHT && this.map[ny][nx] !== Tile.Wall) {
            bat.targetX = nx;
            bat.targetY = ny;
          }
        } else {
          const mx = dx !== 0 ? Math.sign(dx) : 0;
          const my = dy !== 0 ? Math.sign(dy) : 0;
          const bnx = bat.x + mx;
          const bny = bat.y + my;
          if (bnx >= 0 && bnx < CAVE_WIDTH && bny >= 0 && bny < CAVE_HEIGHT && this.map[bny][bnx] !== Tile.Wall) {
            bat.x = bnx;
            bat.y = bny;
          } else {
            bat.targetX = bat.x;
            bat.targetY = bat.y;
          }
        }
      }

      // Bat collision with player
      if (bat.x === this.playerTileX && bat.y === this.playerTileY) {
        this.torchFuel = Math.max(0, this.torchFuel - 0.1);
        this.shakeIntensity = 8;
        bat.targetX = bat.x + (Math.random() > 0.5 ? 5 : -5);
        bat.targetY = bat.y + (Math.random() > 0.5 ? 5 : -5);
        for (let i = 0; i < 8; i++) {
          this.spawnParticle(
            bat.x * TILE_SIZE + TILE_SIZE / 2,
            bat.y * TILE_SIZE + TILE_SIZE / 2,
            '#ff4040'
          );
        }
      }
    }

    // Movement
    this.moveTimer -= dt;
    const moveDelay = 0.1;

    if (this.moveTimer <= 0) {
      const mx = this.input.moveX;
      const my = this.input.moveY;

      if (mx !== 0 || my !== 0) {
        const nx = this.playerTileX + mx;
        const ny = this.playerTileY + my;

        if (this.canMove(nx, ny)) {
          // Dust trail
          this.spawnParticle(
            this.playerTileX * TILE_SIZE + TILE_SIZE / 2,
            this.playerTileY * TILE_SIZE + TILE_SIZE / 2 + 6,
            '#8a7a50'
          );

          this.playerTileX = nx;
          this.playerTileY = ny;
          this.moveTimer = moveDelay;
          this.audio.playStep();
          this.minimap.reveal(nx, ny, 6);

          const tile = this.map[ny][nx];
          if (tile === Tile.Gem) {
            this.gems++;
            this.map[ny][nx] = Tile.Floor;
            this.updateHUD();
            this.audio.playPickup();
            this.shakeIntensity = 4;
            this.torchFuel = Math.min(1, this.torchFuel + 0.05);
            for (let i = 0; i < 12; i++) {
              this.spawnParticle(
                nx * TILE_SIZE + TILE_SIZE / 2,
                ny * TILE_SIZE + TILE_SIZE / 2,
                '#60e0f0'
              );
            }
          } else if (tile === Tile.Fuel) {
            this.map[ny][nx] = Tile.Floor;
            this.torchFuel = Math.min(1, this.torchFuel + 0.25);
            this.audio.playPickup();
            this.shakeIntensity = 3;
            for (let i = 0; i < 10; i++) {
              this.spawnParticle(
                nx * TILE_SIZE + TILE_SIZE / 2,
                ny * TILE_SIZE + TILE_SIZE / 2,
                '#ff8020'
              );
            }
          } else if (tile === Tile.Exit) {
            this.audio.playDescend();
            this.shakeIntensity = 12;
            this.fading = 'out';
            return;
          }
        }
      }
    }

    // Smooth player interpolation
    const lerpSpeed = 1 - Math.pow(0.00001, dt);
    this.playerRenderX += (this.playerTileX - this.playerRenderX) * lerpSpeed;
    this.playerRenderY += (this.playerTileY - this.playerRenderY) * lerpSpeed;

    // Camera
    const targetCamX = this.playerRenderX * TILE_SIZE + TILE_SIZE / 2 - this.canvas.clientWidth / 2;
    const targetCamY = this.playerRenderY * TILE_SIZE + TILE_SIZE / 2 - this.canvas.clientHeight / 2;

    const maxCamX = CAVE_WIDTH * TILE_SIZE - this.canvas.clientWidth;
    const maxCamY = CAVE_HEIGHT * TILE_SIZE - this.canvas.clientHeight;

    const clampedX = Math.max(0, Math.min(targetCamX, maxCamX));
    const clampedY = Math.max(0, Math.min(targetCamY, maxCamY));

    const camLerp = 1 - Math.pow(0.001, dt);
    this.cameraX += (clampedX - this.cameraX) * camLerp;
    this.cameraY += (clampedY - this.cameraY) * camLerp;

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 20 * dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private canMove(x: number, y: number): boolean {
    if (x < 0 || x >= CAVE_WIDTH || y < 0 || y >= CAVE_HEIGHT) return false;
    return this.map[y][x] !== Tile.Wall;
  }

  private spawnParticle(x: number, y: number, color: string): void {
    const angle = Math.random() * Math.PI * 2;
    const speed = 20 + Math.random() * 60;
    this.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30,
      life: 0.5 + Math.random() * 0.8,
      maxLife: 1.3,
      color,
    });
  }
}
