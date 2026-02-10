export class InputManager {
  private keys: Set<string> = new Set();
  private justPressed: Set<string> = new Set();
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;

  constructor() {
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
  }

  attach(): void {
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
  }

  detach(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    this.keys.clear();
    this.justPressed.clear();
  }

  private onKeyDown(e: KeyboardEvent): void {
    // Prevent default for game keys
    if (
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'w', 'a', 's', 'd'].includes(e.key)
    ) {
      e.preventDefault();
    }
    if (!this.keys.has(e.key)) {
      this.justPressed.add(e.key);
    }
    this.keys.add(e.key);
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.key);
  }

  isDown(key: string): boolean {
    return this.keys.has(key);
  }

  wasJustPressed(key: string): boolean {
    return this.justPressed.has(key);
  }

  clearJustPressed(): void {
    this.justPressed.clear();
  }

  // Convenience methods
  get rotateLeft(): boolean {
    return this.isDown('ArrowLeft') || this.isDown('a') || this.isDown('A');
  }

  get rotateRight(): boolean {
    return this.isDown('ArrowRight') || this.isDown('d') || this.isDown('D');
  }

  get thrust(): boolean {
    return this.isDown('ArrowUp') || this.isDown('w') || this.isDown('W');
  }

  get shoot(): boolean {
    return this.wasJustPressed(' ');
  }

  get start(): boolean {
    return this.wasJustPressed(' ');
  }
}
