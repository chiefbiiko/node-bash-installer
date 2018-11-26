var {
  log_info,
  http_panic,
  parse_query_params,
  getz,
  list_versions,
  pick_version,
  is_version,
  to_tarball_url,
  SKELETON
} = require('./../../lib.js')

// TODO: use some request identifier for better logs
function serve (req, res) {
  log_info(`incoming request for: ${req.url}`)
  // what u want
  var query = parse_query_params(req)
  // fetch node dist list
  list_versions(function (err, versions) {
    if (err) return http_panic(res, err, 424)
    if (!is_version(query.version)) return http_panic(res, Error('bad version'), 400)
    var version = pick_version(versions, query.version)
    // fetch tarball
    var tarball_url = to_tarball_url(query.os, query.arch, version)
    log_info(`fetching tarball @ ${tarball_url}`)
    getz(tarball_url, function (err, tarball) {
      if (err) return http_panic(res, err, 424)
      // concat skeleton.bash with the tarball
      var payload = Buffer.concat([ SKELETON, tarball ])
      // serve it with correct content type
      log_info('bouta serve an installer')
      res.writeHead(200, { 
        'content-type': 'application/x-sh',
        'node-bash-installer-node-version': version,
        'node-bash-installer-arch': query.arch,
        'node-bash-installer-os': query.os
      })
      res.end(payload)
    })
  })
}

module.exports = serve
