import {Text} from '@svgdotjs/svg.js';
import {Shape} from './Shape.js';

export class TextShape extends Shape {
  constructor(params) {
    super(params);
    this.text = this.props?.text || '';
    this.align = this.props?.align;
    this.w = this.props?.w;
    this.h = this.props?.h;
    this.fontSize = Shape.determineFontSize(this.size);
    this.fontFamily = Shape.determineFontFromFamily(this.props?.font);
  }

  /**
   * Draws the text shape and adds it to the SVG.
   * Overrides the placeholder draw method in the Shape base class.
   * @override
   * @method draw
   * @return {G} An SVG group element containing the text.
   */
  draw() {
    const x = Shape.alignHorizontally(this.align, this.w);
    const y = 0;

    const textGroup = this.shapeGroup;
    const textElement = new Text()
        .text(this.text)
        .move(x, y)
        .font({
          'family': this.fontFamily,
          'size': this.fontSize,
          'anchor': this.align,
          'alignment-baseline': 'middle',
        })
        .fill(this.shapeColor);

    textGroup.add(textElement);

    return textGroup;
  }
}
