const { setPrototypeOf:setProto, entries } = Object
const log = console.log.bind (console)
const { colorTags, gradientTypes } = require ('./hvif').constants


// CSS builders
// ------------

function colorCss ([tag, ...bytes]) {
  if (tag === colorTags.KA || tag === colorTags.K)
    bytes.unshift (bytes[0], bytes[0])
  return '#' + (bytes.map (_ => _.toString (16) .padStart (2, '0')) .join (''))
}

function styleCss (style) {
  return style.tag === 2 ? gradientCss (style) : colorCss (style)
}

function gradientCss ({ type, stops }) {
  const sts = stops.map (({ color, offset }) => colorCss (color) + ' ' + offset/2.55+'%')
  if (type !== gradientTypes.linear && type !== gradientTypes.radial) {
    const names = ['linear', 'radial', 'diamond', 'conic', 'xy', 'sqrtxy']
    console.warn ('Rendering a', names[type], 'gradient as a radial gradient instead.')
  }
  return type === gradientTypes.linear ?
    `linear-gradient(to right, ${sts.join (', ')})` :
    `radial-gradient(circle at center, ${sts.join (', ')})`
}

function printStrokeStyle (effect) {
  // TODO clean this up
  return `stroke-width:${effect.width};` + 
    `stroke-linejoin:${["miter", "miter", "round", "bevel", "miter"][effect.lineJoin]};` + 
    `stroke-linecap:${["butt", "square", "round"][effect.lineCap]};`
}

// ### Attribute string builders

function printMatrix ([a,b,c,d,e,f]) {
  return `matrix(${[a,b,c,d, e*102, f*102].join(' ')})` // leaving the translate for now...
}

function printTransform (transform) {
  // TODO properly check types! currently: translate or matrix
  return transform._tag !== 'matrix'
    ? `${transform._tag}(${[...transform].join (' ')})`
    :  printMatrix (transform)
}

function printPath (...paths) {
  return [..._renderPaths (paths)] .join (' ')
}

function* _renderPaths (paths) {
  for (let i=paths.length-1; i>=0; i--) {
    const { type, points, closed } = paths[i]
    if (type === 'points'){
      yield* ['M', points[0], points[1], 'L']
      for (let i=2, l=points.length; i<l; i++)
        yield points[i]
      if (closed) yield 'Z'
    }
    // TODO; convert curves to sections, minimal ones
    else if (type === 'curves') {
      var [x0, y0, xin, yin, xout, yout] = points.slice (0, 6)
      yield* ['M', x0, y0]
      for (let i=0, l=points.length; i<l;) {
        yield* ['C', xout, yout]
        const [x, y, xin, yin, xout_, yout_] = points.slice (i, i+=6)
        xout = xout_
        yout = yout_
        yield* [xin, yin, x, y]
      }
      if (closed)
        yield* [xout, yout, xin, yin, x0, y0, 'Z']
    }
  }
}


// Svg Builders
// ------------
// 6528 units = 64px

function idGen () {
  return ((Math.random () * 2e16)>>>0) .toString (36)
}

function setProps (el, obj) {
  for (const [k,v] of entries (obj))
    el.setAttribute (k, v)
  return el
}

