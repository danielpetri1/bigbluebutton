import {
  getStrokeWidth, getGap, determineDasharray,
  colorToHex, ColorTypes,
} from '../shapes/helpers.js';
import {Polygon as SVGPolygon} from '@svgdotjs/svg.js';
import {Geo} from './Geo.js';

/**
   * Creates an SVG triangle shape from Tldraw v2 JSON data.
   *
   * @class Triangle
   * @extends {Geo}
   */
export class Triangle extends Geo {
  /**
     * Draws a triangle shape on the SVG canvas.
     * @return {G} Returns the SVG group element containing the triangle.
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

    // Shape begins from the upper left corner
    const points = [
      [halfWidth, 0],
      [width, height],
      [0, height],
    ].map((p) => p.join(',')).join(' ');

    const triangleGroup = this.shapeGroup;
    const triangle = new SVGPolygon({
      points,
      'stroke': shapeColor,
      'stroke-width': thickness,
      'style': dasharray,
    });

    this.applyFill(triangle);
    triangleGroup.add(triangle);

    return triangleGroup;
  }
}
