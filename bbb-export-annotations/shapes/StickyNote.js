import {Rect} from '@svgdotjs/svg.js';
import {Shape, ColorTypes} from './Shape.js';

export class StickyNote extends Shape {
  constructor(params) {
    super(params);
    this.url = this.props?.url;
    this.text = this.props?.text || '';
    this.align = this.props?.align;
    this.verticalAlign = this.props?.verticalAlign;
    this.growY = this.props?.growY;
    this.shapeColor = Shape.colorToHex(this.color, ColorTypes.StickyColor);
  }

  /**
   * Draws the sticky note and adds it to the SVG.
   * Overrides the placeholder draw method in the Shape base class.
   * @override
   * @method draw
   * @return {G} An SVG group element containing the note.
   */
  draw() {
    const stickyNote = this.shapeGroup;
    const rectW = 200;
    const rectH = 200 + this.growY;
    const cornerRadius = 10;

    // Create rectangle element
    const rect = new Rect()
        .size(rectW, rectH)
        .radius(cornerRadius)
        .fill(this.shapeColor);

    stickyNote.add(rect);
    this.drawLabel(stickyNote);

    return stickyNote;
  }
}
