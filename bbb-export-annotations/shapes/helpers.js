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
 * Gets the vertices of a polygon given its dimensions and the number of sides.
 * @param {number} width The width of the bounding box for the polygon.
 * @param {number} height The height of the bounding box for the polygon.
 * @param {number} sides The number of sides for the polygon.
 * @return {Array} An array of objects with x and y coordinates for each vertex.
 * @see {@link https://github.com/tldraw/tldraw/blob/main/packages/editor/src/lib/primitives/utils.ts} Adapted from Tldraw.
 */
export function getPolygonVertices(width, height, sides) {
  const cx = width / 2;
  const cy = height / 2;
  const pointsOnPerimeter = [];
  let minX = Infinity;
  let minY = Infinity;

  for (let i = 0; i < sides; i++) {
    const step = TAU / sides;
    const t = -(TAU / 4) + i * step;
    const x = cx + cx * Math.cos(t);
    const y = cy + cy * Math.sin(t);

    if (x < minX) minX = x;
    if (y < minY) minY = y;

    pointsOnPerimeter.push({x, y});
  }

  if (minX !== 0 || minY !== 0) {
    for (let i = 0; i < pointsOnPerimeter.length; i++) {
      const pt = pointsOnPerimeter[i];
      pt.x -= minX;
      pt.y -= minY;
    }
  }

  return pointsOnPerimeter;
}
