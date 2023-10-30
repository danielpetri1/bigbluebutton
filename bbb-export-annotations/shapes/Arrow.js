import {Path, Marker} from '@svgdotjs/svg.js';
import {Shape} from './Shape.js';
import {TAU, circleFromThreePoints, normalize, rotate}
  from '../shapes/helpers.js';

/**
 * Creates an SVG path from Tldraw v2 arrow data.
 *
 * @class Arrow
 * @extends {Shape}
 */
export class Arrow extends Shape {
  /**
   * @param {Object} arrow - The arrow shape JSON.
   */
  constructor(arrow) {
    super(arrow);
    this.start = this.props?.start;
    this.end = this.props?.end;
    this.arrowheadStart = this.props?.arrowheadStart;
    this.arrowheadEnd = this.props?.arrowheadEnd;
    this.bend = this.props?.bend;
  }

  /**
   * Constructs the path for the arrow, considering straight and curved lines.
   *
   * @return {string} - The SVG path string.
   */
  constructPath() {
    const startX = this.start.x;
    const startY = this.start.y;
    const endX = this.end.x;
    const endY = this.end.y;
    const bend = this.bend;

    const isStraightLine = (bend.toFixed(2) === '0.00');
    const straightLine = `M ${startX} ${startY} L ${endX} ${endY}`;


    if (isStraightLine) {
      return straightLine;
    }

    const mid = [(startX + endX) / 2, (startY + endY) / 2];
    const unitVector = normalize([endX - startX, endY - startY]);
    const unitRotated = rotate(unitVector);
    const bendOffset = [unitRotated[0] * -bend, unitRotated[1] * -bend];
    const [middleX, middleY] = [
      mid[0] + bendOffset[0],
      mid[1] + bendOffset[1]];

    const [,, r] = circleFromThreePoints(
        [startX, startY],
        [middleX, middleY],
        [endX, endY]);

    // Could not calculate a circle
    if (!r) {
      return straightLine;
    }

    const radius = r.toFixed(2);

    // Calculate the start and end angles
    const ab = Math.hypot(startY - middleY, startY - middleX);
    const bc = Math.hypot(middleY - endY, middleX - endX);
    const ca = Math.hypot(endY - startY, endX - startX);
    const theta = Math.acos((bc * bc + ca * ca - ab * ab) /
        (2 * bc * ca)) * 2;

    // Whether to draw the longer arc
    const largeArcFlag = (TAU / 2) > theta ? '0' : '1';

    // Clockwise or counterclockwise
    const sweepFlag = ((endX - startX) * (middleY - startY) -
                        (middleX - startX) * (endY - startY) > 0 ? '0' : '1');

    const path = `M ${startX} ${startY} ` +
                 `A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ` +
                 `${endX} ${endY}`;

    return path;
  }

  /**
   * Renders the arrow object as an SVG group element.
   *
   * @return {G} - An SVG group element.
   */
  draw() {
    const arrowGroup = this.shapeGroup;
    const arrowPath = new Path();
    const pathData = this.constructPath();

    arrowPath.attr({
      'd': pathData,
      'stroke': this.shapeColor,
      'stroke-width': this.thickness,
      'style': this.dasharray,
      'fill': 'none',
    });

    arrowGroup.add(arrowPath);

    return arrowGroup;
  }
}
