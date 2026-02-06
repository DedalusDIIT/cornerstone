import { assert } from 'chai'; // eslint-disable-line import/extensions

import enable from '../src/enable.js';
import displayImage from '../src/displayImage.js';
import getStoredPixels from '../src/getStoredPixels.js';
import disable from '../src/disable.js';
import { default as imageCache } from '../src/imageCache.js';

describe('getStoredPixels', function () {
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
      slope: 1.0,
      intercept: 0,
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

    // Act
    const storedPixels1 = getStoredPixels(element, 1, 1, 2, 2);
    const storedPixels2 = getStoredPixels(element, 0, 0, 1, 1);
    const storedPixels3 = getStoredPixels(element, 0, 1, 2, 2);

    // Assert
    assert.deepEqual(storedPixels1, [5, 6, 8, 9]);
    assert.deepEqual(storedPixels2, [1]);
    assert.deepEqual(storedPixels3, [4, 5, 7, 8]);
  });

  it('should throw an error if the element is undefined', function () {
    assert.throws(() => getStoredPixels(undefined, 0, 0, 1, 1));
  });

  it('should use HQ image pixel data when available', function () {
    // Arrange
    const element = this.element;

    // HQ image setup in cache
    const hqImageId = 'hq-exampleImageId';
    const hqGetPixelData = () => new Uint8Array([10, 11, 12, 13, 14, 15, 16, 17, 18]);
    imageCache.imageCache[hqImageId] = {
      image: {
        getPixelData: hqGetPixelData
      },
      loaded: true
    };

    // Act
    const storedPixelsHQ1 = getStoredPixels(element, 1, 1, 2, 2, { hqImageId });
    const storedPixelsHQ2 = getStoredPixels(element, 0, 0, 1, 1, { hqImageId });
    const storedPixelsHQ3 = getStoredPixels(element, 0, 1, 2, 2, { hqImageId });

    // Assert (using HQ pixel data)
    // From HQ pixelData:
    // 10 11 12
    // 13 14 15
    // 16 17 18
    assert.deepEqual(storedPixelsHQ1, [14, 15, 17, 18]);
    assert.deepEqual(storedPixelsHQ2, [10]);
    assert.deepEqual(storedPixelsHQ3, [13, 14, 16, 17]);

    // Cleanup HQ image from cache
    delete imageCache.imageCache[hqImageId];
  });

  it('should fall back when HQ image is cached but not loaded', function () {
    // Arrange
    const element = this.element;

    // HQ image present in cache but not loaded
    const hqImageId = 'hq-exampleImageId-not-loaded';
    const hqGetPixelData = () => new Uint8Array([100, 101, 102, 103, 104, 105, 106, 107, 108]);
    imageCache.imageCache[hqImageId] = {
      image: {
        getPixelData: hqGetPixelData
      },
      loaded: false
    };

    // Act: should use the base image pixel data, not HQ
    const storedPixels1 = getStoredPixels(element, 1, 1, 2, 2, { hqImageId });
    const storedPixels2 = getStoredPixels(element, 0, 0, 1, 1, { hqImageId });
    const storedPixels3 = getStoredPixels(element, 0, 1, 2, 2, { hqImageId });

    // Assert: values match base image [1..9]
    assert.deepEqual(storedPixels1, [5, 6, 8, 9]);
    assert.deepEqual(storedPixels2, [1]);
    assert.deepEqual(storedPixels3, [4, 5, 7, 8]);

    // Cleanup
    delete imageCache.imageCache[hqImageId];
  });

  afterEach(function () {
    disable(this.element);
  });
});
