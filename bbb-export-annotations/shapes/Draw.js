import {createSVGWindow} from 'svgdom';
import pkg from 'perfect-freehand';
import {getStrokeWidth, getGap, determineDasharray,
  colorToHex, radToDegree, TAU, ColorTypes} from '../shapes/helpers.js';

const {getStrokePoints, getStrokeOutlinePoints} = pkg;

export class Draw {
  constructor(annotation) {
    this.x = annotation.x;
    this.y = annotation.y;
    this.rotation = annotation.rotation;
    this.opacity = annotation.opacity;
    this.size = annotation.props?.size;
    this.isClosed = annotation.props?.isClosed;
    this.color = annotation.props?.color;
    this.isPen = annotation.props?.isPen;
    this.fill = annotation.props?.fill;
    this.isComplete = annotation.props?.isComplete;
    this.dash = annotation.props?.dash;
    this.segments = annotation.props?.segments;
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
          acc.push(x0.toFixed(2), y0.toFixed(2), ((x0 + x1) / 2).toFixed(2), ((y0 + y1) / 2).toFixed(2));
          return acc;
        },

        ['M', ...annotationPoints[0], 'Q'],
    );

    if (closed) svgPath.push('Z');
    return svgPath;
  }

  draw() {
    const window = createSVGWindow();
    const document = window.document;

    const dash = this.dash;
    const isDashDraw = (dash === 'draw');

    const thickness = getStrokeWidth(this.size);
    const gap = getGap(dash, this.size);
    const dasharray = determineDasharray(dash, gap);

    const shapeColor = colorToHex(this.color, ColorTypes.ShapeColor);

    const shapePoints = this.segments[0]?.points;
    const shapePointsLength = shapePoints?.length || 0;

    if (shapePointsLength < 2) return;

    const options = {
      size: 1 + thickness * 1.5,
      thinning: 0.65,
      streamline: 0.65,
      smoothing: 0.65,
      ...(shapePoints[1]?.z === 0.5 ? this.simulatePressure : this.realPressure),
      last: this.isComplete,
    };

    const strokePoints = getStrokePoints(shapePoints, options);

    const [drawPath, fillShape] = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    const last = shapePoints[shapePointsLength - 1];

    // Avoid single dots from not being drawn
    if (strokePoints[0].point[0] == last[0] && strokePoints[0].point[1] == last[1]) {
        strokePoints.push({ point: last });
    }
    
    const solidPath = strokePoints.map((strokePoint) => strokePoint.point);
    const svgPath = this.getSvgPath(solidPath, false);

    fillShape.setAttribute('d', svgPath);

    // In case the background shape is the shape itself, add the stroke to it
    if (!isDashDraw) {
        fillShape.setAttribute('stroke', shapeColor);
        fillShape.setAttribute('stroke-width', thickness);
        fillShape.setAttribute('stroke-dasharray', dasharray);
    }

    // Specify fill type
    if (this.fill === 'solid') {
        const solidFillColor = colorToHex(this.color, ColorTypes.FillColor);
        fillShape.setAttribute('fill', solidFillColor);
    } else if (this.fill === 'semi') {
        const semiFillColor = colorToHex(this.fill, ColorTypes.SemiFillColor);
        fillShape.setAttribute('fill', semiFillColor);
    } else if (this.fill === 'pattern') {
    } else {
        fillShape.setAttribute('fill', 'none');
    }

    if (isDashDraw) {
        const strokeOutlinePoints = getStrokeOutlinePoints(strokePoints, options);
        const svgPath = this.getSvgPath(strokeOutlinePoints);
  
        drawPath.setAttribute('fill', shapeColor);
        drawPath.setAttribute('d', svgPath);
        drawPath.setAttribute('stroke-dasharray', dasharray);    
    }

    const rotation = radToDegree(this.rotation);
    const transform =  `translate(${this.x} ${this.y}); transform-origin: center; transform: rotate(${rotation})`

    drawPath.setAttribute('transform', transform);
    fillShape.setAttribute('transform', transform);

    return [drawPath, fillShape];
  }
}
