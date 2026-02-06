import { getEnabledElement } from './enabledElements.js';
import getStoredPixels from './getStoredPixels.js';
import getModalityLUT from './internal/getModalityLUT.js';
import { default as imageCache } from './imageCache.js';

/**
 * Retrieves an array of pixels from a rectangular region with modality LUT transformation applied
 *
 * @param {HTMLElement} element The DOM element enabled for Cornerstone
 * @param {Number} x The x coordinate of the top left corner of the sampling rectangle in image coordinates
 * @param {Number} y The y coordinate of the top left corner of the sampling rectangle in image coordinates
 * @param {Number} width The width of the of the sampling rectangle in image coordinates
 * @param {Number} height The height of the of the sampling rectangle in image coordinates
 * @returns {Array} The modality pixel value of the pixels in the sampling rectangle
 */
export default function (element, x, y, width, height, options = { hqImageId: undefined }) {
  const storedPixels = getStoredPixels(element, x, y, width, height, options);
  const ee = getEnabledElement(element);

  const { slope, intercept } = getSlopeAndIntercept(ee, options.hqImageId);

  const mlutfn = getModalityLUT(slope, intercept, ee.viewport.modalityLUT);

  return storedPixels.map(mlutfn);
}


/**
 * Determines the slope and intercept values to use for modality LUT.
 * If `hqImageId` is provided and a corresponding image is found loaded
 * in the Cornerstone cache, returns its slope and intercept. Otherwise,
 * falls back to the current enabled element's image values.
 *
 * @param {Object} enabledElement - Cornerstone enabled element with the current image.
 * @param {String} [hqImageId] - Optional high-quality image ID to prefer for pixel data when available.
 * @returns {{ slope: number, intercept: number }} Selected slope and intercept for LUT.
 */
function getSlopeAndIntercept (enabledElement, hqImageId) {
  let { slope, intercept } = enabledElement.image;

  if (hqImageId !== undefined) {
    const foundHQImage = imageCache.imageCache[hqImageId];

    if (foundHQImage && foundHQImage.loaded) {
      slope = foundHQImage.image.slope;
      intercept = foundHQImage.image.intercept;
    }
  }

  return {
    slope,
    intercept
  };

}
