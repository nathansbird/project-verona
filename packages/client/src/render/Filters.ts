import { AdvancedBloomFilter, CRTFilter } from 'pixi-filters';
import { Container } from 'pixi.js';

export function applyBloom(target: Container): void {
  const bloom = new AdvancedBloomFilter({
    threshold: 0.25,
    bloomScale: 1.1,
    brightness: 1,
    blur: 6,
    quality: 6,
  });
  // AdvancedBloomFilter does not propagate its inner Kawase blur padding,
  // so without this the halo gets clipped to content bounds.
  bloom.padding = 32;
  // Filter.resolution defaults to 1, which rasterizes bloomed content at 1x
  // even on HiDPI displays. Inherit the renderer's resolution to keep it crisp.
  bloom.resolution = 'inherit';
  target.filters = [bloom];
}

export function applyCRT(target: Container): void {
  const crt = new CRTFilter({
    lineWidth: 3,
    lineContrast: 0.15,
    curvature: 0,
    noise: 0,
    noiseSize: 1,
    vignetting: 0,
    vignettingAlpha: 0,
    vignettingBlur: 0,
    verticalLine: false,
    seed: 0,
    time: 0,
  });
  crt.resolution = 'inherit';
  const existing = target.filters;
  const prior = Array.isArray(existing) ? existing : existing ? [existing] : [];
  target.filters = [...prior, crt];
}
