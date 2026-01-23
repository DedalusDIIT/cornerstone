import { getEnabledElement } from './enabledElements.js';
import { default as imageCache } from './imageCache.js';

/**
 * Retrieves an array of stored pixel values from a rectangular region of an image
 *
 * @param {HTMLElement} element The DOM element enabled for Cornerstone
 * @param {Number} x The x coordinate of the top left corner of the sampling rectangle in image coordinates
 * @param {Number} y The y coordinate of the top left corner of the sampling rectangle in image coordinates
 * @param {Number} width The width of the of the sampling rectangle in image coordinates
 * @param {Number} height The height of the of the sampling rectangle in image coordinates
 * @param {Object} options Optional parameters
 * @param {String} options.hqImageId Optional high quality image ID to use for pixel data
 * @returns {Array} The stored pixel value of the pixels in the sampling rectangle
 */
export default function (element, x, y, width, height, options = { hqImageId: undefined }) {
  if (element === undefined) {
    throw new Error('getStoredPixels: parameter element must not be undefined');
  }

  x = Math.round(x);
  y = Math.round(y);

  const enabledElement = getEnabledElement(element);

  const pixelData = getPixelData(enabledElement, options.hqImageId);

  const storedPixels = [];
  let index = 0;

  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      const spIndex = ((row + y) * enabledElement.image.columns) + (column + x);

      storedPixels[index++] = pixelData[spIndex];
    }
  }

  return storedPixels;
}

/**
 * Selects the pixel data source for sampling.
 * If a valid high-quality image ID is provided and the image is found and loaded 
 * in the Cornerstone cache, the function returns its pixel data.
 * Otherwise, it falls back to the current enabled element's image pixel data.
 *
 * @param {Object} enabledElement - Cornerstone enabled element with the current image.
 * @param {String} [hqImageId] - Optional high-quality image ID to prefer for pixel data when available.
 * @returns {Array} Pixel data to use for sampling operations.
 */
function getPixelData (enabledElement, hqImageId) {
  let pixelData = enabledElement.image.getPixelData();

  if (hqImageId !== undefined) {
    const foundHQImage = imageCache.imageCache[hqImageId];

    if (foundHQImage && foundHQImage.loaded) {
      pixelData = foundHQImage.image.getPixelData();
    }
  }

  return pixelData;
}
