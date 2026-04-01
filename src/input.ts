export class InputManager {
  private keys = new Set<string>();
  private touchX = 0;
  private touchY = 0;
  private touchActive = false;
  private joystickEl: HTMLElement | null = null;
  private knobEl: HTMLElement | null = null;
  private joystickOriginX = 0;
  private joystickOriginY = 0;

  constructor() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });

    if ('ontouchstart' in window) {
      this.createJoystick();
    }
  }

  private createJoystick(): void {
    this.joystickEl = document.createElement('div');
    this.joystickEl.style.cssText = `
      position: fixed; bottom: 40px; left: 40px; width: 120px; height: 120px;
      border-radius: 50%; border: 2px solid rgba(240,192,64,0.4);
      background: rgba(0,0,0,0.3); z-index: 30; touch-action: none;
    `;
    this.knobEl = document.createElement('div');
    this.knobEl.style.cssText = `
      position: absolute; width: 50px; height: 50px; border-radius: 50%;
      background: rgba(240,192,64,0.5); top: 35px; left: 35px;
      transition: transform 0.05s;
    `;
    this.joystickEl.appendChild(this.knobEl);
    document.getElementById('app')!.appendChild(this.joystickEl);

    this.joystickEl.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.touchActive = true;
      const rect = this.joystickEl!.getBoundingClientRect();
      this.joystickOriginX = rect.left + rect.width / 2;
      this.joystickOriginY = rect.top + rect.height / 2;
      this.handleTouch(e.touches[0]);
    });

    window.addEventListener('touchmove', (e) => {
      if (this.touchActive) {
        e.preventDefault();
        this.handleTouch(e.touches[0]);
      }
    }, { passive: false });

    window.addEventListener('touchend', () => {
      this.touchActive = false;
      this.touchX = 0;
      this.touchY = 0;
      if (this.knobEl) {
        this.knobEl.style.transform = 'translate(0px, 0px)';
      }
    });
  }

  private handleTouch(touch: Touch): void {
    const dx = touch.clientX - this.joystickOriginX;
    const dy = touch.clientY - this.joystickOriginY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = 40;
    const clampedDist = Math.min(dist, maxDist);
    const angle = Math.atan2(dy, dx);

    const clampedX = Math.cos(angle) * clampedDist;
    const clampedY = Math.sin(angle) * clampedDist;

    if (this.knobEl) {
      this.knobEl.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
    }

    const deadzone = 15;
    if (dist > deadzone) {
      this.touchX = Math.abs(dx) > deadzone ? Math.sign(dx) : 0;
      this.touchY = Math.abs(dy) > deadzone ? Math.sign(dy) : 0;
    } else {
      this.touchX = 0;
      this.touchY = 0;
    }
  }

  isDown(key: string): boolean {
    return this.keys.has(key);
  }

  get moveX(): number {
    if (this.touchActive) return this.touchX;
    let x = 0;
    if (this.isDown('a') || this.isDown('arrowleft')) x -= 1;
    if (this.isDown('d') || this.isDown('arrowright')) x += 1;
    return x;
  }

  get moveY(): number {
    if (this.touchActive) return this.touchY;
    let y = 0;
    if (this.isDown('w') || this.isDown('arrowup')) y -= 1;
    if (this.isDown('s') || this.isDown('arrowdown')) y += 1;
    return y;
  }
}
