import {Geo} from './Geo.js';
import {Rectangle} from './Rectangle.js';
import {Ellipse} from './Ellipse.js';
import {Diamond} from './Diamond.js';
import {Triangle} from './Triangle.js';
import {Trapezoid} from './Trapezoid.js';
import {Rhombus} from './Rhombus.js';
import {Hexagon} from './Hexagon.js';
/**
 * Creates a geometric object instance based on the provided annotations.
 *
 * @function createGeoObject
 * @param {Object} annotations - The annotations for the geometric object.
 * @param {Object} [annotations.props] - The properties of the annotations.
 * @param {String} [annotations.props.geo] - Which geometric object to create.
 * @return {Geo} The created geometric object.
 */
export function createGeoObject(annotations) {
  switch (annotations.props?.geo) {
    case 'rectangle':
      return new Rectangle(annotations);
    case 'ellipse':
      return new Ellipse(annotations);
    case 'diamond':
      return new Diamond(annotations);
    case 'triangle':
      return new Triangle(annotations);
    case 'trapezoid':
      return new Trapezoid(annotations);
    case 'rhombus':
      return new Rhombus(annotations);
    case 'hexagon':
      return new Hexagon(annotations);
    default:
      return new Geo(annotations);
  }
}
