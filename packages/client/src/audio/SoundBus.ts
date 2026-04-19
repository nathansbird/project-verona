import { Howl } from 'howler';

export type SoundEvent = 'shoot' | 'hit' | 'bump' | 'reload' | 'newPlayer';

const MAP: Record<SoundEvent, string> = {
  shoot: '/audio/shooting.wav',
  hit: '/audio/hover.wav',
  bump: '/audio/bump.wav',
  reload: '/audio/money_in.wav',
  newPlayer: '/audio/new_player.wav',
};

export class SoundBus {
  private cache = new Map<SoundEvent, Howl>();

  play(event: SoundEvent, volume = 1): void {
    let sound = this.cache.get(event);
    if (!sound) {
      sound = new Howl({ src: [MAP[event]], volume });
      this.cache.set(event, sound);
    }
    sound.volume(volume);
    sound.play();
  }
}
