import {
  getStrokeWidth, getGap, determineDasharray,
  colorToHex, radToDegree, ColorTypes,
} from '../shapes/helpers.js';
import {Ellipse as SVGEllipse, G} from '@svgdotjs/svg.js';
import {Geo} from './Geo.js';

/**
 * Creates an SVG ellipse shape from Tldraw v2 JSON data.
 *
 * @class Ellipse
 * @extends {Geo}
 */
export class Ellipse extends Geo {
  /**
   * Draws an ellipse shape on the SVG canvas.
   * @return {G} Returns the SVG group element containing the ellipse.
   */
  draw() {
    const dash = this.dash;

    const thickness = getStrokeWidth(this.size);
    const gap = getGap(dash, this.size);

    const dasharray = determineDasharray(dash, gap);
    const shapeColor = colorToHex(this.color, ColorTypes.ShapeColor);
    const rotation = radToDegree(this.rotation);

    const x = this.x;
    const y = this.y;
    const rx = this.w / 2;
    const ry = this.h / 2;

    const translate = `translate(${x} ${y})`;
    const transformOrigin = 'transform-origin: center';
    const rotate = `transform: rotate(${rotation})`;
    const transform = `${translate}; ${transformOrigin}; ${rotate}`;

    const ellipseGroup = new G({
      transform: transform,
      opacity: this.opacity,
    });

    const ellipse = new SVGEllipse({
      'cx': rx,
      'cy': ry,
      'rx': rx,
      'ry': ry,
      'stroke': shapeColor,
      'stroke-width': thickness,
      'style': dasharray,
    });

    this.applyFill(ellipse, ellipseGroup);
    ellipseGroup.add(ellipse);

    return ellipseGroup;
  }
}
