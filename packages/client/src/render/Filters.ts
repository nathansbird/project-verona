import { Container } from 'pixi.js';
import { AdvancedBloomFilter } from 'pixi-filters';

export function applyBloom(target: Container): void {
  const bloom = new AdvancedBloomFilter({
    threshold: 0.25,
    bloomScale: 1.1,
    brightness: 1,
    blur: 6,
    quality: 6,
  });
  target.filters = [bloom];
}
