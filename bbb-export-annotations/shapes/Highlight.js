import {Draw} from './Draw.js';

export class Highlight extends Draw {
  constructor(highlight) {
    super(highlight);

    this.fill = 'none';
    this.shapeColor = '#fedd00';
    this.thickness = this.thickness * 7;
    this.isClosed = false;
  }
}
