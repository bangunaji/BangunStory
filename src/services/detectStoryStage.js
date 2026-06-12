/**
 * Automatically determine the story's current stage based on chapter position.
 *
 * @param {number} currentOrder - the `order` value of the current scene/chapter (1-based)
 * @param {number} totalChapters - total number of chapters/scenes planned (or written so far)
 * @returns {"beginning" | "middle" | "ending"}
 *
 * Logic:
 * - First ~25% of chapters -> "beginning"
 * - Last ~20% of chapters  -> "ending"
 * - Everything in between  -> "middle"
 *
 * If totalChapters is unknown or too small to judge reliably, falls back to "middle".
 */
export function detectStoryStage(currentOrder, totalChapters) {
  if (!totalChapters || totalChapters < 3) {
    return "middle";
  }

  const progress = currentOrder / totalChapters;

  if (progress <= 0.25) {
    return "beginning";
  }

  if (progress >= 0.8) {
    return "ending";
  }

  return "middle";
}
