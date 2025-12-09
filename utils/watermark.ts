/**
 * jusDNCE Audio-Reactive Watermark System
 * A Paul Phillips Manifestation
 *
 * RGB waveform watermark that responds to audio frequency bands
 * Red = Bass, Green = Mid, Blue = High
 *
 * © 2025 Paul Phillips - Clear Seas Solutions LLC
 */

export interface AudioBands {
  bass: number;   // 0-1 (bins 2-7, 86-258Hz)
  mid: number;    // 0-1 (bins 40-90, 1.7k-3.8kHz)
  high: number;   // 0-1 (bins 200-400, 8k+Hz)
}

/**
 * Extract audio bands from frequency data array
 */
export function extractAudioBands(freqData: Uint8Array): AudioBands {
  const bass = freqData.slice(2, 7).reduce((a, b) => a + b, 0) / 5 / 255;
  const mid = freqData.slice(40, 90).reduce((a, b) => a + b, 0) / 50 / 255;
  const high = freqData.slice(200, Math.min(400, freqData.length)).reduce((a, b) => a + b, 0) / 200 / 255;
  return { bass, mid, high };
}

/**
 * Draw a single waveform line that forms text
 */
function drawWaveformLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  yOffset: number,
  audioIntensity: number,
  time: number,
  color: string
) {
  const amplitude = 20 + audioIntensity * 40; // Wave height
  const frequency = 0.02 + audioIntensity * 0.01; // Wave density
  const speed = time * 0.002;

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2 + audioIntensity * 6;

  const startX = -width / 2;
  const endX = width / 2;
  const steps = 200;
  const stepSize = width / steps;

  for (let i = 0; i <= steps; i++) {
    const x = startX + i * stepSize;
    const progress = i / steps;

    // Create wave pattern - multiple sine waves for organic look
    const wave1 = Math.sin(x * frequency + speed) * amplitude;
    const wave2 = Math.sin(x * frequency * 2.3 + speed * 1.5) * amplitude * 0.5;
    const wave3 = Math.sin(x * frequency * 0.7 + speed * 0.8) * amplitude * 0.3;

    // Audio pulse effect
    const pulse = Math.sin(time * 0.01 + progress * Math.PI * 2) * audioIntensity * 15;

    const y = yOffset + wave1 + wave2 + wave3 + pulse;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();
}

/**
 * Draw the complete audio-reactive RGB watermark
 *
 * @param ctx - Canvas 2D context
 * @param width - Canvas width
 * @param height - Canvas height
 * @param audio - Audio frequency bands (bass, mid, high)
 * @param time - Current time in ms for animation
 */
export function drawAudioReactiveWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  audio: AudioBands,
  time: number
) {
  ctx.save();

  // Position at center, rotated -45 degrees
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 4);

  const waveWidth = Math.max(width, height) * 1.5;

  // RGB channels with moiré offset based on audio
  const channels = [
    { color: 'rgba(255, 50, 50, 0.4)', audio: audio.bass, baseOffset: -25 },   // Red = Bass
    { color: 'rgba(50, 255, 50, 0.4)', audio: audio.mid, baseOffset: 0 },      // Green = Mid
    { color: 'rgba(50, 50, 255, 0.4)', audio: audio.high, baseOffset: 25 },    // Blue = High
  ];

  // Enable additive blending for RGB overlap
  ctx.globalCompositeOperation = 'screen';

  channels.forEach((channel) => {
    const dynamicOffset = channel.baseOffset + channel.audio * 15 * Math.sign(channel.baseOffset || 1);
    const brightness = 0.3 + channel.audio * 0.5;

    ctx.globalAlpha = brightness;

    // Draw multiple lines for thicker text effect
    for (let line = -2; line <= 2; line++) {
      drawWaveformLine(
        ctx,
        'jusDNCE',
        waveWidth,
        dynamicOffset + line * 8,
        channel.audio,
        time + line * 100,
        channel.color
      );
    }
  });

  // Draw the actual text on top with glow
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 0.15 + (audio.bass + audio.mid + audio.high) / 3 * 0.2;

  const fontSize = Math.min(width, height) * 0.12;
  ctx.font = `bold ${fontSize}px 'Rajdhani', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Glow effect
  ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
  ctx.shadowBlur = 10 + audio.bass * 20;

  // RGB text offset for chromatic aberration
  const textOffset = 2 + audio.high * 5;

  ctx.fillStyle = 'rgba(255, 50, 50, 0.5)';
  ctx.fillText('jusDNCE', -textOffset, -textOffset);

  ctx.fillStyle = 'rgba(50, 255, 50, 0.5)';
  ctx.fillText('jusDNCE', 0, 0);

  ctx.fillStyle = 'rgba(50, 50, 255, 0.5)';
  ctx.fillText('jusDNCE', textOffset, textOffset);

  // Main white text
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.shadowBlur = 5;
  ctx.fillText('jusDNCE', 0, 0);

  ctx.restore();
}

/**
 * Generate watermark code as a string for embedding in exported HTML
 */
export function getWatermarkCode(): string {
  return `
