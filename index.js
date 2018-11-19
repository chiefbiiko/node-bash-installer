var { createServer } = require('http')
var { parse } = require('url')

var server = createServer(handler)

function handler (req, res) {
  var q
  if (!req.url.includes('?') || !req.url.includes('&')) {
    // TODO: try 2 guess os and arch by user agent header
    q = {}
  } else {
    q = parse(req.url).query.split('&').reduce(function (acc, cur) {
      if (!/[^\s]=[^\s]/.test(cur)) return acc
      var kv = cur.split('=')
      acc[kv[0]] = kv[1]
      return acc
    }, {})
  }
  serve(res, q.os, q.arch)
}

function serve (res, os, arch) {
  // fetch node dist list
  // verify os and arch are among that list
  // fetch tarball
  // concat skeleton.bash with the tarball
  // serve it with correct content type
}