function _renderers (createElementNS) {

const Dom = DomNS ('http://www.w3.org/1999/xhtml')
const Svg = DomNS ('http://www.w3.org/2000/svg')

return { renderIcon, renderShape, renderGradient }

// Where

function DomNS (ns) {
  return (taginfo, ...children) => {
    const parts = taginfo.split ('.')
    const el = createElementNS (ns, parts.shift () || 'g')
    if (parts.length) el.setAttribute ('class', parts.join (' '))
    el.append (...children)
    return el
  }
}

function renderIcon (icon, id = idGen ()) {
  const svg = Svg ('svg')
  const span = Dom ('span.haikon', svg)
  const viewBox = '0 0 6528 6528'
  setProps (svg, { id, viewBox, style:'width:2em; height:2em; transform:translate(0, .45em);' })
  icon.shapes.forEach ((shape, shapeIndex) =>
    svg.append (renderShape (shape, icon, id)))
  return span
}

function renderShape (shape, icon, id) {
  if (id == null) throw new Error ('id is null')

  // Render the paths to a compound <path> element
  const paths = shape.pathIndices.map (i => icon.paths[i])
  const d = printPath (...paths)
  const pel = Svg ('path')
    setProps (pel, { d })
  if (shape.transform)
    setProps (pel, { transform: printTransform (shape.transform) })

  const effects = shape.transformers||[]
  if (effects.length > 1)
    console.warn ('#'+id, '('+icon.filename+')', 'TODO: support multiple effects;', effects.map (_ => _._tag ? _._tag : 'fill') )

  // Assuming for now there's at most one effect/transformer
  let effect = { _tag:'fill' }
  for (let t of shape.transformers || [])
    if (t._tag === 'stroke' || t._tag === 'contour') 
      effect = t

  // Render the style, optionally generating a gradient element
  const haikonStyle = icon.styles [shape.styleIndex]
  let gradient = null
  let color = ''
  if (haikonStyle.tag == 2) {
    const gradientId = id + '-g' + shape.styleIndex.toString (16)
    gradient = renderGradient (haikonStyle, gradientId)
    color = `url(#${gradientId})`
    // log ('gradient Id', color)
  }
  else
    color = colorCss (haikonStyle)

  // Now actually render the shapes...
  if (effect._tag === 'stroke') {
    const style = printStrokeStyle (effect) + `stroke:${color};` + 'fill:none;'
    setProps (pel, { style })
    if (gradient) {
      const g = Svg ('g')
      g.append (gradient, pel)
      return g
    }
    else return pel
  }

  else if (effect._tag === 'fill') {
    const style = printStrokeStyle (effect) + `fill:${color};` + 'stroke:none;'
    setProps (pel, { style })
    if (gradient) {
      const g = Svg ('g')
      g.append (gradient, pel)
      return g
    }
    else return pel
  }

  else if (effect._tag === 'contour') { // use a mask..
    // let style
    if (effect.width < 0) {
      const _effect= setProto ({ width:-effect.width }, effect)
      style = printStrokeStyle (_effect) + `stroke:black;fill:white;`
    }
    else 
      style = printStrokeStyle (effect) + `stroke:white;fill:white;`

    setProps (pel, { style })
    const mask = Svg ('mask')
    const maskId = id + '-m' + shape.styleIndex.toString (16)
    setProps (mask, { id:maskId, maskUnits:'userSpaceOnUse', x:0, y:0, width:6528, height:6528 })
    mask.append (pel)
    const g = Svg ('g')
    const bg = Svg ('rect')
    setProps (bg, { x:0, y:0, width:6528, height:6528, fill:color, mask:`url(#${maskId})`})
    g.append (mask, bg)
    if (gradient) g.append (gradient)
    // FIXME gradients also should be reused, I mean, they may be referenced multiple times
    return g
  }
}

function renderGradient ({ type, stops, matrix }, id) {
  const tagName = type === gradientTypes.linear ? 
    'linearGradient' : 'radialGradient'

  const grel = Svg (tagName)
    setProps (grel, { id, gradientUnits:'userSpaceOnUse' })

  if (matrix)
    setProps (grel, { gradientTransform:printMatrix (matrix) })

  if (type !== gradientTypes.linear) {
    setProps (grel, { cx:0, cy:0, r:64*102 })
  }

  else {
		var x1 = -64.0 *102
		var x2 = 64.0 *102
		var y1 = -64.0 *102
		var y2 = -64.0 *102
    setProps (grel, { x1, x2, y1, y2 }) // TODO
  }

  for (const { color, offset } of stops) {
    const st = Svg ('stop')
    setProps (st, { offset:(offset/2.55 + '%'), 'stop-color': colorCss (color) })
    grel.append (st)
  }
  return grel
}

}

// Exports
// -------

module.exports = {
  colorCss,
  styleCss,
  gradientCss,
  printTransform,
  printPath,
  _renderPaths,
  _renderers,
}