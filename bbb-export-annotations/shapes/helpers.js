export const TAU = Math.PI * 2;

/**
 * Sorts an array of objects lexicographically based on a nested key-value pair.
 *
 * @param {Array} array - The array to be sorted.
 * @param {string} key - The key in each object to be used for sorting.
 * @param {string} value - The nested key within the 'key' object to be used for sorting.
 * @returns {Array} - Returns a new array sorted lexicographically by the specified nested key-value pair.
 *
 * @example
 * const data = [
 *   {annotationInfo: {index: 'a1V'}, type: 'shape'},
 *   {annotationInfo: {index: 'a2'}, type: 'shape'},
 *   {annotationInfo: {index: 'a1'}, type: 'draw'}
 * ];
 * const sortedData = sortByKey(data, 'annotationInfo', 'index');
 * // Output: [{ annotationInfo: { index: 'a1' }, type: 'draw' }, { annotationInfo: { index: 'a1V' }, type: 'shape' }, { annotationInfo: { index: 'a2' }, type: 'shape' }]
 */

export function sortByKey(array, key, value) {
  return array.sort((a, b) => {
    const [x, y] = [a[key][value], b[key][value]];
    return x.localeCompare(y);
  });
}

/**
 * Get the stroke width based on the size.
 *
 * @param {string} size - The size of the stroke ('s', 'm', 'l', 'xl').
 * @return {number} - The corresponding stroke width.
 */
export function getStrokeWidth(size) {
  const strokeWidths = {
    's': 2,
    'm': 3.5,
    'l': 5,
    'xl': 7.5,
  };

  return strokeWidths[size] || 1;
}

/**
 * Determines the gap for a given dash style and size.
 *
 * @param {string} dash - The type of dash ('dashed', 'dotted').
 * @param {string} size - The size ('s', 'm', 'l', 'xl').
 *
 * @return {string} A string representing the gap setting for the given dash and size.
 */
export function getGap(dash, size) {
  const gapSettings = {
    'dashed': {
      's': '8 8',
      'm': '14 14',
      'l': '20 20',
      'xl': '26 26',
      'default': '8 8',
    },
    'dotted': {
      's': '0.1 8',
      'm': '0.1 14',
      'l': '0.1 20',
      'xl': '0.1 26',
      'default': '0.1 8',
    },
  };

  return gapSettings[dash]?.[size] || gapSettings[dash]?.['default'] || '0';
}

/**
 * Determines the `stroke-dasharray` and other related SVG attributes based on the dash type.
 *
 * @param {string} dash - The type of dash ('dashed', 'dotted').
 * @param {number} [gap=0] - The length of the gap between dashes.
 *
 * @return {string} A string representing the SVG attributes for the given dash and gap.
 */
export function determineDasharray(dash, gap = 0) {
  const dashSettings = {
    'dashed': `stroke-linecap:butt;stroke-dasharray:${gap};`,
    'dotted': `stroke-linecap:round;stroke-dasharray:${gap};`,
  };

  return dashSettings[dash] || 'stroke-linejoin:round;stroke-linecap:round;';
}

export const ColorTypes = Object.freeze({
  ShapeColor: 'shape',
  FillColor: 'fill',
  SemiFillColor: 'semi',
  StickyColor: 'sticky',
});

export function colorToHex(color, colorType) {
  const colorMap = {
    'black': '#161616',
    'grey': '#9EA6B0',
    'light-violet': '#DD80F5',
    'violet': '#9C1FBE',
    'blue': '#3348E5',
    'light-blue': '#4099F5',
    'yellow': '#FDB365',
    'orange': '#F3500B',
    'green': '#148355',
    'light-green': '#38B845',
    'light-red': '#FC7075',
    'red': '#D61A25',
  };

  const fillMap = {
    'black': '#E2E2E2',
    'grey': '#E7EAEC',
    'light-violet': '#F2E5F9',
    'violet': '#E7D3EF',
    'blue': '#D4D8F6',
    'light-blue': '#D6E8F9',
    'yellow': '#F8ECE0',
    'orange': '#F5DBCA',
    'green': '#CAE5DC',
    'light-green': '#D4EED9',
    'light-red': '#F0D1D3',
    'red': '#F0D1D3',
  };

  const stickyMap = {
    'black': '#FEC78C',
    'grey': '#B6BDC3',
    'light-violet': '#E4A1F7',
    'violet': '#B65ACF',
    'blue': '#6476EC',
    'light-blue': '#6FB3F6',
    'yellow': '#FEC78C',
    'orange': '#F57D48',
    'green': '#47A37F',
    'light-green': '#64C46F',
    'light-red': '#FC9598',
    'red': '#E05458',
  };

  const semiFillMap = {
    'semi': '#F5F9F7',
  }

  const colors = {
    shape: colorMap,
    fill: fillMap,
    semi: semiFillMap,
    sticky: stickyMap,
  };

  return colors[colorType][color] || '#0d0d0d';
}

/**
 * Converts an angle from radians to degrees.
 *
 * @param {number} angle - The angle in radians.
 * @return {number} The angle in degrees.
 */
export function radToDegree(angle) {
  return angle * (360 / TAU) || 0;
}
