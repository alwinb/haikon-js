// Test
const fs = require ('fs')
const util = require('util')
const log = console.log.bind (console)

const { hvif: { parseIcon }, svg: { renderIcon } } = require ('../')

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
var icon = parseIcon (data, sample)
log (util.inspect (icon, { depth:100 }))

var svg = renderIcon (icon)
log (util.inspect (svg, { depth:100 }))
