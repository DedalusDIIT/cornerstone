import { assert } from 'chai'; // eslint-disable-line import/extensions

import getVOILut from '../../src/internal/getVOILut.js';

describe('getVOILut', function () {
  beforeEach(function () {
    // Arrange
    this.windowWidth = 255;
    this.windowCenter = 127;

    this.voiLUT = {
      firstValueMapped: 0,
      numBitsPerEntry: 8,
      lut: [0, 128, 255]
    };

    // TODO: Add another test case for a VOI LUT with
    // numBitsPerEntry > 8
    /*
    this.voiLUT2 = {
      firstValueMapped: 0,
      numBitsPerEntry: 16,
      lut: [0, 128, 255]
    };
    */
  });

  it('should create a linear VOI LUT function', function () {
    // Act
    const vlutfn = getVOILut(this.windowWidth, this.windowCenter);

    // Assert
    const delta = 0.001;

    assert.approximately(vlutfn(-1), -0.5, delta);
    assert.approximately(vlutfn(0), 0.5, delta);
    assert.approximately(vlutfn(1), 1.5, delta);
    assert.approximately(vlutfn(2), 2.5, delta);
    assert.approximately(vlutfn(3), 3.5, delta);
    assert.approximately(vlutfn(256), 256.5, delta);
  });

  it('should create a non-linear VOI LUT function', function () {
    // Act
    const vlutfn = getVOILut(this.windowWidth, this.windowCenter, this.voiLUT);

    // Assert
    assert.equal(vlutfn(-1), 0);
    assert.equal(vlutfn(0), 0);
    assert.equal(vlutfn(1), 128);
    assert.equal(vlutfn(2), 255);
    assert.equal(vlutfn(3), 255);
    assert.equal(vlutfn(256), 255);
  });

  it('should create a LINEAR_EXACT function and apply the formula for in-range values', function () {
    const vlutfn = getVOILut(100, 50, null, null, 'LINEAR_EXACT');

    const expectedCenterValue = ((50 - 50) / 100 + 0.5) * 255;
    assert.approximately(vlutfn(50), expectedCenterValue, 1e-3);

    const expectedMidValue = ((25 - 50) / 100 + 0.5) * 255;
    assert.approximately(vlutfn(25), expectedMidValue, 1e-3, 'Should match linear exact formula for mid-range input');
  });

  it('should clamp values below and above the specified window range', function () {
    const vlutfn = getVOILut(100, 50, null, null, 'LINEAR_EXACT');

    assert.equal(vlutfn(-5), 0, 'Values below 0 clamp to 0');
    assert.equal(vlutfn(0), 0, 'Value at lower boundary => 0');

    assert.equal(vlutfn(101), 255, 'Values above 100 clamp to 255');
    assert.equal(vlutfn(100), 255, 'Value at upper boundary => 255');
  });

  it('should create a sigmoid VOI LUT function', function () {
    // Act
    const vlutfn = getVOILut(this.windowWidth, this.windowCenter, this.voiLUT, null, 'SIGMOID');

    // Assert
    assert.approximately(vlutfn(-1), 30, 0.2);
    assert.approximately(vlutfn(0), 30, 0.7);
    assert.approximately(vlutfn(1), 31, 0.3);
    assert.approximately(vlutfn(2), 31, 0.5);
    assert.approximately(vlutfn(3), 31, 0.9);
    assert.approximately(vlutfn(256), 225, 0.3);
  });
});