// jusDNCE Audio-Reactive Watermark
function extractAudioBands(freqData) {
  const bass = freqData.slice(2, 7).reduce((a, b) => a + b, 0) / 5 / 255;
  const mid = freqData.slice(40, 90).reduce((a, b) => a + b, 0) / 50 / 255;
  const high = freqData.slice(200, Math.min(400, freqData.length)).reduce((a, b) => a + b, 0) / 200 / 255;
  return { bass, mid, high };
}

function drawWaveformLine(ctx, width, yOffset, audioIntensity, time, color) {
  const amplitude = 20 + audioIntensity * 40;
  const frequency = 0.02 + audioIntensity * 0.01;
  const speed = time * 0.002;

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2 + audioIntensity * 6;

  const startX = -width / 2;
  const steps = 200;
  const stepSize = width / steps;

  for (let i = 0; i <= steps; i++) {
    const x = startX + i * stepSize;
    const progress = i / steps;
    const wave1 = Math.sin(x * frequency + speed) * amplitude;
    const wave2 = Math.sin(x * frequency * 2.3 + speed * 1.5) * amplitude * 0.5;
    const wave3 = Math.sin(x * frequency * 0.7 + speed * 0.8) * amplitude * 0.3;
    const pulse = Math.sin(time * 0.01 + progress * Math.PI * 2) * audioIntensity * 15;
    const y = yOffset + wave1 + wave2 + wave3 + pulse;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawAudioReactiveWatermark(ctx, width, height, audio, time) {
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 4);

  const waveWidth = Math.max(width, height) * 1.5;
  const channels = [
    { color: 'rgba(255, 50, 50, 0.4)', audio: audio.bass, baseOffset: -25 },
    { color: 'rgba(50, 255, 50, 0.4)', audio: audio.mid, baseOffset: 0 },
    { color: 'rgba(50, 50, 255, 0.4)', audio: audio.high, baseOffset: 25 },
  ];

  ctx.globalCompositeOperation = 'screen';

  channels.forEach((ch) => {
    const offset = ch.baseOffset + ch.audio * 15 * Math.sign(ch.baseOffset || 1);
    ctx.globalAlpha = 0.3 + ch.audio * 0.5;
    for (let line = -2; line <= 2; line++) {
      drawWaveformLine(ctx, waveWidth, offset + line * 8, ch.audio, time + line * 100, ch.color);
    }
  });

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 0.15 + (audio.bass + audio.mid + audio.high) / 3 * 0.2;

  const fontSize = Math.min(width, height) * 0.12;
  ctx.font = 'bold ' + fontSize + 'px Rajdhani, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
  ctx.shadowBlur = 10 + audio.bass * 20;

  const textOffset = 2 + audio.high * 5;
  ctx.fillStyle = 'rgba(255, 50, 50, 0.5)';
  ctx.fillText('jusDNCE', -textOffset, -textOffset);
  ctx.fillStyle = 'rgba(50, 255, 50, 0.5)';
  ctx.fillText('jusDNCE', 0, 0);
  ctx.fillStyle = 'rgba(50, 50, 255, 0.5)';
  ctx.fillText('jusDNCE', textOffset, textOffset);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.shadowBlur = 5;
  ctx.fillText('jusDNCE', 0, 0);

  ctx.restore();
}
`;
}
