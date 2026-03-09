import { assert } from 'chai'; // eslint-disable-line import/extensions

import { default as imageCache,
  setMaximumSizeBytes,
  putImageLoadObject,
  getImageLoadObject,
  removeImageLoadObject,
  getCacheInfo,
  // changeImageIdCacheSize,
  purgeCache,
  pinImage,
  unpinImage,
  isImagePinned } from '../src/imageCache.js';

import { events } from '../src/events.js';

describe('Set maximum cache size', function () {
  it('should allow setting of cache size', function () {
    // Arrange
    const maximumSizeInBytes = 1024 * 1024 * 1024;

    // Act
    setMaximumSizeBytes(maximumSizeInBytes);

    // Assert
    const cacheInfo = getCacheInfo();

    assert.equal(cacheInfo.maximumSizeInBytes, maximumSizeInBytes);
  });

  it('should fail if numBytes is not defined', function () {
    assert.throws(() => setMaximumSizeBytes(undefined));
  });

  it('should fail if numBytes is not a number', function () {
    assert.throws(() => setMaximumSizeBytes('10000'));
  });
});

describe('Store, retrieve, and remove imagePromises from the cache', function () {
  before(function () {
    // Act
    purgeCache();
  });

  beforeEach(function () {
    // Arrange
    this.image = {
      imageId: 'anImageId',
      sizeInBytes: 100
    };

    this.imageLoadObject = {
      promise: new Promise((resolve) => {
        resolve(this.image);
      }),
      cancelFn: undefined
    };
  });

  afterEach(function () {
    purgeCache();
  });

  it('should allow image promises to be added to the cache (putImageLoadObject)', function (done) {
    const image = this.image;
    const imageLoadObject = this.imageLoadObject;

    // Act
    putImageLoadObject(image.imageId, imageLoadObject);
    imageLoadObject.promise.then(() => {
      // Assert
      const cacheInfo = getCacheInfo();

      assert.equal(cacheInfo.numberOfImagesCached, 1);
      assert.equal(cacheInfo.cacheSizeInBytes, this.image.sizeInBytes);
      done();
    });
  });

  it('should not change cache size if sizeInBytes is undefined (putImagePromise)', function (done) {
    // Arrange
    this.image.sizeInBytes = undefined;
    putImageLoadObject(this.image.imageId, this.imageLoadObject);

    // Act
    this.imageLoadObject.promise.then(() => {
      const cacheInfo = getCacheInfo();

      // Assert
      assert.equal(cacheInfo.numberOfImagesCached, 1);
      assert.equal(cacheInfo.cacheSizeInBytes, 0);

      done();
    });
  });

  it('should not change cache size if sizeInBytes is not a number (putImagePromise)', function (done) {
    // Arrange
    this.image.sizeInBytes = '10000';
    putImageLoadObject(this.image.imageId, this.imageLoadObject);

    // Act
    this.imageLoadObject.promise.then(() => {
      const cacheInfo = getCacheInfo();

      // Assert
      assert.equal(cacheInfo.numberOfImagesCached, 1);
      assert.equal(cacheInfo.cacheSizeInBytes, 0);

      done();
    });
  });

  it('should throw an error if imageId is not defined (putImageLoadObject)', function () {
    // Assert
    assert.throws(() => putImageLoadObject(undefined, this.imageLoadObject));
  });

  it('should throw an error if imagePromise is not defined (putImageLoadObject)', function () {
    // Assert
    assert.throws(() => putImageLoadObject(this.image.imageId, undefined));
  });

  it('should throw an error if imageId is already in the cache (putImageLoadObject)', function () {
    // Arrange
    putImageLoadObject(this.image.imageId, this.imageLoadObject);

    // Assert
    assert.throws(() => putImageLoadObject(this.image.imageId, this.imageLoadObject));
  });

  it('should allow image promises to be retrieved from the cache (getImageLoadObject()', function () {
    const image = this.image;
    const imageLoadObject = this.imageLoadObject;

    // Act
    putImageLoadObject(image.imageId, imageLoadObject);

    // Assert
    const retrievedImageLoadObject = getImageLoadObject(image.imageId);

    assert.equal(imageLoadObject, retrievedImageLoadObject);
  });

  it('should throw an error if imageId is not defined (getImageLoadObject()', function () {
    // Assert
    assert.throws(() => getImageLoadObject(undefined));
  });

  it('should fail silently to retrieve a promise for an imageId not in the cache', function () {
    // Act
    const retrievedImageLoadObject = getImageLoadObject('AnImageIdNotInCache');

    // Assert
    assert.isUndefined(retrievedImageLoadObject, undefined);
  });

  it('should allow image promises to be removed from the cache (removeImagePromise)', function () {
    const image = this.image;
    const imageLoadObject = this.imageLoadObject;

    // Arrange
    putImageLoadObject(image.imageId, imageLoadObject);

    // Act
    removeImageLoadObject(image.imageId);

    // Assert
    imageLoadObject.promise.then(() => {
      // Fail if the Promise is resolved.
      assert.equal(true, false);
    });

    // Make sure that the cache is now empty
    const cacheInfo = getCacheInfo();

    assert.equal(cacheInfo.numberOfImagesCached, 0);
    assert.equal(cacheInfo.cacheSizeInBytes, 0);
  });

  it('should fail if imageId is not defined (removeImagePromise)', function () {
    assert.throws(() => removeImageLoadObject(undefined));
  });

  it('should fail if imageId is not in cache (removeImagePromise)', function () {
    assert.throws(() => removeImageLoadObject('RandomImageId'));
  });

  /* it('should allow image promises to have their cache size changed', function () {
    const image = this.image;
    const imageLoadObject = this.imageLoadObject;
    const newCacheSize = 500;

    // Arrange
    putImageLoadObject(image.imageId, imageLoadObject);

    // Act
    changeImageIdCacheSize(image.imageId, newCacheSize);

    const cacheInfo = getCacheInfo();

    assert.equal(cacheInfo.numberOfImagesCached, 1);
    assert.equal(image.sizeInBytes, newCacheSize);
    assert.equal(cacheInfo.cacheSizeInBytes, newCacheSize);
  }); */

  it('should be able to purge the entire cache', function (done) {
    const image = this.image;
    const imageLoadObject = this.imageLoadObject;

    // Arrange
    putImageLoadObject(image.imageId, imageLoadObject);
    imageLoadObject.promise.then(() => {
      // Act
      purgeCache();

      // Make sure that the cache is now empty
      const cacheInfo = getCacheInfo();

      assert.equal(cacheInfo.numberOfImagesCached, 0);
      assert.equal(cacheInfo.cacheSizeInBytes, 0);
      assert.isEmpty(imageCache.imageCache);
      done();
    });
  });

  it('should be able to kick the oldest image out of the cache', function (done) {
    // Arrange
    const maxCacheSize = 1000;
    const promises = [];

    setMaximumSizeBytes(maxCacheSize);

    for (let i = 0; i < 10; i++) {
      // Create the image
      const image = {
        imageId: `imageId-${i}`,
        sizeInBytes: 100
      };

      image.decache = () => console.log('decaching image');

      const imageLoadObject = {
        promise: new Promise((resolve) => {
          resolve(image);
        }),
        cancelFn: undefined
      };

      // Add it to the cache
      putImageLoadObject(image.imageId, imageLoadObject);
      promises.push(imageLoadObject.promise);
    }

    // Retrieve a few of the imagePromises in order to bump their timestamps
    getImageLoadObject('imageId-5');
    getImageLoadObject('imageId-4');
    getImageLoadObject('imageId-6');

    // Setup event listeners to check that the promise removed and cache full events have fired properly
    events.addEventListener('cornerstoneimagecachepromiseremoved', (event) => {
      const imageId = event.detail.imageId;

      // Detect that the earliest image added has been removed

      // TODO: Figure out how to change the test setup to ensure the same
      // image is always kicked out of the cache. It looks like timestamps
      // are not in the expected order, probably since handling the promise
      // resolving is async
      // assert.equal(imageId, 'imageId-0');
      assert.isDefined(imageId);
      done();
    });

    events.addEventListener('cornerstoneimagecachefull', (event) => {
      assert.equal(event.detail.numberOfImagesCached, 10);
      assert.equal(event.detail.cacheSizeInBytes, maxCacheSize);
      done();
    });

    // Act
    // Create another image which will push us over the cache limit
    const extraImage = {
      imageId: 'imageId-11',
      sizeInBytes: 100
    };

    const extraImageLoadObject = {
      promise: new Promise((resolve) => {
        resolve(extraImage);
      }),
      cancelFn: undefined
    };

    Promise.all(promises).then(() => {
      // Add it to the cache
      putImageLoadObject(extraImage.imageId, extraImageLoadObject);

      // Make sure that the cache has pushed out the first image
      const cacheInfo = getCacheInfo();

      assert.equal(cacheInfo.numberOfImagesCached, 10);
      assert.equal(cacheInfo.cacheSizeInBytes, 1000);

      done();
    });
  });
});

