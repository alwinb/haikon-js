// Test

import fs from 'fs'
import util from 'util'
import { parseIcon, svg } from '../index.js'
const log = console.log.bind (console)

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

var data = fs.readFileSync (dir + samples[0])
var icon = parseIcon (data, samples[0])
// log (util.inspect (icon, { depth:100 }))

//*
log ('<style>html { font-size:24px; padding:2rem }.haikon { font-size:100px }</style>')
for (let sample of samples) {
  var data = fs.readFileSync (dir + sample)
  var icon = parseIcon (data, sample)
  process.stdout.write (svg.renderIcon (icon) .toSVGString ())
}

process.exit (205)
//*/