import * as hvif from './hvif.js'
const { setPrototypeOf:setProto, entries } = Object
const { gradientTypes } = hvif
const log = console.log.bind (console)


// SVG Renderer
// ============

// CSS values
// ----------

function styleCss (style) {
  return style instanceof hvif.Gradient ? gradientCss (style) : String (style)
}

function gradientCss ({ type, stops }) {
  const sts = stops.map (({ color, offset }) => String (color) + ' ' + offset/2.55 + '%')
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


// Attribute strings
// -----------------

// leaving the translate for now...
// So, TODO have the parser adjust for my coordinate units

function printMatrix ([a,b,c,d,e,f]) {
  e *= 102; f *= 102
  const round = [a,b,c,d,e,f] .map (_ => Math.round (_ * 1e5) / 1e5)
  return `matrix(${round.join(' ')})`
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

function strokeAttributes (effect) {
  return {
    'stroke-width': effect.width,
    'stroke-linejoin': ["miter", "miter", "round", "bevel", "miter"] [effect.lineJoin],
    'stroke-linecap': ["butt", "square", "round"] [effect.lineCap],
  }
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

const refKey =
  Symbol ('Haikon.ref')

function idGen () {
  return ((Math.random () * 2e16)>>>0) .toString (36)
}

function setProps (el, obj) {
  for (const [k,v] of entries (obj))
    el.setAttribute (k, v)
  return el
}

// ### Renderer

const svgns = 'http://www.w3.org/2000/svg'
const htmlns = 'http://www.w3.org/1999/xhtml'

class Renderer {
  
  constructor (document) {
    this.document = document
  }

  renderFrame () {
    this.id = idGen ()
    this.cssStyleValues = []

    this.span = this.document.createElementNS (htmlns, 'span')
      setProps (this.span, { 'class': 'haikon '})

    this.svg = this.document.createElementNS (svgns, 'svg')
      const viewBox = '0 0 6528 6528'
      setProps (this.svg, { id:this.id, viewBox, style:'width:2em; height:2em; transform:translate(0, .45em);' })
      this.span.append (this.svg)

    this.defs = this.document.createElementNS (svgns, 'defs')
      this.svg.append (this.defs)
  }

  renderIcon (icon) {
    this.renderFrame ()
    this.icon = icon

    icon.styles.forEach ((style, i) => {
      const rendered = this.renderStyle (style, i)
      if (rendered.elem) this.defs.append (rendered.elem)
      this.cssStyleValues [i] = rendered.cssValue
    })

    icon.shapes.forEach ((shape, i) =>
      this.svg.append (this.renderShape (shape, i))
    )
    return this.span
  }

  renderStyle (style, styleIndex) {
    if (style instanceof hvif.Gradient) {
      const elem = this.renderGradient (style)
      const id = `${this.id}-g${styleIndex.toString (16)}`
      setProps (elem, { id })
      return { cssValue:`url(#${id})`, elem }
    }
    else if (style instanceof hvif.Color)
      return { cssValue: String (style) }
  }

  renderGradient ({ type, stops, matrix }) {
    const tagName
      = type === gradientTypes.linear || type === gradientTypes.conic
      ? 'linearGradient' // NB rendering conic gradient as linear
      : 'radialGradient' // NB rendering all other types as radial

    const elem = this.document.createElementNS (svgns, tagName)
      setProps (elem, { gradientUnits:'userSpaceOnUse' })

    if (matrix)
      setProps (elem, { gradientTransform:printMatrix (matrix) })

    if (type !== gradientTypes.linear && type !== gradientTypes.conic)
      setProps (elem, { cx:0, cy:0, r:64*102 })

    else {
  		const w = 64 * 102
      setProps (elem, { x1:-w, x2:w, y1:-w, y2:-w })
    }

    for (const { color, offset } of stops) {
      const stopElem = this.document.createElementNS (svgns, 'stop')
      setProps (stopElem, { offset:(offset/2.55 + '%'), 'stop-color': String (color) })
      elem.append (stopElem)
    }

    return elem
  }


  renderShape (shape) {
    let shapeElem

    const transform =
      transformAttribute (shape)

    const cssStyle =
      this.cssStyleValues [shape.styleIndex]
    
    const pathData =
      pathDataAttribute (...shape.pathIndices.map (_ => this.icon.paths [_]))

    if (shape.effects.length > 1) {
      shapeElem = this.document.createElementNS (svgns, 'g')
      for (const effect of shape.effects)
        shapeElem.append (this.renderEffect (pathData, cssStyle, effect))
    }

    else shapeElem =
      this.renderEffect (pathData, cssStyle, shape.effects[0])

    if (shape.matrix || shape.translate)
      setProps (shapeElem, { transform })

    shapeElem [refKey] = shape
    return shapeElem
  }


  renderEffect (pathData, color, effect) {
    if (effect instanceof hvif.Fill) {
      const pathElem = this.document.createElementNS (svgns, 'path')
      return setProps (pathElem, { d:pathData, fill:color, stroke:'none' })
    }

    if (effect instanceof hvif.Stroke) {
      const pathElem = this.document.createElementNS (svgns, 'path')
      setProps (pathElem, strokeAttributes (effect))
      return setProps (pathElem, { d:pathData, fill:'none', stroke:color })
    }

    if (effect instanceof hvif.Contour)
      return this.renderContour (pathData, color, effect)

  }
  
  renderContour (pathData, color, effect) {
    const maskId = `${this.id}-e${idGen ()}`

    const attributes = strokeAttributes (effect)
      attributes.d = pathData

    if (effect.width < 0) { // Inset
      attributes['stroke-width'] = -attributes['stroke-width']
      attributes.stroke = 'black'
      attributes.fill = 'white'
    }

    else {
      attributes.stroke = 'white'
      attributes.fill = 'black' // FIXME so indeed; detect if the effect is applied to a fill, or a stroke
      // in case of a fill, use fill = 'white' otherwise, use fill = 'black'
    }

    const contourElem =
      this.document.createElementNS (svgns, 'g')

    const mask = this.document.createElementNS (svgns, 'mask')
      setProps (mask, { id:maskId, maskUnits:'userSpaceOnUse', x:0, y:0, width:6528, height:6528 })

    const pathElem = this.document.createElementNS (svgns, 'path')
      setProps (pathElem, attributes)
      mask.append (pathElem)

    const bg = this.document.createElementNS (svgns, 'rect')
      setProps (bg, { x:0, y:0, width:6528, height:6528, fill:color, mask:`url(#${maskId})`})
      contourElem.append (bg, mask)

    return contourElem
  }

}

// Wrap it up

function renderIcon (icon, document = globalThis.document) {
  const renderer = new Renderer (document)
  return renderer.renderIcon (icon)
}


// Exports
// -------

export {
  renderIcon,
  gradientCss, styleCss,
  transformAttribute, pathDataAttribute, strokeAttributes,
  Renderer,
  refKey,
}