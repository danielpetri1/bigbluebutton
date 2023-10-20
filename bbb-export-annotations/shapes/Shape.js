import {Pattern, Line, Defs, Rect, G} from '@svgdotjs/svg.js';

export class Shape {
  constructor({
    id,
    x,
    y,
    rotation,
    opacity,
    props,
  }) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.rotation = rotation;
    this.opacity = opacity;
    this.props = props;
  }

  getFillPattern(shapeColor) {
    const defs = new Defs();
    const pattern = new Pattern({
      id: `hash_pattern-${this.id}`,
      width: 8,
      height: 8,
      patternUnits: 'userSpaceOnUse',
      patternTransform: 'rotate(45 0 0)',
    });

    pattern.add(new Rect({width: 8, height: 8, fill: 'white'}));
    pattern.add(new Line({'x1': 0, 'y1': 0, 'x2': 0, 'y2': 8,
      'stroke': shapeColor, 'stroke-width': 3.5,
      'stroke-dasharray': '4, 4'}));

    defs.add(pattern);
    return defs;
  }

  draw() {
    return new G();
  }
}

