const { setPrototypeOf:setProto, assign } = Object
const log = console.log.bind (console)

// Pseudo DOM
// ----------

const createElementNS = (ns, tagName) => 
  setProto ({ tagName, attributes:{}, childNodes:[] }, Elem.prototype)

class Elem {
  append (...childNodes) { this.childNodes.splice (Infinity, 0, ...childNodes) }
  setAttribute (k, v) { this.attributes [k] = v }
  toSVGString () { return toSVGString (this) }
}

function toSVGString (elem) {
  return [...renderIt (elem)] .join ('')
}

function* renderIt ({ tagName, attributes:atts, childNodes }) {
  yield `<${tagName}`
  for (const k in atts) yield ` ${k}="${atts[k]}"` // TODO: escapes
  if (childNodes.length) {
    yield '>'
    for (const child of childNodes) yield* renderIt (child)
    yield `</${tagName}>`
  }
  else yield '/>'
  yield ('\n')
}


// Exports
// -------

import {
  parseIcon,
  Color, Gradient, Polygon, Path, Shape, Contour, Stroke,
  colorFormats, gradientTypes, lineCaps, lineJoins } from './src/hvif.js'

const version = '1.0.0-beta'
import * as svg from './src/svg.js'
const svg_ = svg.Renderer (createElementNS)
Object.assign (svg_, svg)

export {
  version, 
  parseIcon,
  Color, Gradient, Polygon, Path, Shape, Contour, Stroke,
  colorFormats, gradientTypes, lineCaps, lineJoins,
  svg_ as svg
}