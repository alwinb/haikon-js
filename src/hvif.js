const { setPrototypeOf:setProto, assign } = Object
const log = console.log.bind (console)


// Constants
// ---------

const gradientTypes =
  { linear:0, radial:1, diamond:2, conic:3, xy:4, sqrtxy:5 }

const lineJoins =
  { miter:0, miterRevert:1, round:2, bevel:3, miterRound:4 }

const lineCaps =
  { butt:0, square:1, round:2 }


// Icon Object Model
// -----------------

function Icon (styles, paths, shapes, filename) {
  this.styles = styles
  this.paths = paths
  this.shapes = shapes
  this.filename = filename
}

function Color (r, g, b, a) {
  this.values = [r, g, b, a]
}

function Gradient (type, matrix, stops) {
  this.type = type
  this.matrix = matrix
  this.stops = stops
}

function Polygon (points, closed) {
  this.points = points
  this.closed = closed
}

function Path (points, closed) {
  this.points = points
  this.closed = closed
}

function Shape (styleIndex, pathIndices) {
  this.styleIndex = styleIndex
  this.pathIndices = pathIndices
  this.effects = []
}

// 'Effects'

function Contour (width, lineJoin, miterLimit) {
  this.width = width
  this.lineJoin = lineJoin
  this.miterLimit = miterLimit
}

function Stroke (width, lineJoin) {
  this.width = width
  this.lineJoin = lineJoin
  // ... lineJoin, lineCap, miterLimit
}

// ... methods

Color.prototype = {
  toString () {
    const [r,g,b,a] = this.values.map (_ => _ .toString (16) .padStart (2, '0'))
    return `#${r}${g}${b}${a}`
  }
}



// HVIF file format
// ----------------

// Haiku Vecor Icon Files start with four bytes 'ncif', followed by
// three sections: styles, paths, shapes. 
// Each section starts with a single byte indicating the number of objects in 
// that section. These objects are of variable size, thus fast-indexing to 
// sections, or objects is not possible. 

// ## Colors and Styles

// Colors are stored as single byte specifying the format,
// followed by RGBA (4bytes), RGB (3 bytes), K (greyscale, 1 byte) or
// as KA (greyscale with alpha, 2 bytes). A Style is either a color, or a gradient. 

const colorFormats =
  { RGBA:1, RGB:3, KA:4, K:5 }

const styleTags =
  { RGBA:1, RGB:3, KA:4, K:5, GRADIENT:2 }

// ## Gradients

// Gradients are stored as a four byte header [GRADIENT = 0x2, type, flags, stopCount]
// Possibly followed by a matrix; Followed by a section of gradient stops. 
// The flags determine the presence of a matrix and the color format of the stops. 
// All gradient stops for a single gradient must use the same format. 
// Gradient stops are stored as a one-byte offset followed by a number of bytes as 
// determined by the color format. NB 'hexColors' is not used.

const gradientFlags =
  { transform: 1<<1, noAlpha: 1<<2, hexColors: 1<<3, greys: 1<<4 }


// ## Paths

// A path starts with two bytes [flags, pointCount] and is followed by a section of point-controls. 
// The flags specify the type- and the storage format of the controls. 

const pathFlags =
  { closed:1<<1, commands:1<<2, points:1<<3 }

// NB If the points flag is set, then the commands flag is ignored. 
// If neither are set then the controls are stored as six coordinates each. 
// If points is set, the controls are stored as two coordinates each. 

// If the commands flag is set, the controls are of heterogenous type;
// In this case, they are stored as a section of pointTags, followed by a 
// section of coordinates whose length is determined by the pointTags. 
// A single controlTag is stored in two _bits_ thus four of them can be stored per byte. 

const pointTags = { 
  CURVE: 3, // Point with two control points;
  LINE:  2, // Point with no control points. 
  HLINE: 1, // No control points, horizontally aligned with previous point. 
  VLINE: 0, // No controls, vertically aligned with previous point. 
}

// ## Coordinates

// Coordinates are stored in one or two bytes. 
// The first bit indicates integer (0) or float (1). 
// Integer coordinates are 7-bits, in range -32, +95
// Float coordinates are 15 bits, range -128 to  around 192;

// However, in my implementation I preserve the integer coordinates,
// Thus, the coordinate system that I use has a square canvas of
// 64 * 102 = 6528 'points' instead. (102 is used in the orginial implementation). 

// ## Shapes

// A header [PATH_SOURCE=0xa, styleIndex, pathCount, ...pathIndices, shapeFlags];
// Depending on the flags followed by a matrix or a translation;
// Depending on the flags, followed by two a two-bytes level-of-detail-scale;
// followed by a section of 'transformers'.
// NB If the matrix flag is set, the translate flag is ignored. 

