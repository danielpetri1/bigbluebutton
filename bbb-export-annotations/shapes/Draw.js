import {createSVGWindow} from 'svgdom';
import pkg from 'perfect-freehand';
import {getStrokeWidth, getGap, determineDasharray,
  colorToHex, radToDegree, TAU, ColorTypes} from '../shapes/helpers.js';
import {G} from '@svgdotjs/svg.js';
import {Shape} from './Shape.js';

const {getStrokePoints, getStrokeOutlinePoints} = pkg;
const svgNamespace = 'http://www.w3.org/2000/svg';

/**
 * Creates an SVG path from Tldraw v2 pencil data.
 *
 * @class Draw
 * @extends {Shape}
 */
export class Draw extends Shape {
  /**
   * @param {Object} draw - The draw shape JSON.
   */
  constructor(draw) {
    super(draw);

    this.size = this.props?.size;
    this.color = this.props?.color;
    this.fill = this.props?.fill;
    this.dash = this.props?.dash;
    this.segments = this.props?.segments;
    this.isClosed = this.props?.isClosed;
    this.isComplete = this.props?.isComplete;
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
   * Renders the draw object as an SVG group element.
   *
   * @return {G} - An SVG group element.
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
    const drawGroup = new G({
      transform: transform,
      opacity: this.opacity,
    });

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

    const last = shapePoints[shapePointsLength - 1];

    // Avoid single dots from not being drawn
    if (strokePoints[0].point[0] == last[0] &&
        strokePoints[0].point[1] == last[1]) {
      strokePoints.push({point: last});
    }

    const solidPath = strokePoints.map((strokePoint) => strokePoint.point);
    const svgPath = this.getSvgPath(solidPath, this.isClosed);

    fillShape.setAttribute('d', svgPath);

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
      const defs = this.getFillPattern(shapeColor);
      drawGroup.add(defs);
      fillShape.setAttribute('fill', `url(#hash_pattern-${this.id})`);
    } else {
      fillShape.setAttribute('fill', 'none');
    }

    if (isDashDraw) {
      const strokeOutlinePoints = getStrokeOutlinePoints(strokePoints, options);
      const svgPath = this.getSvgPath(strokeOutlinePoints);

      drawPath.setAttribute('fill', shapeColor);
      drawPath.setAttribute('d', svgPath);
    }

    drawGroup.add(fillShape);
    drawGroup.add(drawPath);

    return drawGroup;
  }
}
