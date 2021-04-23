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

const svg = require ('./src/svg')
assign (svg, svg._renderers (createElementNS))

module.exports = {
  version: '1.0.0-beta',
  hvif: require ('./src/hvif'),
  svg
}
