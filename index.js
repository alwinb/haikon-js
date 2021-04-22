const { setPrototypeOf:setProto, assign } = Object
const log = console.log.bind (console)

// Pseudo DOM
// ----------

const createElementNS = (ns, tagName) => 
  setProto ({ tagName, attributes:{}, children:[] }, Elem.prototype)

class Elem {
  append (...children) { this.children.splice (0, 0, ...children) }
  setAttribute (k, v) { this.attributes [k] = v }
}


// Exports
// -------

let svg 

module.exports = {
  hvif: require ('./scripts/hvif'),
  svg: (svg = require ('./scripts/svg'))
}

assign (svg, svg._renderers (createElementNS))
log (module.exports)
