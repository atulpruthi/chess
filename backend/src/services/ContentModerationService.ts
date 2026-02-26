/**
 * ContentModerationService
 *
 * Uses nsfwjs (NSFW.js) backed by TensorFlow.js to classify images and
 * block uploads that contain nudity, explicit sexual content, or obscene material.
 *
 * Categories returned by the model:
 *  - Neutral  → safe content (news, nature, etc.)
 *  - Drawing  → neutral illustrations / artwork
 *  - Porn     → explicit sexual / nudity content          → blocked
 *  - Hentai   → explicit animated / obscene content       → blocked
 *  - Sexy     → suggestive / sexual signage               → blocked above threshold
 */

import * as tf from '@tensorflow/tfjs-node';
import * as nsfwjs from 'nsfwjs';

// Thresholds — tweak to balance false-positives vs. false-negatives
const THRESHOLDS: Record<string, number> = {
  Porn: 0.50,    // explicit nudity / sexual content
  Hentai: 0.50,  // explicit animated / obscene imagery
  Sexy: 0.70,    // highly suggestive / sexual signage
};

export interface ModerationResult {
  /** true = image is safe to store; false = image should be rejected */
  safe: boolean;
  /** Human-readable reason when safe === false */
  reason?: string;
  /** Raw model predictions for logging / debugging */
  predictions: Array<{ className: string; probability: number }>;
}

let _model: nsfwjs.NSFWJS | null = null;

/**
 * Lazily load and cache the nsfwjs model.
 * The first call downloads the model weights; subsequent calls return the cached instance.
 */
async function getModel(): Promise<nsfwjs.NSFWJS> {
  if (!_model) {
    console.log('[ContentModeration] Loading nsfwjs model…');
    // inceptionv3 is the most accurate bundled model
    _model = await nsfwjs.load('InceptionV3', { type: 'graph' });
    console.log('[ContentModeration] Model ready.');
  }
  return _model;
}

/**
 * Analyse an image buffer and return a moderation decision.
 *
 * @param buffer  Raw bytes of the uploaded image (PNG / JPEG / GIF / WEBP)
 * @returns       ModerationResult with `safe` flag and optional `reason`
 */
export async function analyzeImage(buffer: Buffer): Promise<ModerationResult> {
  let imageTensor: tf.Tensor3D | tf.Tensor4D | null = null;

  try {
    const model = await getModel();

    // Decode the raw bytes into a 3-channel RGB tensor
    imageTensor = tf.node.decodeImage(buffer, 3) as tf.Tensor3D;

    const predictions = await model.classify(imageTensor as tf.Tensor3D);

    const formatted = predictions.map((p) => ({
      className: p.className,
      probability: Math.round(p.probability * 1000) / 1000,
    }));

    // Check each flagged category against its threshold
    for (const { className, probability } of formatted) {
      const threshold = THRESHOLDS[className];
      if (threshold !== undefined && probability >= threshold) {
        const label =
          className === 'Porn'
            ? 'nudity or explicit sexual content'
            : className === 'Hentai'
            ? 'obscene or explicit animated content'
            : 'sexually suggestive content';

        console.warn(
          `[ContentModeration] Image rejected — ${className}: ${(probability * 100).toFixed(1)}% (threshold ${(threshold * 100).toFixed(0)}%)`
        );

        return {
          safe: false,
          reason: `Image rejected: detected ${label}. Please upload an appropriate profile photo.`,
          predictions: formatted,
        };
      }
    }

    return { safe: true, predictions: formatted };
  } catch (error) {
    console.error('[ContentModeration] Analysis error:', error);
    // Fail-open: if the model errors unexpectedly, let the upload through
    // but log for investigation. Change to fail-closed (return safe:false)
    // if you prefer stricter behaviour.
    return {
      safe: true,
      reason: 'Moderation check skipped due to an internal error.',
      predictions: [],
    };
  } finally {
    imageTensor?.dispose();
  }
}
