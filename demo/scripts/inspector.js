import * as Haikon from '../../src/hvif.js'
import * as HaikonSvg from '../../src/svg.js'
const assign = Object.assign
const { renderIcon } = HaikonSvg.Renderer (document.createElementNS.bind (document))

// Icon Inspector
// ==============

class Inspector {

  constructor () {
    const elem   = Dom ('div.Inspector')
    const title  = Dom ('h2.title')
    const layers = Dom ('div.layers')
    const info   = Dom ('pre.info')
    const styles = Dom ('div.styles')
    const svg    = Svg ('svg.render')
      info.append (' ')

    const viewBox = '-204 -204 6936 6936'
    const outlines = Svg ('svg.outlines')
      setProps (outlines, { viewBox })

    const wrap = Dom ('div.wrap')
      wrap.append (svg, outlines)

    const state = { selection: null }
    elem.append (title, layers, wrap, info, styles)
    assign (this, { title, elem, layers, styles, svg, outlines, info, state })
  }

  show (icon, filename = 'Untitled') {
    this._doc = icon
    this.title.innerHTML = ''
    this.title.append (filename.split ('_') .join (': '))

    icon.styles.forEach ((style, styleIndex) => {
      this.styles.append (paletteElement (style, styleIndex, this))
    })

    icon.shapes.forEach ((shape, shapeIndex) => {
      this.layers.insertBefore (layerElement (shape, shapeIndex, icon, this), this.layers.firstChild)
    })

    const svg = renderIcon (icon) .getElementsByTagName ('svg') [0]
    //const viewBox = '0 0 6528 6528'
    const viewBox = '-204 -204 6936 6936'
      setProps (svg, { viewBox, style:null })
    this.svg.removeEventListener ('mousedown', this)
    this.svg.replaceWith (this.svg = svg)
    svg.addEventListener ('mousedown', this)
  }

  selectShape (shape, shapeIndex, icon) {
    // Should be done via component state and bubble event
    this.outlines.innerHTML = ''
    this.outlines.append (renderOutlines (shape, icon))
    //this.outlines.append (renderGrid())
    this.info.innerHTML = JSON.stringify (shape, null, 2)
  }

  select (elem) {
    if (this.selection)
      this.selection.classList.remove ('-selected')
    this.selection = elem
    elem.classList.add ('-selected')
  }

  handleEvent (evt) {
    if (HaikonSvg.refKey in evt.target) {
      const obj = evt.target [HaikonSvg.refKey]
      if (obj.index) {
        const els = this.layers.childNodes
        const layer = els.length - 1 - obj.index
        const el = els [layer]
        this.select (el)
        this.layers.scrollTop = (layer -2) * 45
        this.selectShape (obj, obj.index, this._doc)
      }
      this.info.innerHTML = JSON.stringify (obj, null, 2)
    }
  }

}

// Inspector/ Views
// ----------------

// A list-item view for each shape

function layerElement (shape, shapeIndex, icon, view) {
  const el = Dom ('div.layer')
  const swatch = Dom ('div.swatch')
    swatch.style.background = HaikonSvg.styleCss (icon.styles [shape.styleIndex])
    el.append (swatch)

  const labels = []
  if (shape.pathIndices.length > 1) labels.push ('compound')
  const ts = shape.effects.length ? shape.effects : [{_tag:'fill'}]
  ts.forEach (_ => {
    const name = _ instanceof Haikon.Stroke ? 'stroke'
      : _ instanceof Haikon.Contour ? 'contour'
      : _ instanceof Haikon.Fill ? 'fill'
      : _._tag
    labels.push (name)
  })

  if (shape.matrix || shape.translate)
    labels.unshift ('transform')

  el.append (labels.join (', '))

  el.addEventListener ('mousedown', evt => {
    log ('Select shape', shapeIndex, el.className)
    view.select (el)
    view.selectShape (shape, shapeIndex, icon)
  })

  return el
}

function paletteElement (style, styleIndex, view) {
  const { tag } = style
  let el = Dom ('div.style')

  if (style instanceof Haikon.Gradient) {
    const { type, matrix, stops } = style
      el.classList.add ('gradient')
      el.style.background = HaikonSvg.gradientCss (style)
      //el.append (type /* linear, circular, etc */ )
      //if (style.matrix) el.append (' T ')
  }
  else {
    el.classList.add ('color')
    el.style.background = HaikonSvg.colorCss (style)
  }

  el.addEventListener ('mousedown', evt => {
    view.info.innerHTML = JSON.stringify (style, null, 2)
    log ('Select style', style, styleIndex)
    view.select (el)
    view.outlines.innerHTML = ''
    if (style.matrix != null) {
      const [a,b,c,d,e,f] = style.matrix
      const transform = `matrix(${[a,b,c,d, e*102, f*102].join(' ')})` // leaving the translate for now...
      const g = renderGrid ()
      setProps (g, { transform })
      view.outlines.append (g)
    }
  })

  return el
}


//

// Outlines/ Inspectors Svg Builders 
// ---------------------------------

function renderOutlines (shape, icon) {
  const paths = shape.pathIndices.map (_ => icon.paths [_])
  const g = Svg ('g')
  const el = Svg ('path')
    g.append (el)
    setProps (el, { d:HaikonSvg.pathDataAttribute (...paths )})

  const transform = HaikonSvg.transformAttribute (shape)
  if (transform) setProps (g, { transform })

  for (const path of paths) {
    const { points } = path
    if (path instanceof Haikon.Polygon) {
      for (let i=0, l=points.length; i<l; i+=2) { let p
        g.append (p = point (...points.slice(i, i+2)))
        if (i === 0) p.setAttribute ('class', 'first')
      }
    }
    else if (path instanceof Haikon.Path) {
      for (let i=0, l=points.length; i<l; i+=6) { let cs
        g.append (cs = controls (...points.slice (i, i+6)))
        if (cs && i===0) cs.firstChild.setAttribute ('class', 'first')
      }
    }
  }
  
  // Now the gradients
  return g
}

function point (x, y) {
  const el = Svg ('rect')
  return setProps (el, { x:x-70, y:y-70, width:140, height:140 })
}

function circle (x, y) {
  const el = Svg ('circle')
  return setProps (el, { cx:x, cy:y, r:70 })
}

function controls (x, y, xin, yin, xout, yout) {
  const g = Svg ('g')
  const p = Svg ('path')
  setProps (p, { d:['M', xin, yin, x, y, xout, yout].join(' ') })
  g.append (point(x,y))
  if (xin !== x || yin !== y)
    g.append (circle(xin, yin))
  if (xout !== x || yout !== y)
    g.append (circle(xout, yout))
  g.append (p)
  return g
}


function renderGrid () {
  const g = Svg ('g')
  const c = Svg ('circle')
    setProps (c, { r:102, x:0, y:0 })
  g.append (c)
  setProps (g, { class:'grid' })
  for (let i=-64; i<64; i+=4) {
    const l1 = Svg ('line')
    var p = i * 102
    setProps (l1, { x1:-64*102, x2:64*102, y1:p, y2:p }) // h
    g.append (l1)
    //const l2 = Svg ('line')
    //setProps (l2, { x2:p, x1:p, y1:-64*102, y2:64*102 }) // v
    //g.append (l2)
  }
  return g
}


// Exports
// -------

export { Inspector }