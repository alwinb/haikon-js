import * as hvif from './hvif.js'
const { setPrototypeOf:setProto, entries } = Object
const { colorTags, gradientTypes } = hvif._constants
const log = console.log.bind (console)


// CSS values
// ----------

function colorCss ({ tag, values: bytes = [] }) {
  if (tag === colorTags.KA || tag === colorTags.K)
    bytes = [bytes[0], bytes[0]] .concat (bytes)
  return '#' + (bytes.map (_ => _.toString (16) .padStart (2, '0')) .join (''))
}

function styleCss (style) {
  return style instanceof hvif.Gradient ? gradientCss (style) : colorCss (style)
}

function gradientCss ({ type, stops }) {
  const sts = stops.map (({ color, offset }) => colorCss (color) + ' ' + offset/2.55+'%')
  if (type !== gradientTypes.linear && type !== gradientTypes.radial && type !== gradientTypes.conic) {
    const names = ['linear', 'radial', 'diamond', 'conic', 'xy', 'sqrtxy']
    console.warn ('Rendering a', names[type], 'gradient as a radial css gradient instead.')
  }
  const css = type === gradientTypes.linear ?
      `linear-gradient(to right, ${sts.join (', ')})` :
    type === gradientTypes.conic ?
      `conic-gradient(${sts.join (', ')})` :
    // all others rendered as radial
    `radial-gradient(circle at center, ${sts.join (', ')})`
  return css
}

function printStrokeStyle (effect) {
  return `stroke-width:${effect.width};` + 
    `stroke-linejoin:${["miter", "miter", "round", "bevel", "miter"][effect.lineJoin]};` + 
    `stroke-linecap:${["butt", "square", "round"][effect.lineCap]};`
}


// Attribute strings
// -----------------

// leaving the translate for now...
// So, TODO have the parser adjust for my coordinate units

function printMatrix ([a,b,c,d,e,f]) {
  return `matrix(${[a,b,c,d, e*102, f*102].join(' ')})`
}

function transformAttribute (shape) {
  if (shape.matrix)
    return printMatrix (shape.matrix)
  if (shape.translate) {
    const [dx,dy] = shape.translate
    return `translate(${dx} ${dy})`
  }
}

function pathDataAttribute (...paths) {
  return [..._renderPaths (paths)] .join (' ')
}

function* _renderPaths (paths) {
  for (let i=paths.length-1; i>=0; i--) {
    const { points, closed } = paths[i]
    if (paths[i] instanceof hvif.Polygon) {
      yield* ['M', points[0], points[1], 'L']
      for (let i=2, l=points.length; i<l; i++) yield points[i]
      if (closed) yield 'Z'
    }
    else if (paths[i] instanceof hvif.Path) {
      var [x0, y0, xin0, yin0] = points.slice (0, 4)
      yield* ['M', x0, y0]
      for (let i=4, l=points.length-6; i<l;) {
        const [xout, yout, x, y, xin, yin] = points.slice (i, i+=6)
        yield* ['C', xout, yout, xin, yin, x, y]
      }
      if (closed) {
        const [xout, yout] = points.slice (points.length-2)
        yield* [xout, yout, xin0, yin0, x0, y0]
        yield 'Z'
      }
    }
  }
}


// Svg Renderer
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

function Renderer (createElementNS) {

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
  const d = pathDataAttribute (...paths)
  const pel = Svg ('path')
    setProps (pel, { d })

  const transform = transformAttribute (shape)
  if (transform) setProps (pel, { transform })

  if (shape.effects.length > 1)
    console.warn ('#'+id, '('+icon.filename+')', 'TODO: support multiple effects;', shape.effects.map (_ => _.constructor.name) )

  // Assuming for now there's at most one effect/transformer
  let effect = shape.effects [0]
  for (let t of shape.effects || [])
    if (t instanceof hvif.Stroke || t instanceof hvif.Contour)
      effect = t

  // Render the style, optionally generating a gradient element
  const haikonStyle = icon.styles [shape.styleIndex]
  let gradient = null
  let color = ''
  if (haikonStyle instanceof hvif.Gradient) {
    const gradientId = id + '-g' + shape.styleIndex.toString (16)
    gradient = renderGradient (haikonStyle, gradientId)
    color = `url(#${gradientId})`
    // log ('gradient Id', color)
  }
  else
    color = colorCss (haikonStyle)

  // Now actually render the shapes...
  if (effect instanceof hvif.Stroke) {
    const style = printStrokeStyle (effect) + `stroke:${color};` + 'fill:none;'
    setProps (pel, { style })
    if (gradient) {
      const g = Svg ('g')
      g.append (gradient, pel)
      return g
    }
    else return pel
  }

  else if (effect instanceof hvif.Contour) { // use a mask..
    let style
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

  else if (effect instanceof hvif.Fill) {
    const style = printStrokeStyle (effect) + `fill:${color};` + 'stroke:none;'
    setProps (pel, { style })
    if (gradient) {
      const g = Svg ('g')
      g.append (gradient, pel)
      return g
    }
    else return pel
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

} // end Renderer

// Exports
// -------

export {
  colorCss,
  styleCss,
  gradientCss,
  transformAttribute,
  pathDataAttribute,
  Renderer,
}