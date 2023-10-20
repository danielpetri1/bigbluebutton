import {Geo} from './Geo.js';
import {Rectangle} from './Rectangle.js';

export function createGeoObject(annotations) {
  switch (annotations.props?.geo) {
    case 'rectangle':
      return new Rectangle(annotations);
    default:
      return new Geo(annotations);
  }
}
