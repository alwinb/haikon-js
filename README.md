Haikon
======

This is my library for parsing HVIF vector icon files.  
[Here][1] is an example/ test page. 

There is quite a nice article about the format here: [500 Byte Images][2].  
There is also a [Wikipedia][3] page.

[1]: https://alwinb.github.io/haikon-js/
[2]: http://blog.leahhanson.us/post/recursecenter2016/haiku_icons.html
[3]: https://en.wikipedia.org/wiki/Haiku_Vector_Icon_Format


API
---

The top level module contains two objects, _hvif_ and _svg_, both of which are used as a namespace only. 
The _hvif_ object exposes constants and a parse function. The _svg_ object contains a number of functions for generating css declarations, svg attribute-values and svg -dom trees. 

- hvif
  - parseIcon (buffer [, filename]), a.k.a. parse
    - constants
      - colorTags, a.k.a. colourTags
      - styleTags
      - gradientTypes
      - lineCaps
      - lineJoins
- svg
  - colorCss (color)
  - styleCss (style)
  - gradientCss (gradient)
  - printTransform (transform)
  - printPath (path)
  - renderIcon (icon)
  - renderShape (shape)
  - renderGradient (gradient)


Object model
------------

The _parseIcon_ function parses raw icon data into a structure of plain javascript objects and arrays that are used to model the Colors, Gradients, Styles, Paths and Shapes that are used.

#### Icon

A HVIF icon consists of three sections sections: styles, paths and shapes. 
The shapes section refers back to the styles and paths sections. 

- Icon := {
  - filename :: string | null
  - styles :: [Style]
  - paths :: [Path]
  - shapes :: [Shape] }

#### Styles, Colors and Gradients

Colors are stored as single byte that determines the format,
followed by RGBA (4bytes), RGB (3 bytes), K (greyscale, 1 byte) or
as KA (greyscale with alpha, 2 bytes). A Style is either a color, or a gradient. 

- Style := Color | Gradient
- Color := [RGBA = 0x1, r g b a] | [RGB = 0x2, r g b] | [KA = 0x4, k a] | [K = 0x5, k]
- Gradient := [GRADIENT = 0x2, type, flags, stopCount, ?matrix, Stop*]
- Stop := …

### Paths, Lines, Curves and Commands

- Path := …

### Shapes and Transformers

- Shape := { styleIndex:int, pathIndices:[int], ?transformers:[Transformer]
- Transformer := …


Limitations
-----------

Some glitches remain to be fixed and a few things are not (yet) supported, such as a.o. conic– and diamond gradients (they have to be emulated as svg does not support them natively). 


Acknowledgements
----------------

The repository includes icon files from the haiku os as example files in the `examples/` directory. These were taken from [https://github.com/darealshinji/haiku-icons][4]

[4]: https://github.com/darealshinji/haiku-icons


License
-------

MIT

