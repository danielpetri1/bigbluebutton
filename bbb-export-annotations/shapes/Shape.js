import {Pattern, Line, Defs, Rect, G} from '@svgdotjs/svg.js';
import {radToDegree} from '../shapes/helpers.js';
/**
 * Represents a basic Tldraw shape on the whiteboard.
 *
 * @class Shape
 * @typedef {Object} ColorTypes
 * @property {'shape'} ShapeColor - Color for shape outlines or borders.
 * @property {'fill'} FillColor - Solid fill color inside the shape.
 * @property {'semi'} SemiFillColor - Semi fill shape color.
 * @property {'sticky'} StickyColor - Color for sticky notes.
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

    this.size = this.props?.size;
    this.color = this.props?.color;
    this.dash = this.props?.dash;
    this.fill = this.props?.fill;

    // Derived SVG properties
    this.thickness = Shape.getStrokeWidth(this.size);
    this.dasharray = Shape.determineDasharray(this.dash, this.size);
    this.shapeColor = Shape.colorToHex(this.color, ColorTypes.ShapeColor);

    // SVG representation
    this.shapeGroup = new G({
      transform: this.getTransform(),
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

  /**
   * Applies the appropriate fill style to the given SVG shape element based on
   * the object's `fill` property. It supports 'solid', 'semi', 'pattern', and
   * 'none' as fill options.
   * @param {SVGElement} shape - The element to be filled
 */
  setFill(shape) {
    switch (this.fill) {
      case 'solid':
        const fillColor = Shape.colorToHex(this.color, ColorTypes.FillColor);
        shape.attr('fill', fillColor);
        break;

      case 'semi':
        const semiColor = Shape.colorToHex(this.fill, ColorTypes.SemiFillColor);
        shape.attr('fill', semiColor);
        break;

      case 'pattern':
        const shapeColor = Shape.colorToHex(this.color, ColorTypes.ShapeColor);
        const pattern = this.getFillPattern(shapeColor);
        this.shapeGroup.add(pattern);
        shape.attr('fill', `url(#hash_pattern-${this.id})`);
        break;

      default:
        shape.attr('fill', 'none');
        break;
    }
  }

  /**
   * Generates a transformation string for SVG elements based on the object's
   * rotation and position properties. The transformation includes translation,
   * rotation, and setting the transform origin to the center.
   *
   * @return {string} The SVG transform attribute value.
  */
  getTransform() {
    const x = this.x.toFixed(2);
    const y = this.y.toFixed(2);
    const rotation = radToDegree(this.rotation);
    const translate = `translate(${x} ${y})`;
    const transformOrigin = 'transform-origin: center';
    const rotate = `rotate(${rotation})`;
    const transform = `${translate}; ${transformOrigin}; ${rotate}`;

    return transform;
  }

  /**
   * Converts a tldraw color name to its corresponding HEX code.
   *
   * @param {string} color - The name of the color (e.g., 'blue', 'red').
   * @param {string} colorType - Context to select the appropriate mapping.
   *                             Valid values are 'shape', 'fill',
   *                             'semi', and 'sticky'.
   *
   * @return {string} The HEX code for the given color and color type.
   *                   Returns '#0d0d0d' if not found.
   */
  static colorToHex(color, colorType) {
    const colorMap = {
      'black': '#161616',
      'grey': '#9EA6B0',
      'light-violet': '#DD80F5',
      'violet': '#9C1FBE',
      'blue': '#3348E5',
      'light-blue': '#4099F5',
      'yellow': '#FDB365',
      'orange': '#F3500B',
      'green': '#148355',
      'light-green': '#38B845',
      'light-red': '#FC7075',
      'red': '#D61A25',
    };

    const fillMap = {
      'black': '#E2E2E2',
      'grey': '#E7EAEC',
      'light-violet': '#F2E5F9',
      'violet': '#E7D3EF',
      'blue': '#D4D8F6',
      'light-blue': '#D6E8F9',
      'yellow': '#F8ECE0',
      'orange': '#F5DBCA',
      'green': '#CAE5DC',
      'light-green': '#D4EED9',
      'light-red': '#F0D1D3',
      'red': '#F0D1D3',
    };

    const stickyMap = {
      'black': '#FEC78C',
      'grey': '#B6BDC3',
      'light-violet': '#E4A1F7',
      'violet': '#B65ACF',
      'blue': '#6476EC',
      'light-blue': '#6FB3F6',
      'yellow': '#FEC78C',
      'orange': '#F57D48',
      'green': '#47A37F',
      'light-green': '#64C46F',
      'light-red': '#FC9598',
      'red': '#E05458',
    };

    const semiFillMap = {
      'semi': '#F5F9F7',
    };

    const colors = {
      shape: colorMap,
      fill: fillMap,
      semi: semiFillMap,
      sticky: stickyMap,
    };

    return colors[colorType][color] || '#0d0d0d';
  }

  /**
   * Determines SVG style attributes based on the dash type.
   *
   * @param {string} dash - The type of dash ('dashed', 'dotted').
   * @param {string} size - The size ('s', 'm', 'l', 'xl').
   *
   * @return {string} A string representing the SVG attributes
   *                  for the given dash and gap.
   */
  static determineDasharray(dash, size) {
    const gapSettings = {
      'dashed': {
        's': '4.37 4.91',
        'm': '8.16 10.21',
        'l': '11.85 14.81',
        'xl': '21.41 32.12',
        'default': '8 8',
      },

      'dotted': {
        's': '0.02 4',
        'm': '0.03 8',
        'l': '0.05 12',
        'xl': '0.12 16',
        'default': '0.03 8',
      },
    };

    const gap = gapSettings[dash]?.[size] ||
                gapSettings[dash]?.['default'] ||
                '0';

    const dashSettings = {
      'dashed': `stroke-linecap:butt;stroke-dasharray:${gap};`,
      'dotted': `stroke-linecap:round;stroke-dasharray:${gap};`,
    };

    return dashSettings[dash] || 'stroke-linejoin:round;stroke-linecap:round;';
  }

  /**
   * Get the stroke width based on the size.
   *
   * @param {string} size - The size of the stroke ('s', 'm', 'l', 'xl').
   * @return {number} - The corresponding stroke width.
  */
  static getStrokeWidth(size) {
    const strokeWidths = {
      's': 2,
      'm': 3.5,
      'l': 5,
      'xl': 7.5,
    };

    return strokeWidths[size] || 1;
  }

  static determineFontSize(size) {
    const fontSizes = {
      's': 16,
      'm': 20,
      'l': 24,
      'xl': 32,
    };

    return fontSizes[size] || 16;
  }

  /**
   * Determines the font to use based on the specified font family.
   * Supported families are 'draw', 'sans', 'serif', and 'mono'. Any other input
   * defaults to the Caveat Brush font.
   *
   * @param {string} family The name of the font family.
   * @return {string} The font that corresponds to the given family.
   * @static
 */
  static determineFontFromFamily(family) {
    switch (family) {
      case 'sans': return 'Source Sans Pro';
      case 'serif': return 'Crimson Pro';
      case 'mono': return 'Source Code Pro';
      case 'draw':
      default: return 'Caveat Brush';
    }
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

/**
 * An object representing various types of colors used in shapes.
 * This object is frozen to prevent modifications.
 *
 * @const {ColorTypes}
 */
export const ColorTypes = Object.freeze({
  ShapeColor: 'shape',
  FillColor: 'fill',
  SemiFillColor: 'semi',
  StickyColor: 'sticky',
});
