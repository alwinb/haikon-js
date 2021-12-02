Haikon
======

[![NPM version][npm-img]][npm-url]

**[ [Online Demo][1] ]**

This is my library for parsing HVIF vector icon files.  
There is quite a nice article about the format here: [500 Byte Images][2].  
The file format has a [Wikipedia][3] page.

[1]: https://alwinb.github.io/haikon-js/
[2]: http://blog.leahhanson.us/post/recursecenter2016/haiku_icons.html
[3]: https://en.wikipedia.org/wiki/Haiku_Vector_Icon_Format
[npm-img]: https://img.shields.io/npm/v/haikon-js.svg
[npm-url]: https://npmjs.org/package/haikon-js


API
---

### Parsing

- parseIcon (buffer [, filename])

### Constants

- colorFormats: { RGB, RGBA, K, KA }
- gradientTypes: { linear, radial, diamond, conic, xy, sqrtxy }
- lineCaps: { butt, square, round }
- lineJoins: { miter, miterRevert, round, bevel, miterRound }

### Object model

- Icon { styles, paths, shapes, filename }
- Color { type, values }
- Gradient { type, ?matrix, stops }
- Stop { offset, color }
- Polygon { points, closed }
- Path { points, closed }
- Shape { styleIndex, pathIndeces, effects }
- Stroke { with, lineJoin, lineCap, miterLimit }
- Contour { width, lineJoin, miterLimit }

### SVG Renderer

- svg
  - styleCss (color | gradient)
  - colorCss (color)
  - gradientCss (gradient)
  - transformAttribute (shape)
  - pathDataAttribute (polygon | path)
  - renderIcon (icon)
  - renderGradient (gradient)
  - renderShape (shape)


Limitations
-----------

A few things are not (yet) supported, such as a.o. conic– and diamond gradients (they have to be emulated as svg does not support them natively). 


Acknowledgements
----------------

The directory demo/haiku-icons/ contains icons from the haiku OS that are used in the demo page. The icons were taken from [this repository][4]. 
I have combined them into the single haiku-icons.tar file, and make use of [tinytar][5] by [Levko Kravets][6] to extract them from the .tar file before they are parsed and rendered.

[4]: https://github.com/darealshinji/haiku-icons
[5]: https://github.com/kravets-levko/tinytar
[6]: https://github.com/kravets-levko


License
-------

MIT
