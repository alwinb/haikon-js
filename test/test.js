// Test
const fs = require ('fs')
const util = require('util')
const log = console.log.bind (console)

require ('../scripts/hvif.js')
parseIcon = Haikon.parseIcon

const dir = '../examples/haiku-icons/'
var sample = 'App_Tracker'
var sample = 'Device_Harddisk'
var sample = 'Website_Comment'
var sample = 'Server_Syslog'
var sample = 'Trash_Empty'
var sample = 'Trash_Full'
var sample = 'Website_Comment'
var sample = 'App_Icon-O-Matic'

var data = fs.readFileSync (dir + sample)
var result = parseIcon (data, sample)

log (util.inspect (result, { depth:100 }))

