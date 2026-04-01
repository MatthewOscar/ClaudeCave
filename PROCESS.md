# ClaudeCave - Iterative Development Process

## Overview

ClaudeCave is a procedurally generated cave exploration game built from scratch in a blank repository over 5 iterative development cycles. Each cycle involved building features, evaluating the result, identifying 5 improvements, and implementing them.

**Tech Stack**: Vite + TypeScript + HTML5 Canvas  
**Total Build Size**: ~23KB JS + ~2.3KB CSS (gzipped: ~8KB total)

---

## Cycle 1: Foundation

**Goal**: Build the core game from nothing.

**TODO List**:
1. Initialize Vite + TypeScript project
2. Build procedural cave generation (cellular automata)
3. Implement canvas rendering with torch/lighting effect
4. Add player movement and collision detection
5. Add collectibles (gems) and basic game loop

**What was built**:
- Cellular automata cave generation with flood-fill connectivity
- Canvas renderer with radial gradient torch lighting
- Tile-based movement with WASD/arrow key support
- Gems scattered throughout caves with particle effects on pickup
- Exit tiles that advance to deeper, progressively harder caves
- Title screen with "Enter the Cave" button

**Evaluation**: TypeScript compiled clean, Vite build succeeded, dev server served HTML correctly. The game was playable but felt bare.

---

## Cycle 2: Polish & Accessibility

**5 Improvements Identified**:
1. No sound - silent game feels lifeless
2. No minimap - easy to get lost in large caves
3. Tile-snapping movement - player teleports between tiles
4. Abrupt level transitions - instant level loading is jarring
5. No mobile support - touch users can't play

**TODO List**:
1. Add Web Audio API sound effects (pickup, step, descend, ambient drip)
2. Add fog-of-war minimap showing explored areas
3. Smooth sub-tile player interpolation
4. Fade-to-black level transition animation
5. Virtual joystick touch controls for mobile

**What was built**:
- `AudioManager` class with synthesized sounds using oscillators and noise buffers
- `Minimap` class rendering explored tiles in bottom-right corner
- Smooth lerp-based rendering position separate from tile position
- Fade out/in transitions when descending to new levels
- Touch-based virtual joystick with deadzone detection

---

## Cycle 3: Depth & Challenge

**5 Improvements Identified**:
1. Bland walls - all tiles look the same
2. No enemies - no danger besides time
3. No resource management - no tension
4. No game feel - impacts feel flat
5. No persistence - scores lost on refresh

**TODO List**:
1. Add cave decorations (stalactites, moss, cracks)
2. Add bat enemies that wander the cave
3. Add torch fuel mechanic (light shrinks over time)
4. Add screen shake on impacts
5. Add localStorage high score tracking

**What was built**:
- Procedural decoration system: stalactites near ceilings, moss near floors, random cracks
- Bat entities with wandering AI, red eyes, animated wings
- Torch fuel bar that depletes over time; gems restore small amounts
- Screen shake system with exponential decay
- High score persisted via localStorage, displayed in HUD

---

## Cycle 4: Game Feel & Visual Variety

**5 Improvements Identified**:
1. No game over state - torch hits 0% with no consequence
2. Monotone visuals - same brown every level
3. No movement feedback - player glides silently
4. No level announcement - unclear when depth changes
5. Dumb bats - enemies wander aimlessly

**TODO List**:
1. Game over screen with restart when torch dies
2. Biome color themes that rotate with depth (earth/ice/crystal/jungle/lava)
3. Dust trail particles behind the player
4. "Depth X" announcement overlay on level entry
5. Bat chase AI with alert radius

**What was built**:
- Game over screen showing final stats with restart button
- 5 distinct cave biome color palettes cycling every depth
- Dust particles spawning behind player on movement
- Centered depth announcement with fade transition
- Bats now chase player when within 8 tiles Manhattan distance, moving faster

---

## Cycle 5: Content & Refinement

**5 Improvements Identified**:
1. Torch runs out too fast - no way to refuel besides gems
2. No ambient music - cave feels dead between drips
3. Bare game over - only shows gems and depth
4. Flat walls - no visual depth perception
5. No documentation

**TODO List**:
1. Add torch fuel pickup items scattered in caves
2. Add procedural ambient background drone music
3. Show detailed stats on game over (time, gems/minute)
4. Add wall edge shadow rendering for pseudo-3D depth
5. Write PROCESS.md

**What was built**:
- `Fuel` tile type with flame-shaped orange pickups, restoring 25% torch
- Low ambient drone notes using sine oscillators at bass frequencies
- Game over screen now shows: gems, depth, play time, gems per minute
- Wall edge shadows (top and left edges cast shadow onto adjacent floor)
- This document

---

## Architecture

```
src/
  main.ts       - Entry point, title screen handler
  game.ts       - Game loop, state, physics, AI, collision
  cave.ts       - Procedural cave generation (cellular automata)
  renderer.ts   - Canvas rendering, lighting, particles, decorations
  input.ts      - Keyboard + touch input management
  audio.ts      - Web Audio API sound synthesis
  minimap.ts    - Fog-of-war minimap overlay
  styles.css    - UI styling (HUD, title, game over)
```

## Key Algorithms

- **Cave Generation**: Random fill → 5 passes of cellular automata (B5678/S45678 rule variant) → flood-fill to find disconnected regions → tunnel carving to connect them
- **Lighting**: Radial gradient mask composited via `destination-out` with flicker using layered sine waves
- **Bat AI**: Wander randomly when far from player; chase at increased speed when within 8-tile Manhattan distance
- **Screen Shake**: Set intensity on events, decay exponentially each frame, apply random offset to camera

## Metrics

| Cycle | Features Added | Build Size (JS) |
|-------|---------------|------------------|
| 1     | 5 (core)      | 9.85 KB          |
| 2     | 5 (polish)    | 15.68 KB         |
| 3     | 5 (depth)     | 19.55 KB         |
| 4     | 5 (feel)      | 21.26 KB         |
| 5     | 5 (content)   | 23.16 KB         |

**Total**: 25 features across 5 cycles, 8 source files, ~23KB production bundle.
