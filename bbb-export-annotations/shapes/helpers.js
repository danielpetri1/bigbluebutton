export const TAU = Math.PI * 2;

/**
 * Sorts an array of objects lexicographically based on a nested key-value pair.
 *
 * @param {Array} array - The array to be sorted.
 * @param {string} key - The key in each object to be used for sorting.
 * @param {string} value - The nested key within the 'key' object to be used
 *                         for sorting.
 * @return {Array} - Returns a new array sorted lexicographically
 *                    by the specified nested key-value pair.
 *
 * @example
 * const data = [
 *   {annotationInfo: {index: 'a1V'}, type: 'shape'},
 *   {annotationInfo: {index: 'a2'}, type: 'shape'},
 *   {annotationInfo: {index: 'a1'}, type: 'draw'}
 * ];
 * const sortedData = sortByKey(data, 'annotationInfo', 'index');
 * // Output: [{ annotationInfo: { index: 'a1' }, type: 'draw' },
 *             { annotationInfo: { index: 'a1V' }, type: 'shape' },
 *             { annotationInfo: { index: 'a2' }, type: 'shape' }]
 */
export function sortByKey(array, key, value) {
  return array.sort((a, b) => {
    const [x, y] = [a[key][value], b[key][value]];
    return x.localeCompare(y);
  });
}

/**
   * Converts an angle from radians to degrees.
   *
   * @param {number} angle - The angle in radians.
   * @return {number} The angle in degrees, fixed to two decimal places.
   */
export function radToDegree(angle) {
  return parseFloat(angle * (360 / TAU)).toFixed(2) || 0;
}