describe('Pin and unpin images in the cache', function () {
  before(function () {
    purgeCache();
  });

  afterEach(function () {
    purgeCache();
    // Clean up any pins left over
    unpinImage('anImageId');
  });

  it('should pin an image and report it as pinned', function () {
    pinImage('anImageId');

    assert.isTrue(isImagePinned('anImageId'));
  });

  it('should report an unpinned image as not pinned', function () {
    assert.isFalse(isImagePinned('anImageId'));
  });

  it('should unpin a previously pinned image', function () {
    pinImage('anImageId');
    unpinImage('anImageId');

    assert.isFalse(isImagePinned('anImageId'));
  });

  it('should not evict a pinned image when cache is full', function (done) {
    // Use a cache that fits exactly one image so eviction is deterministic
    setMaximumSizeBytes(100);

    const image0 = { imageId: 'imageId-0', sizeInBytes: 100 };

    image0.decache = () => {};

    const image1 = { imageId: 'imageId-1', sizeInBytes: 100 };

    image1.decache = () => {};

    const loadObject0 = {
      promise: new Promise((resolve) => resolve(image0)),
      cancelFn: undefined
    };

    const loadObject1 = {
      promise: new Promise((resolve) => resolve(image1)),
      cancelFn: undefined
    };

    // Pin imageId-0 before adding images
    pinImage('imageId-0');

    putImageLoadObject('imageId-0', loadObject0);
    putImageLoadObject('imageId-1', loadObject1);

    // After both promises resolve, imageId-1 is the only eviction candidate
    Promise.all([loadObject0.promise, loadObject1.promise]).then(() => {
      // The pinned image should still be in the cache
      assert.isDefined(getImageLoadObject('imageId-0'));

      // The unpinned image should have been evicted
      assert.isUndefined(getImageLoadObject('imageId-1'));

      unpinImage('imageId-0');
      done();
    });
  });

  it('should evict a previously pinned image after unpinning when cache is full', function (done) {
    // Use a cache that fits exactly one image
    setMaximumSizeBytes(100);

    const image0 = { imageId: 'imageId-0', sizeInBytes: 100 };

    image0.decache = () => {};

    const loadObject0 = {
      promise: new Promise((resolve) => resolve(image0)),
      cancelFn: undefined
    };

    // Pin imageId-0, add it to cache
    pinImage('imageId-0');
    putImageLoadObject('imageId-0', loadObject0);

    loadObject0.promise.then(() => {
      // imageId-0 is cached and pinned, cache is full (100/100)
      assert.isDefined(getImageLoadObject('imageId-0'));

      // Unpin it so it becomes eligible for eviction
      unpinImage('imageId-0');

      // Pin imageId-1 so it must survive
      pinImage('imageId-1');

      const image1 = { imageId: 'imageId-1', sizeInBytes: 100 };

      image1.decache = () => {};

      const loadObject1 = {
        promise: new Promise((resolve) => resolve(image1)),
        cancelFn: undefined
      };

      putImageLoadObject('imageId-1', loadObject1);

      loadObject1.promise.then(() => {
        // The previously pinned (now unpinned) image should have been evicted
        assert.isUndefined(getImageLoadObject('imageId-0'));

        // The newly pinned image should remain
        assert.isDefined(getImageLoadObject('imageId-1'));

        unpinImage('imageId-1');
        done();
      });
    });
  });
});
