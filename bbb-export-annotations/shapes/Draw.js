import {createSVGWindow} from 'svgdom';
import pkg from 'perfect-freehand';
import {getStrokeWidth, getGap, determineDasharray,
  colorToHex, radToDegree, TAU, ColorTypes} from '../shapes/helpers.js';
import {Pattern, Line, Defs, Rect} from '@svgdotjs/svg.js';

const {getStrokePoints, getStrokeOutlinePoints} = pkg;
const svgNamespace = 'http://www.w3.org/2000/svg';

/**
 * Class representing a Draw object for annotations.
 * @export
 */
export class Draw {
/**
   * Create a Draw object.
   * @param {Object} ann - The annotation object.
   * @param {string} ann.id - The ID of the annotation.
   * @param {number} ann.x - The x-coordinate.
   * @param {number} ann.y - The y-coordinate.
   * @param {number} ann.rotation - The rotation of the annotation.
   * @param {number} ann.opacity - The opacity of the annotation.
   * @param {Object} [ann.props] - Additional properties.
   * @param {number} [ann.props.size] - The size.
   * @param {boolean} [ann.props.isClosed] - Whether the path is closed.
   * @param {string} [ann.props.color] - The color.
   * @param {boolean} [ann.props.isPen] - Whether it's drawn with a pen.
   * @param {string} [ann.props.fill] - The fill type.
   * @param {boolean} [ann.props.isComplete] - Whether the drawing is done.
   * @param {string} [ann.props.dash] - The dash type.
   * @param {Array} [ann.props.segments] - The segments.
   */
  constructor(ann) {
    this.id = ann.id;
    this.x = ann.x;
    this.y = ann.y;
    this.rotation = ann.rotation;
    this.opacity = ann.opacity;
    this.size = ann.props?.size;
    this.isClosed = ann.props?.isClosed;
    this.color = ann.props?.color;
    this.isPen = ann.props?.isPen;
    this.fill = ann.props?.fill;
    this.isComplete = ann.props?.isComplete;
    this.dash = ann.props?.dash;
    this.segments = ann.props?.segments;
  }

  static simulatePressure = {
    easing: (t) => Math.sin((t * TAU) / 4),
    simulatePressure: true,
  };

  static realPressure = {
    easing: (t) => t * t,
    simulatePressure: false,
  };

  /**
    * Turns an array of points into a path of quadradic curves.
    * @param {Array} annotationPoints
    * @param {Boolean} closed - whether the path end and start
    *                           should be connected (default)
    * @return {Array} - an SVG quadratic curve path
    */
  getSvgPath(annotationPoints, closed = true) {
    const svgPath = annotationPoints.reduce(
        (acc, [x0, y0], i, arr) => {
          if (!arr[i + 1]) return acc;
          const [x1, y1] = arr[i + 1];
          acc.push(x0.toFixed(2), y0.toFixed(2),
              ((x0 + x1) / 2).toFixed(2),
              ((y0 + y1) / 2).toFixed(2));
          return acc;
        },

        ['M', ...annotationPoints[0], 'Q'],
    );

    if (closed) svgPath.push('Z');
    return svgPath;
  }

  /**
   * Draws an SVG shape based on the instance's properties and segments.
   * Aims to resemble tldraw's draw function as much as possible with pure SVG.
   *
   * @return {Array} An array containing:
   * - {SVGPathElement} drawPath: perfect-freehand's SVG shape outline path.
   * - {SVGPathElement} fillShape: The path without the outline.
   * - {Defs} defs: SVG definition for the fill pattern.
   *
   * @example
   * const [drawPath, fillShape, defs] = myDrawInstance.draw();
   */
  draw() {
    const shapePoints = this.segments[0]?.points;
    const shapePointsLength = shapePoints?.length || 0;

    const window = createSVGWindow();
    const document = window.document;

    const dash = this.dash;
    const isDashDraw = (dash === 'draw');

    const thickness = getStrokeWidth(this.size);
    const gap = getGap(dash, this.size);
    const dasharray = determineDasharray(dash, gap);

    const shapeColor = colorToHex(this.color, ColorTypes.ShapeColor);

    const rotation = radToDegree(this.rotation);
    const translate = `translate(${this.x} ${this.y})`;
    const transformOrigin = 'transform-origin: center';
    const rotate = `transform: rotate(${rotation})`;
    const transform = `${translate}; ${transformOrigin}; ${rotate}`;

    const options = {
      size: 1 + thickness * 1.5,
      thinning: 0.65,
      streamline: 0.65,
      smoothing: 0.65,
      ...(shapePoints[1]?.z === 0.5 ?
          this.simulatePressure : this.realPressure),
      last: this.isComplete,
    };

    const strokePoints = getStrokePoints(shapePoints, options);

    const drawPath = document.createElementNS(svgNamespace, 'path');
    const fillShape = document.createElementNS(svgNamespace, 'path');
    const defs = new Defs();

    const last = shapePoints[shapePointsLength - 1];

    // Avoid single dots from not being drawn
    if (strokePoints[0].point[0] == last[0] &&
        strokePoints[0].point[1] == last[1]) {
      strokePoints.push({point: last});
    }

    const solidPath = strokePoints.map((strokePoint) => strokePoint.point);
    const svgPath = this.getSvgPath(solidPath, this.isClosed);

    fillShape.setAttribute('d', svgPath);
    fillShape.setAttribute('transform', transform);
    fillShape.setAttribute('opacity', this.opacity);

    // In case the background shape is the shape itself, add the stroke to it
    if (!isDashDraw) {
      fillShape.setAttribute('stroke', shapeColor);
      fillShape.setAttribute('stroke-width', thickness);
      fillShape.setAttribute('style', dasharray);
    }

    if (this.fill === 'solid') {
      const solidFillColor = colorToHex(this.color, ColorTypes.FillColor);
      fillShape.setAttribute('fill', solidFillColor);
    } else if (this.fill === 'semi') {
      const semiFillColor = colorToHex(this.fill, ColorTypes.SemiFillColor);
      fillShape.setAttribute('fill', semiFillColor);
    } else if (this.fill === 'pattern') {
      const pattern = new Pattern({
        id: `hash_pattern-${this.id}`,
        width: 8,
        height: 8,
        patternUnits: 'userSpaceOnUse',
        patternTransform: 'rotate(45 0 0)',
      });
      pattern.add(new Rect({width: 8, height: 8, fill: 'white'}));
      pattern.add(new Line({'x1': 0, 'y1': 0, 'x2': 0, 'y2': 8,
        'stroke': shapeColor, 'stroke-width': thickness,
        'stroke-dasharray': '4, 4'}));
      defs.add(pattern);
      fillShape.setAttribute('fill', `url(#hash_pattern-${this.id})`);
    } else {
      fillShape.setAttribute('fill', 'none');
    }

    if (isDashDraw) {
      const strokeOutlinePoints = getStrokeOutlinePoints(strokePoints, options);
      const svgPath = this.getSvgPath(strokeOutlinePoints);

      drawPath.setAttribute('fill', shapeColor);
      drawPath.setAttribute('d', svgPath);
      drawPath.setAttribute('transform', transform);
      drawPath.setAttribute('opacity', this.opacity);
    }

    return [drawPath, fillShape, defs];
  }
}
