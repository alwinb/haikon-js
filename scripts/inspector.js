const assign = Object.assign

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
    this.title.innerHTML = ''
    this.title.append (filename.split ('_') .join (': '))

    icon.styles.forEach ((style, styleIndex) => {
      this.styles.append (paletteElement (style, styleIndex, this))
    })

    icon.shapes.forEach ((shape, shapeIndex) => {
      this.layers.append (layerElement (shape, shapeIndex, icon, this))
    })

    const svg = HaikonSvg.renderIcon (icon).getElementsByTagName ('svg') [0]
    //const viewBox = '0 0 6528 6528'
    const viewBox = '-204 -204 6936 6936'
      setProps (svg, { viewBox, style:null })
    this.svg.replaceWith (svg)
  }

  selectShape (shapeIndex, icon) {
    // Should be done via component state and bubble event
    const shape = icon.shapes[shapeIndex]
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
  const ts = (shape.transformers || [{_tag:'fill'}])
  ts.forEach (_ => labels.push (_._tag))
  if (shape.transform)
    labels.push ('transform')
  el.append (labels.join (', '))
  el.addEventListener ('click', evt => {
    log ('Select shape', shapeIndex, el.className)
    view.select (el)
    view.selectShape (shapeIndex, icon)
  })

  return el
}

function paletteElement (style, styleIndex, view) {
  const { tag } = style
  let el = Dom ('div.style')

  if (tag === 2 /* gradient */) {
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

  el.addEventListener ('click', evt => {
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
  const paths = shape.pathIndices.map (i => icon.paths[i])
  const g = Svg ('g')
  const el = Svg ('path')
    g.append (el)
    setProps (el, { d:HaikonSvg.printPath (...paths )})
  if (shape.transform)
    setProps (g, { transform:HaikonSvg.printTransform (shape.transform) })

  for (const { type, points } of paths) {
    if (type === 'points') {
      for (let i=0, l=points.length; i<l; i+=2)
        g.append (point (...points.slice(i, i+2)))
    }
    else if (type === 'curves') {
      for (let i=0, l=points.length; i<l; i+=6)
        g.append (controls (...points.slice (i, i+6)))
    }
  }
  
  // Now the gradients
  return g
}

function point (x, y) {
  const el = Svg ('rect')
  return setProps (el, { x:x-70, y:y-70, width:140, height:140 })
}

function controls (x, y, xin, yin, xout, yout) {
  const g = Svg ('g')
  const p = Svg ('path')
  setProps (p, { d:['M', xin, yin, x, y, xout, yout].join(' ') })
  g.append (p, point(x, y), diam(xin, yin), diam(xout, yout))
  return g
}

function diam (x, y) {
  const g = Svg ('g')
  var el = Svg ('path')
  g.append (setProps (el, { stroke:'cyan', d:`M${x-70} ${y} l70 70 l70 -70 l-70 -70 z`}))
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
