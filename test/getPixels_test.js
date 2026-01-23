import { assert } from 'chai'; // eslint-disable-line import/extensions

import enable from '../src/enable.js';
import displayImage from '../src/displayImage.js';
import getPixels from '../src/getPixels.js';
import disable from '../src/disable.js';
import { default as imageCache } from '../src/imageCache.js';

describe('getPixels', function () {
  beforeEach(function () {
    // Arrange
    this.element = document.createElement('div');
    const height = 3;
    const width = 3;

    const getPixelData = () => new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    // 1   2   3
    // 4   5   6
    // 7   8   9

    this.image = {
      imageId: 'exampleImageId',
      minPixelValue: 0,
      maxPixelValue: 255,
      slope: 3.0,
      intercept: 5,
      windowCenter: 127,
      windowWidth: 256,
      getPixelData,
      rows: height,
      columns: width,
      height,
      width,
      color: false,
      sizeInBytes: width * height * 2
    };

    enable(this.element);
    displayImage(this.element, this.image);
  });

  it('should retrieve the stored pixel values in a rectangular region', function () {
    // Arrange
    const element = this.element;
    const mlutfn = (value) => value * this.image.slope + this.image.intercept;

    // Act
    const storedPixels1 = getPixels(element, 1, 1, 2, 2);
    const storedPixels2 = getPixels(element, 0, 0, 1, 1);
    const storedPixels3 = getPixels(element, 0, 1, 2, 2);

    // Assert
    assert.deepEqual(storedPixels1, [5, 6, 8, 9].map(mlutfn));
    assert.deepEqual(storedPixels2, [1].map(mlutfn));
    assert.deepEqual(storedPixels3, [4, 5, 7, 8].map(mlutfn));
  });

  it('should use HQ image pixel data and slope/intercept when available', function () {
    // Arrange
    const element = this.element;

    // HQ image setup in cache
    const hqImageId = 'hq-exampleImageId';
    const hqGetPixelData = () => new Uint8Array([10, 11, 12, 13, 14, 15, 16, 17, 18]);
    imageCache.imageCache[hqImageId] = {
      image: {
        slope: 2.0,
        intercept: -1,
        getPixelData: hqGetPixelData
      },
      loaded: true
    };

    const mlutfnHQ = (value) => value * 2.0 + (-1);

    // Act
    const pixelsHQ1 = getPixels(element, 1, 1, 2, 2, { hqImageId });
    const pixelsHQ2 = getPixels(element, 0, 0, 1, 1, { hqImageId });
    const pixelsHQ3 = getPixels(element, 0, 1, 2, 2, { hqImageId });

    // Assert (using HQ pixel data and HQ slope/intercept)
    // From HQ pixelData:
    // 10 11 12
    // 13 14 15
    // 16 17 18
    // Regions mirror the default test
    assert.deepEqual(pixelsHQ1, [14, 15, 17, 18].map(mlutfnHQ));
    assert.deepEqual(pixelsHQ2, [10].map(mlutfnHQ));
    assert.deepEqual(pixelsHQ3, [13, 14, 16, 17].map(mlutfnHQ));

    // Cleanup HQ image from cache
    delete imageCache.imageCache[hqImageId];
  });

  it('should ignore HQ image if cached but not loaded', function () {
    // Arrange
    const element = this.element;
    const hqImageId = 'hq-not-loaded';

    // Place HQ image in cache but mark as not loaded
    const hqGetPixelData = () => new Uint8Array([100, 101, 102, 103, 104, 105, 106, 107, 108]);
    imageCache.imageCache[hqImageId] = {
      image: {
        slope: 10.0,
        intercept: 1000,
        getPixelData: hqGetPixelData
      },
      loaded: false
    };

    // Base modality LUT function from currently displayed image
    const mlutfnBase = (value) => value * this.image.slope + this.image.intercept; // 3.0, 5

    // Act
    const pixels1 = getPixels(element, 1, 1, 2, 2, { hqImageId });
    const pixels2 = getPixels(element, 0, 0, 1, 1, { hqImageId });
    const pixels3 = getPixels(element, 0, 1, 2, 2, { hqImageId });

    // Assert: should use base image data and base slope/intercept
    assert.deepEqual(pixels1, [5, 6, 8, 9].map(mlutfnBase));
    assert.deepEqual(pixels2, [1].map(mlutfnBase));
    assert.deepEqual(pixels3, [4, 5, 7, 8].map(mlutfnBase));

    // Cleanup
    delete imageCache.imageCache[hqImageId];
  });

  afterEach(function () {
    disable(this.element);
  });
});
