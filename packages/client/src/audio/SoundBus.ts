import { Howl } from 'howler';

export type SoundEvent = 'shoot' | 'hit' | 'bump' | 'reload' | 'newPlayer' | 'music' | 'die';

interface SoundDef {
  src: string;
  loop?: boolean;
}

const MAP: Record<SoundEvent, SoundDef> = {
  shoot: { src: '/audio/shooting.wav', loop: true },
  hit: { src: '/audio/money_out.wav' },
  bump: { src: '/audio/bump.wav' },
  reload: { src: '/audio/money_in.wav' },
  newPlayer: { src: '/audio/new_player.wav' },
  music: { src: '/audio/atmosphere.wav', loop: true },
  die: { src: '/audio/die.wav' },
};

export class SoundBus {
  private cache = new Map<SoundEvent, Howl>();

  private get(event: SoundEvent): Howl {
    let sound = this.cache.get(event);
    if (!sound) {
      const def = MAP[event];
      sound = new Howl({ src: [def.src], loop: def.loop ?? false });
      this.cache.set(event, sound);
    }
    return sound;
  }

  play(event: SoundEvent, volume = 1): void {
    const sound = this.get(event);
    sound.volume(volume);
    sound.play();
  }

  start(event: SoundEvent, volume = 1): void {
    const sound = this.get(event);
    if (sound.playing()) return;
    sound.volume(volume);
    sound.play();
  }

  stop(event: SoundEvent): void {
    const sound = this.cache.get(event);
    if (!sound) return;
    sound.stop();
  }
}
