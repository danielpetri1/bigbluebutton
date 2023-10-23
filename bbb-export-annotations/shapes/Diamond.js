import {
  getStrokeWidth, getGap, determineDasharray,
  colorToHex, radToDegree, ColorTypes,
} from '../shapes/helpers.js';
import {Polygon as SVGPolygon, G} from '@svgdotjs/svg.js';
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
    const rotation = radToDegree(this.rotation);

    const x = this.x;
    const y = this.y;
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

    const translate = `translate(${x} ${y})`;
    const transformOrigin = 'transform-origin: center';
    const rotate = `transform: rotate(${rotation})`;
    const transform = `${translate}; ${transformOrigin}; ${rotate}`;
    const diamondGroup = new G({
      transform: transform,
      opacity: this.opacity,
    });

    const diamond = new SVGPolygon({
      points,
      'stroke': shapeColor,
      'stroke-width': thickness,
      'style': dasharray,
    });

    if (this.fill === 'solid') {
      const fillColor = colorToHex(this.color, ColorTypes.FillColor);
      diamond.attr('fill', fillColor);
    } else if (this.fill === 'semi') {
      const semiFillColor = colorToHex(this.fill, ColorTypes.SemiFillColor);
      diamond.attr('fill', semiFillColor);
    } else if (this.fill === 'pattern') {
      const pattern = this.getFillPattern(shapeColor);
      diamondGroup.add(pattern);
      diamond.attr('fill', `url(#hash_pattern-${this.id})`);
    } else {
      diamond.attr('fill', 'none');
    }

    diamondGroup.add(diamond);

    return diamondGroup;
  }
}
