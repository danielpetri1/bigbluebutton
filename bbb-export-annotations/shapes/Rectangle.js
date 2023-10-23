import {
  getStrokeWidth, getGap, determineDasharray,
  colorToHex, ColorTypes,
} from '../shapes/helpers.js';
import {Rect} from '@svgdotjs/svg.js';
import {Geo} from './Geo.js';

/**
 * Creates an SVG rectangle shape from Tldraw v2 JSON data.
 *
 * @class Rectangle
 * @extends {Geo}
 */
export class Rectangle extends Geo {
  /**
   * Draws a rectangle shape based on the instance properties.
   *
   * @method draw
   * @return {G} An SVG group element containing the drawn rectangle shape.
   *
 */
  draw() {
    const dash = this.dash;

    const thickness = getStrokeWidth(this.size);
    const gap = getGap(dash, this.size);

    const dasharray = determineDasharray(dash, gap);
    const shapeColor = colorToHex(this.color, ColorTypes.ShapeColor);
    const rectGroup = this.shapeGroup;

    const rectangle = new Rect({
      'x': 0,
      'y': 0,
      'width': this.w,
      'height': this.h,
      'stroke': shapeColor,
      'stroke-width': thickness,
      'style': dasharray,
    });

    // Simulate perfect-freehand effect
    if (this.dash === 'draw') {
      rectangle.attr('rx', thickness);
      rectangle.attr('ry', thickness);
    }

    this.applyFill(rectangle, rectGroup);
    rectGroup.add(rectangle);

    return rectGroup;
  }
}
