import {Shape} from './Shape.js';

export class Geo extends Shape {
  constructor(geo) {
    super(geo);
    this.color = this.props?.color;
    this.url = this.props?.url;
    this.text = this.props?.text;
    this.font = this.props?.font;
    this.fill = this.props?.fill;
    this.dash = this.props?.dash;
    this.w = this.props?.w;
    this.h = this.props?.h;
    this.size = this.props?.size;
    this.growY = this.props?.growY;
    this.align = this.props?.align;
    this.geo = this.props?.geo;
    this.verticalAlign = this.props?.verticalAlign;
    this.labelColor = this.props?.labelColor;
  }
}
