/* eslint no-bitwise: 0 */

/**
 * Volume of Interest Lookup Table Function
 *
 * @typedef {Function} VOILUTFunction
 *
 * @param {Number} modalityLutValue
 * @returns {Number} transformed value
 * @memberof Objects
 */

/**
 * @module: VOILUT
 */

/**
 *
 * @param {Number} windowWidth Window Width
 * @param {Number} windowCenter Window Center
 * @returns {VOILUTFunction} VOI LUT mapping function
 * @memberof VOILUT
 */
function generateLinearVOILUT (windowWidth, windowCenter) {
  return function (modalityLutValue) {
    return ((modalityLutValue - windowCenter) / windowWidth + 0.5) * 255.0;
  };
}

/**
 * Generates a linear exact VOI LUT function (DICOM LINEAR_EXACT)
 * The formula used is provided by the standard: 
 * https://dicom.nema.org/medical/dicom/current/output/chtml/part03/sect_C.11.2.html#sect_C.11.2.1.3.2
 * 
 * @param {Number} windowWidth Window Width
 * @param {Number} windowCenter Window Center
 * @returns {VOILUTFunction} VOI LUT mapping function (DICOM LINEAR_EXACT)
 * @memberof VOILUT
 */
function generateLinearExactVOILUT (windowWidth, windowCenter) {
  const yMin = 0;
  const yMax = 255;

  return function (x) {
    if (x <= (windowCenter - windowWidth / 2)) {
      return yMin;
    }
    else if (x > (windowCenter + windowWidth / 2)) {
      return yMax;
    }
    else {
      return ((x - windowCenter) / windowWidth + 0.5) * (yMax - yMin) + yMin;
    }
  };
}

/**
 * Generate a non-linear volume of interest lookup table
 *
 * @param {LUT} voiLUT Volume of Interest Lookup Table Object
 * @param {Boolean} roundModalityLUTValues Do a Math.round of modality lut to compute non linear voilut

 *
 * @returns {VOILUTFunction} VOI LUT mapping function
 * @memberof VOILUT
 */
function generateNonLinearVOILUT (voiLUT, roundModalityLUTValues) {
  // We don't trust the voiLUT.numBitsPerEntry, mainly thanks to Agfa!
  const bitsPerEntry = Math.max(...voiLUT.lut).toString(2).length;
  const shift = bitsPerEntry - 8;
  const minValue = voiLUT.lut[0] >> shift;
  const maxValue = voiLUT.lut[voiLUT.lut.length - 1] >> shift;
  const maxValueMapped = voiLUT.firstValueMapped + voiLUT.lut.length - 1;

  return function (modalityLutValue) {
    if (modalityLutValue < voiLUT.firstValueMapped) {
      return minValue;
    } else if (modalityLutValue >= maxValueMapped) {
      return maxValue;
    }
    if (roundModalityLUTValues) {
      return voiLUT.lut[Math.round(modalityLutValue) - voiLUT.firstValueMapped] >> shift;
    }

    return voiLUT.lut[modalityLutValue - voiLUT.firstValueMapped] >> shift;
  };
}

/**
 * Generates a sigmoid voi lut function. 
 * The formula used is provided by the standard: 
 * https://dicom.nema.org/medical/dicom/current/output/chtml/part03/sect_C.11.2.html#sect_C.11.2.1.3
 * 
 * @param {Number} windowWidth Window Width
 * @param {Number} windowCenter Window Center
 * @returns {VOILUTFunction} VOI LUT mapping function
 * @memberof VOILUT
 */
function generateSigmoidVOILUT (windowWidth, windowCenter) {
  const minOutputValue = 0; 
  const maxOutputValue = 255;
  return function (modalityLutValue) {
    return ((maxOutputValue - minOutputValue) / (1 + Math.exp((-4 * (modalityLutValue - windowCenter)) / windowWidth))) + minOutputValue;
  };
}


/**
 * Retrieve a VOI LUT mapping function given the current windowing settings
 * and the VOI LUT for the image
 *
 * @param {Number} windowWidth Window Width
 * @param {Number} windowCenter Window Center
 * @param {LUT} [voiLUT] Volume of Interest Lookup Table Object
 * @param {Boolean} roundModalityLUTValues Do a Math.round of modality lut to compute non linear voilut
 * @param {String} voiLUTFunction VOI Lut function
 *
 * @return {VOILUTFunction} VOI LUT mapping function
 * @memberof VOILUT
 */
export default function (windowWidth, windowCenter, voiLUT, roundModalityLUTValues, voiLUTFunction) {

  if (voiLUTFunction === 'SIGMOID') {
    return generateSigmoidVOILUT(windowWidth, windowCenter);
  }

  if (voiLUT) {
    return generateNonLinearVOILUT(voiLUT, roundModalityLUTValues);
  }

  if (voiLUTFunction === 'LINEAR_EXACT') {
    return generateLinearExactVOILUT(windowWidth, windowCenter);
  }

  return generateLinearVOILUT(windowWidth, windowCenter);
}