const shapeTags =
  { PATH_SOURCE: 10 }

const shapeFlags = {
	matrix:       1 << 1,
	hinting:      1 << 2,
	lodScale:     1 << 3,
	transformers: 1 << 4,
	translate:	  1 << 5,
}

// ## 'Transformers'

const transformerTags =
  { AFFINE:20, CONTOUR:21, PERSPECTIVE:22, STROKE:23 }

/*
Matrix: float24 times six
The first shape will be the lower layer. 
*/

function parseIcon (data, filename = null) {
  let pos = 0
  return parse ()

  function parse () {
    const [n,c,i,f] = data
    if (n !== 0x6E || c !== 0x63 || i !== 0x69  || f !== 0x66)
      throw new Error ('not a hvif file')
    pos = 4
    const styles = repeat (data [pos++], readStyle)
    const paths  = repeat (data [pos++], readPath)
    const shapes = repeat (data [pos++], readShape)
    if (pos !== data.length)
      throw new Error ('Additional padding after hvif file')
    return new Icon (styles, paths, shapes, filename)
  }

  function repeat (count, reader) {
    const r = []
    for (; count > 0; count--)
      r.push (reader ())
    return r
  }

  function readStyle () {
    const tag = data [pos++]
    return tag === styleTags.GRADIENT ?
      readGradient () : readColorOfType (tag)
  }

  function readPath () {
    const [flags, pointCount] = data.slice (pos, pos += 2)
    const closed = !! (flags & pathFlags.closed)
    if (flags & pathFlags.points) {
      const points = readCoords (pointCount * 2)
      return new Polygon (points, closed)
    }
    else if (flags & pathFlags.commands) {
      const points = readControls (pointCount)
      return new Path (points, closed)
    }
    else {
      const points = readCoords (pointCount * 6)
      return new Path (points, closed)
    }
  }

  function readShape () {
    const _sartPos = pos
    const [tag, styleIndex, pathCount] = data.slice (pos, pos += 3)
    if (tag !== 0xa) throw new Error ('readShape: unkown path tag: '+tag)

    const pathIndices = [...data.slice (pos, pos += pathCount)]
    const shape = new Shape (styleIndex, pathIndices)

    const flags = data [pos++]
    if (flags & shapeFlags.matrix)
      shape.matrix = readMatrix ()

    else if (flags & shapeFlags.translate)
      shape.translate = readCoords (2)

    if (flags & shapeFlags.lodScale) {
      let [min, max] = data.slice (pos, pos+=2)
      min = min / 63.75
      max = max / 63.75 // TODO adjust for my coordinate system
      shape.detailLevel = { min, max }
    }

    if (flags & shapeFlags.transformers) {
      const count = data [pos++]
      shape.effects = readEffects (count)
    }

    // if (! shape.effects.length)
    //   shape.effects[0] = new Fill ()

    // TODO hinting transformer?
    // shape._startPos = pos
    return shape
  }

  // Called from readShape

  function readEffects (count) {
    const effects = []
    for (; count > 0; count--) {
      const tag = data [pos++]
      switch (tag) {

        /*
        // Affine: 6 bytes (!!)
        // NB this is not used in any of the official icons
        case transformerTags.AFFINE:
          // NB matrix of six i32 values...?
          //const matrix = data.slice (pos, pos += (32/4) * 6)
          const matrix = readMatrix ()
          throw new Error ('TODO read affine transformer')
        break*/

        // Contour: width, join, miterLimit (3 bytes)
        // TODO check parsing of lineJoin et al
        case transformerTags.CONTOUR: {
          const [width, lineJoin, miterLimit] = data.slice (pos, pos += 3)
          const effect = new Contour ((width - 128) * 102)
          effect.lineJoin = lineJoin
          effect.miterLimit = miterLimit * 102
          effects.push (effect)
        }
        break

        // Stroke: width, options, miterLimit
        // LineOptions stores lineJoin, lineCap in 4 bits each
        case transformerTags.STROKE: {
          const [width, lineOptions, miterLimit] = data.slice (pos, pos += 3)
          const effect = new Stroke ((width - 128) * 102)
          effect.lineJoin = lineOptions & 0xf
    			effect.lineCap = lineOptions >> 4
          effect.miterLimit = miterLimit * 102
          effects.push (effect)
        }

        // Perspective: // Unimplemented in the original
        break; default:
          log ('unknown transformer tag: '+tag+' @ '+pos)
          return effects // throw new Error ('unknown transformer tag: '+tag)
      }
    }
    return effects
  }

  // Called from readStyle
  
  function readColorOfType (format) {
    switch (format) {
      case colorFormats.K:
        const byte = data [pos++]
        return new Color (byte, byte, byte, 255)

      case colorFormats.KA:
        const byte1 = data [pos++]
        return new Color (byte1, byte1, byte1, data [pos++])

      case colorFormats.RGB:
        return new Color (data[pos++], data[pos++], data[pos++], 255)

      case colorFormats.RGBA:
        return new Color (data[pos++], data[pos++], data[pos++], data[pos++])

      default:
        throw new Error (`unknown color format: ${format}`)
    }
  }

  function readGradient () {
    const [type, flags, stopCount] = data.slice (pos, pos += 3)
    const { greys, noAlpha } = gradientFlags

    const colorFormat
      = flags & greys   ? (flags & noAlpha ? colorFormats.K : colorFormats.KA)
      : flags & noAlpha ? colorFormats.RGB : colorFormats.RGBA

    const matrix = flags & gradientFlags.transform ? readMatrix () : null
    const stops = readStops (stopCount, colorFormat)
    return new Gradient (type, matrix, stops)
  }
  
  function readStops (stopCount, colorFormat) {
    const stops = []
    for (; stopCount > 0; stopCount--) {
      const offset = data [pos++]
      const color = readColorOfType (colorFormat)
      stops.push ({ offset, color })
    }
    stops.sort ((a,b) => a.offset < b.offset ? -1 : a.offset > b.offset ? 1 : 0)
    return stops
  }

  // Called from readPath

  function readControls (pointCount) {
    const commandBytes = Math.ceil (pointCount / 4) // four per byte
    const buff = data.slice (pos, pos += commandBytes) // TODO use views wherever possible
    const commandBuffer = parseCommands (buff)
    const points = []
    let last = [0, 0, 0, 0, 0, 0] // x, y, xin, yin, xout, yout
    let p = [0, 0, 0, 0, 0, 0] // current
    for (let i=0; i<pointCount; i++) {
      const tag = commandBuffer[i]
      switch (tag) {
        case pointTags.VLINE:
          // set xin, xout, x to the previous x position
          p[0] = p[2] = p[4] = readCoords (1) [0]
          // however.. this should also...
          // modify the previos xout, yout to the previous x
          points.push (...p)
        break
        case pointTags.HLINE:
          p[1] = p[3] = p[5] = readCoords (1) [0]
          points.push (...p)
        break
        case pointTags.LINE:
          p[0] = p[2] = p[4] = readCoords (1) [0]
          p[1] = p[3] = p[5] = readCoords (1) [0]
          points.push (...p)
        break
        case pointTags.CURVE:
          p = readCoords (6)
          points.push (...p)
        break
        default:
          throw new Error ('Unknown Point-type')
      }
    }
    return points
  }
  

  // Other

  function readMatrix () {
    const matrix = []
    for (let i=0; i<6; i++)
      matrix.push (parseFloat24 (data.slice (pos, pos += 3)))
    return matrix
  }

  // Upscaled by a factor of 102 so as to 
  // only use integer coordinates. 
  
  function readCoords (length) {
    const points = []
    for (; length > 0; length--) {
      let v = data [pos++]
      if (v >= 128) { // two byte coordinate
        v = ((v & 127) << 8) + data [pos++]
        //points.push ((v / 102) - 128)
        points.push (v - 128 * 102)
      }
      else
        //points.push (v - 32) 
        points.push (v * 102 - 32 * 102)
    }
    return points
  }

}

function parseCommands (buffer) {
  const commands = []
  for (let i=0; i<buffer.length; i++) {
    const cs = buffer[i]
    commands.push (cs & 0b11, (cs>>2)&0b11, (cs>>4)&0b11, (cs>>6)&0b11)
  }
  return commands
}

// 24 bit floats have 1 sign bit; six exponent bits; 17 mantissa bits. 
// 32 bit floats have 1 sign bit, 8 exponent bits, 23 mantissa bits

function parseFloat24 ([b1, b2, b3]) {
  const v = new DataView (new ArrayBuffer (4))
	const shortValue = (b1 << 16) | (b2 << 8) | b3
	const sign     =  (shortValue & 0x800000) >>> 23
	const exponent = ((shortValue & 0x7e0000) >>> 17) - 32
	const mantissa =  (shortValue & 0x01ffff) << 6
	const value = (sign << 31) | ((exponent + 127) << 23) | mantissa
  v.setUint32 (0, value)
  const f = v.getFloat32 (0)
  //log (f)
  return f
}


// Exports
// -------

export {
  parseIcon,
  Color, Gradient, Polygon, Path, Shape, Contour, Stroke,
  gradientTypes, lineCaps, lineJoins }