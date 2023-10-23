import {Pattern, Line, Defs, Rect, G} from '@svgdotjs/svg.js';
import {colorToHex, ColorTypes, radToDegree} from '../shapes/helpers.js';
/**
 * Represents a basic Tldraw shape on the whiteboard.
 *
 * @class Shape
 */
export class Shape {
  /**
   * Creates an instance of Shape.
   * @constructor
   * @param {Object} params - The shape's parameters.
   * @param {String} params.id - The the shape ID.
   * @param {Number} params.x - The shape's x-coordinate.
   * @param {Number} params.y - The shape's y-coordinate.
   * @param {Number} params.rotation - The shape's rotation angle in radians.
   * @param {Number} params.opacity - The shape's opacity.
   * @param {Object} params.props - Shape-specific properties.
   */
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
    this.shapeGroup = new G({
      transform: this.applyTransform(),
      opacity: this.opacity,
    });
  }

  /**
   * Generates an SVG <defs> element with a pattern for filling the shape.
   *
   * @method getFillPattern
   * @param {String} shapeColor - The color to use for the pattern lines.
   * @return {Defs} An SVG <defs> element containing the pattern.
   */
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

  applyFill(shape) {
    if (this.fill === 'solid') {
      const fillColor = colorToHex(this.color, ColorTypes.FillColor);
      shape.attr('fill', fillColor);
    } else if (this.fill === 'semi') {
      const semiFillColor = colorToHex(this.fill, ColorTypes.SemiFillColor);
      shape.attr('fill', semiFillColor);
    } else if (this.fill === 'pattern') {
      const shapeColor = colorToHex(this.color, ColorTypes.ShapeColor);
      const pattern = this.getFillPattern(shapeColor);
      this.shapeGroup.add(pattern);
      shape.attr('fill', `url(#hash_pattern-${this.id})`);
    } else {
      shape.attr('fill', 'none');
    }
  }

  applyTransform() {
    const rotation = radToDegree(this.rotation);
    const translate = `translate(${this.x} ${this.y})`;
    const transformOrigin = 'transform-origin: center';
    const rotate = `rotate(${rotation})`;
    const transform = `${translate}; ${transformOrigin}; ${rotate}`;

    return transform;
  }

  /**
   * Placeholder method for drawing the shape.
   * Intended to be overridden by subclasses.
   *
   * @method draw
   * @return {G} An empty SVG group element.
   */
  draw() {
    return new G();
  }
}
