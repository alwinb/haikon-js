// Exports
// -------

let svg
globalThis.Haikon = require ('./hvif')
globalThis.HaikonSvg = (svg = require ('./svg'))
Object.assign (svg, svg._renderers (document.createElementNS.bind (document)))
