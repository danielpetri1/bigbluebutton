import {
  getStrokeWidth, getGap, determineDasharray,
  colorToHex, ColorTypes,
} from '../shapes/helpers.js';
import {Polygon as SVGPolygon} from '@svgdotjs/svg.js';
import {Geo} from './Geo.js';

/**
   * Creates an SVG diamond shape from Tldraw v2 JSON data.
   *
   * @class Diamond
   * @extends {Geo}
   */
export class Diamond extends Geo {
  /**
     * Draws a diamond shape on the SVG canvas.
     * @return {G} Returns the SVG group element containing the diamond.
     */
  draw() {
    const dash = this.dash;

    const thickness = getStrokeWidth(this.size);
    const gap = getGap(dash, this.size);

    const dasharray = determineDasharray(dash, gap);
    const shapeColor = colorToHex(this.color, ColorTypes.ShapeColor);

    const width = this.w;
    const height = this.h;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    // Shape begins from the upper left corner
    const points = [
      [0, halfHeight],
      [halfWidth, 0],
      [width, halfHeight],
      [halfWidth, height],
    ].map((p) => p.join(',')).join(' ');

    const diamondGroup = this.shapeGroup;
    const diamond = new SVGPolygon({
      points,
      'stroke': shapeColor,
      'stroke-width': thickness,
      'style': dasharray,
    });

    this.applyFill(diamond, diamondGroup);
    diamondGroup.add(diamond);

    return diamondGroup;
  }
}
