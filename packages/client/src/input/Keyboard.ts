import { InputFrame } from '@glide/shared';

export class KeyboardInput {
  private down = new Set<string>();
  private seq = 0;

  constructor() {
    window.addEventListener('keydown', (e) => this.down.add(e.code));
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
  }

  sampleFrame(): InputFrame {
    this.seq += 1;
    return {
      seq: this.seq,
      accel: this.down.has('KeyW') || this.down.has('ArrowUp'),
      left: this.down.has('KeyA') || this.down.has('ArrowLeft'),
      right: this.down.has('KeyD') || this.down.has('ArrowRight'),
      brake: this.down.has('KeyS') || this.down.has('ArrowDown'),
      shoot: this.down.has('Space'),
      reload: this.down.has('KeyR'),
    };
  }
}
