module.exports = {
  hvif: require ('./scripts/hvif'),
  svg: require ('./scripts/svg'),
}

const log = console.log.bind (console)
log (module.exports)