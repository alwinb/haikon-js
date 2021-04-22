// Test
const fs = require ('fs')
const util = require('util')
const log = console.log.bind (console)

const { hvif: { parseIcon }, svg: { renderIcon } } = require ('../')

const dir = '../examples/haiku-icons/'

const samples = [
  'App_Tracker',
  'Device_Harddisk',
  'Website_Comment',
  'Server_Syslog',
  'Trash_Empty',
  'Trash_Full',
  'Website_Comment',
  'App_Icon-O-Matic'
]

// log (util.inspect (icon, { depth:100 }))
// log (util.inspect (svg, { depth:100 }))
log ('<style>html { font-size:24px; padding:2rem }.haikon { font-size:100px }</style>')
for (let sample of samples) {
  var data = fs.readFileSync (dir + sample)
  var icon = parseIcon (data, sample)
  process.stdout.write (renderIcon (icon) .toSVGString ())
}

process.exit (205)