var { createServer } = require('http')
var {
  log_info,
  serve,
  b4_exit
} = require('./lib.js')

var PORT = process.env.PORT || 41900

var http_server = createServer(serve).listen(PORT, function () {
  log_info(`http server live @ 0.0.0.0:${PORT}`)
})

b4_exit(function () {
  http_server.close()
  log_info(`http server shutting down @ 0.0.0.0:${PORT}`)
})
