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
  const css = type === gradientTypes.linear ? `linear-gradient(to right, ${sts.join (', ')})` :
    type === gradientTypes.conic ? `conic-gradient(${sts.join (', ')})` :
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
    svg.append (renderShape (shape, shapeIndex, icon, id)))
  return span
}

  // Well, it is not clear to me, what the intended behaviour is
  // So, this'll take more effort

  function renderShape (shape, shapeIndex, icon, iconId) {
    if (iconId == null) throw new Error ('id is null')
    const shapeId = `${iconId}-p${shapeIndex.toString (16)}`
    const style = icon.styles [shape.styleIndex]

    // Group for the (possibly multiple) strokes / contours / fill
    const groupEl = Svg ('g')
    const transform = transformAttribute (shape)
    // if (transform) setProps (groupEl, { transform })
      groupEl[refKey] = shape

    const { value:color, gradient } = renderFill (style, shape.styleIndex, shapeId)
    if (gradient) {
      groupEl.append (gradient)
    }

    const d = pathDataAttribute (...shape.pathIndices.map (_ => icon.paths[_]))
    // I think it always sets a fill?
    let hasFill = ! shape.effects.filter (_ => _ instanceof hvif.Stroke) .length
    let hasContour = false

    for (const effect of shape.effects) {

      if (effect instanceof hvif.Stroke) {
        const pathEl = Svg ('path')
        const style = printStrokeStyle (effect)
        setProps (pathEl, { d, transform, fill:'none', stroke:color, style })
        groupEl.append (pathEl)
      }

      else if (effect instanceof hvif.Contour) { // use a mask..
        hasContour = true //?
        const mask = Svg ('mask')
        const maskId = `${iconId}-m${shape.styleIndex.toString (16)}`
        const pathEl = Svg ('path')
        // const style = printStrokeStyle (effect) + `stroke:${color};`

        let style, stroke, fill
        if (effect.width < 0) { // Insets..
          const _effect = setProto ({ width:-effect.width }, effect);
          (style = printStrokeStyle (_effect), stroke = 'black', fill = 'white') // TODO find example
        }
        else (style = printStrokeStyle (effect), stroke='white', fill = hasFill ? 'white' : 'black')
        setProps (pathEl, { d, style, stroke, fill })
        setProps (mask, { transform, id:maskId, maskUnits:'userSpaceOnUse', x:0, y:0, width:6528, height:6528 })
        mask.append (pathEl)

        const bg = Svg ('rect')
        setProps (bg, { x:0, y:0, transform, width:6528, height:6528, fill:color, mask:`url(#${maskId})`})
        groupEl.append (bg, mask)
      }
    }

    if (hasFill &&! hasContour) {
      const pathEl = Svg ('path')
      groupEl.append (pathEl)
      setProps (pathEl, { d, transform, fill:color, stroke:'none' })
    }


    return groupEl
  }

  function renderEffect () {
    
  }

  function renderFill (style, styleIndex, iconId) {
    if (style instanceof hvif.Gradient) {
      const gradientId = `${iconId}-g${styleIndex.toString (16)}`
      const gradient = renderGradient (style, gradientId)
       return { value:`url(#${gradientId})`, gradient }
    }
    else if (style instanceof hvif.Color)
      return { value: colorCss (style) }
  }


  function renderGradient ({ type, stops, matrix }, id) {
    const tagName = type === gradientTypes.linear || type === gradientTypes.conic ? 
      'linearGradient' : 'radialGradient'

    const grel = Svg (tagName)
      setProps (grel, { id, gradientUnits:'userSpaceOnUse' })

    if (matrix)
      setProps (grel, { gradientTransform:printMatrix (matrix) })

    if (type !== gradientTypes.linear && type !== gradientTypes.conic) {
      setProps (grel, { cx:0, cy:0, r:64*102 })
    }

    else {
  		var x1 = -64.0 *102
  		var x2 =  64.0 *102
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