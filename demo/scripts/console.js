const svgns = 'http://www.w3.org/2000/svg'
const htmlns = 'http://www.w3.org/1999/xhtml'
const log = (...args) => globalThis.console.log (...args)

// DOM Utils 
// ---------

const Svg = (...args) => _DomNS (svgns, 'g', ...args)
const Dom = (...args) => _DomNS (htmlns, 'div', ...args)

function _DomNS (ns, _default, tagname, ...subs) {
  var names = tagname.split ('.')
  tagname = names.length ? names.shift () : _default
  var el = document.createElementNS (ns, tagname)
  if (names.length)
    setProps (el, { 'class': names.join (' ') })
  el.append (...subs)
  return el
}

function setProps (el, obj) {
  for (const [k,v] of Object.entries (obj))
    el.setAttribute (k, v)
  return el
}

// In-page Console
// ===============

class Console {

  constructor () {
    this.elem = Dom ('div.Console')
      this.elem.append (this.pre0 = Dom ('pre'), this.pre = Dom ('pre'))
    this.count = 0
    this.hover = false
    this.elem.addEventListener ('mouseover', evt => this.hover = true)
    this.elem.addEventListener ('mouseout', evt => this.hover = false)
    setProps (this.elem, { style:'tab-size:2;' })
  }

  log   (...msgs) { this._log ('log',   msgs) }
  error (...msgs) { this._log ('error', msgs) }
  info  (...msgs) { this._log ('info',  msgs) }
  warn  (...msgs) { this._log ('warn',  msgs) }

  write (...elems) {
    this.pre.append (...elems)
  }

  _log (tag, msgs) {
    // 2000 logs buffer over two 'pages'
    if (this.count > 1000) {
      this.pre0.remove ()
      this.pre0 = this.pre
      this.elem.append ((this.pre = Dom ('pre')))
      this.count = 0
    }
    this.count++
    const el = Dom (`span.${tag}`)
    el.append (...(msgs.map ($ => String ($) + ' ')))
    this.pre.append (el, '\n')
    if (!this.hover) this.elem.scrollTo (0, this.elem.scrollHeight)
  }

  clear () {
    this.count = 0
    this.pre0.innerHTML = this.pre.innerHTML = ''
  }

  errorHandler ({ message, filename, lineno:line, colno:column, error }) {
    // Convert to a txtmt URL
    if (filename != null) {
      const url = new URL (filename, document.baseURI)
      let callbackUrl = url
        Object.entries ({ line, column }) .forEach (kv => url.searchParams.set (...kv))
      if (url.protocol === 'file:' || url.protocol === 'x-txmt-filehandle:') { // convert to txmt: URL
        callbackUrl = new URL ('txmt://open?')
        Object.entries ({ url:filename, line, column }) .forEach (kv => callbackUrl.searchParams.set (...kv))
      }
      const el = Dom ('a.error', url)
        el.href = callbackUrl
      this.error (message)
      this.write ('\t', el, '\n')
      error.stack.split ('\n') .forEach ($ => console.error ('\t' + $))
    }
    else
      this.error (error.name + ':' + message, filename, line, column)
  }

}

