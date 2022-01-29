const FgYellow = '\x1b[33m'
const FgGreen = '\x1b[32m'
const FgRed = '\x1b[31m'

const bright = '\x1b[1m'
const reset = '\x1b[0m'

const log = (data) => {
  const now = new Date().toLocaleString('en-GB', { timeZone: 'UTC' }).replace(',', '')
  console.log(`${FgYellow}${now}: ${data} ${reset}`)
}

const rLog = (req, res, next) => {
  log(`${FgGreen}${bright}${req.method} ${req.url}`)
  next()
}

const nLog = (...data) => {
  log(`${FgGreen}${data}`)
}

const eLog = (...data) => {
  log(`${FgRed}${bright}${data}`)
}

module.exports = {
  rLog,
  eLog,
  nLog
}
