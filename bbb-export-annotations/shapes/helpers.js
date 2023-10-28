/**
 * Represents the constant TAU, which is equal to 2 * PI.
 *
 * TAU is often used in trigonometric calculations as it represents
 * one full turn in radians, making it more intuitive than using 2 * PI.
 * For example, half a circle is TAU / 2, a quarter is TAU / 4, etc.,
 * which makes the math easier to follow.
 *
 * @constant {number}
 */
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

/**
 * Random number generator based on a seed value.
 * This uses a variation of the xorshift algorithm to generate
 * pseudo-random numbers. The function returns a `next` function that,
 * when called, generates the next random number in sequence.
 *
 * @param {string} [seed=''] - The seed value for the random number generator.
 *                             Default is an empty string.
 * @return {Function} The `next` function to generate random numbers.
 * @see {@link https://github.com/tldraw/tldraw/blob/main/packages/utils/src/lib/number.ts} Adapted from Tldraw.
 */
export function rng(seed = '') {
  let x = 0;
  let y = 0;
  let z = 0;
  let w = 0;

  function next() {
    const t = x ^ (x << 11);
    x = y;
    y = z;
    z = w;
    w ^= ((w >>> 19) ^ t ^ (t >>> 8)) >>> 0;
    return (w / 0x100000000) * 2;
  }

  for (let k = 0; k < seed.length + 64; k++) {
    x ^= seed.charCodeAt(k) | 0;
    next();
  }

  return next;
}

/**
 * Get a point on the perimeter of a circle.
 *
 * @param {number} cx - The center x of the circle.
 * @param {number} cy - The center y of the circle.
 * @param {number} r - The radius of the circle.
 * @param {number} a - The angle in radians to get the point from.
 * @return {Object} A point object with 'x' and 'y' properties
 * @public
 */
export function getPointOnCircle(cx, cy, r, a) {
  return {
    x: cx + r * Math.cos(a),
    y: cy + r * Math.sin(a),
  };
}

export function angle(center, point) {
  const dy = point.y - center.y;
  const dx = point.x - center.x;
  return Math.atan2(dy, dx);
}

/**
 * Calculate the clockwise angular distance between two angles.
 *
 * This function takes two angles in radians and calculates the
 * shortest angular distance between them in the clockwise direction.
 * The result is also in radians and accounts for full circle rotation.
 *
 * @param {number} startAngle - The starting angle in radians.
 * @param {number} endAngle - The ending angle in radians.
 * @return {number} The Clockwise angular distance in radians
 *                  between the start and end angles.
 */
export function clockwiseAngleDist(startAngle, endAngle) {
  let l = endAngle - startAngle;
  if (l < 0) {
    l += TAU;
  }
  return l;
}

/**
  * Calculate the distance between two points.
  *
  * @param {Object} point1 - The first point, represented as an object {x, y}.
  * @param {Object} point2 - The second point, represented as an object {x, y}.
  * @return {number} - The calculated distance.
  */
export function calculateDistance(point1, point2) {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
}
