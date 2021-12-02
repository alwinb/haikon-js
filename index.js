const { setPrototypeOf:setProto, assign } = Object
const log = console.log.bind (console)

// Pseudo DOM
// ----------

const createElementNS = (ns, tagName) => 
  setProto ({ tagName, attributes:{}, children:[] }, Elem.prototype)

class Elem {
  append (...children) { this.children.splice (Infinity, 0, ...children) }
  setAttribute (k, v) { this.attributes [k] = v }
  toSVGString () { return toSVGString (this) }
}

function toSVGString (elem) {
  return [...renderIt (elem)] .join ('')
}

function* renderIt ({ tagName, attributes:atts, children }) {
  yield `<${tagName}`
  for (const k in atts) yield ` ${k}="${atts[k]}"` // TODO: escapes
  if (children.length) {
    yield '>'
    for (const child of children) yield* renderIt (child)
    yield `</${tagName}>`
  }
  else yield '/>'
  yield ('\n')
}


// Exports
// -------

const version = '1.0.0-beta'
import * as hvif from './src/hvif.js'
import * as svg from './src/svg.js'
const svg_ = svg.Renderer (createElementNS)
Object.assign (svg_, svg)
export { version, hvif, svg_ as svg }
