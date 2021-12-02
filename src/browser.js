// Exports
// -------

const version = '1.0.0-beta'
import * as hvif from './hvif.js'
import * as svg from './svg.js'
const svg_ = svg.Renderer (document.createElementNS.bind (document))
Object.assign (svg_, svg)
export { version, hvif, svg_ as svg }