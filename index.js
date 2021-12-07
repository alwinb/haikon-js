const { setPrototypeOf:setProto, assign } = Object
const log = console.log.bind (console)

// Pseudo DOM
// ----------

class Elem {
  append (...childNodes) { this.childNodes.splice (Infinity, 0, ...childNodes) }
  setAttribute (k, v) { this.attributes [k] = v }
  get outerHTML () { return toSVGString (this) }
  get outerXML () { return toSVGString (this) }
}

const createElementNS = (ns, tagName) => 
  setProto ({ tagName, attributes:{}, childNodes:[] }, Elem.prototype)

function toSVGString (elem) {
  return [... toXMLString (elem)] .join ('')
}

function* toXMLString ({ tagName, attributes:atts, childNodes }) {
  yield `<${tagName}`
  for (const k in atts) yield ` ${k}="${atts[k]}"` // TODO: escapes
  if (childNodes.length) {
    yield '>'
    for (const child of childNodes) yield* toXMLString (child)
    yield `</${tagName}>`
  }
  else yield '/>'
  yield ('\n')
}

function renderIconToSVG (icon, document = { createElementNS }) {
  const renderer = new SVGRenderer (document)
  return renderer.renderIcon (icon)
}


// Exports
// -------

const version = '1.0.0-beta'

import {
  parseIcon,
  Color, Gradient, Polygon, Path, Shape, Contour, Stroke,
  gradientTypes, lineCaps, lineJoins } from './src/hvif.js'

import {
  // gradientCss, styleCss,
  // transformAttribute, pathDataAttribute,
  Renderer as SVGRenderer } from './src/svg.js'

// const svg_ = svg.Renderer (createElementNS)
// Object.assign (svg_, svg)

export {
  version, 
  parseIcon,
  Color, Gradient, Polygon, Path, Shape, Contour, Stroke,
  gradientTypes, lineCaps, lineJoins,
  renderIconToSVG
}