import {
  getStrokeWidth, getGap, determineDasharray,
  colorToHex, radToDegree, ColorTypes,
} from '../shapes/helpers.js';
import {Rect, G} from '@svgdotjs/svg.js';
import {Geo} from './Geo.js';

export class Rectangle extends Geo {
  draw() {
    const dash = this.dash;

    const thickness = getStrokeWidth(this.size);
    const gap = getGap(dash, this.size);

    const dasharray = determineDasharray(dash, gap);
    const shapeColor = colorToHex(this.color, ColorTypes.ShapeColor);
    const rotation = radToDegree(this.rotation);

    const translate = `translate(${this.x} ${this.y})`;
    const transformOrigin = 'transform-origin: center';
    const rotate = `transform: rotate(${rotation})`;
    const transform = `${translate}; ${transformOrigin}; ${rotate}`;

    const rectGroup = new G({
      transform: transform,
      opacity: this.opacity,
    });

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

    if (this.fill === 'solid') {
      const fillColor = colorToHex(this.color, ColorTypes.FillColor);
      rectangle.attr('fill', fillColor);
    } else if (this.fill === 'semi') {
      const semiFillColor = colorToHex(this.fill, ColorTypes.SemiFillColor);
      rectangle.attr('fill', semiFillColor);
    } else if (this.fill === 'pattern') {
      const pattern = this.getFillPattern(shapeColor);
      rectGroup.add(pattern);
      rectangle.attr('fill', `url(#hash_pattern-${this.id})`);
    } else {
      rectangle.attr('fill', 'none');
    }

    rectGroup.add(rectangle);

    return rectGroup;
  }
}
