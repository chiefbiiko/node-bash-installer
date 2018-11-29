var {
  log_info,
  http_panic,
  gen_random_id,
  parse_query_params,
  getz,
  list_versions,
  pick_version,
  is_version,
  to_tarball_url,
  SKELETON
} = require('./../../lib.js')

function serve (req, res) {
  var lambda_id = gen_random_id()
  log_info(lambda_id, `incoming request 4 ${req.url}`)
  var query = parse_query_params(req)
  // TODO: if !query.os|arch guess them from the user agent req header
  list_versions(function (err, versions) {
    if (err) return http_panic(lambda_id, res, err, 424)
    var version = pick_version(versions, query.version)
    var tarball_url = to_tarball_url(query.os, query.arch, version)
    log_info(lambda_id, `fetching tarball @ ${tarball_url}`)
    getz(tarball_url, function (err, tarball) {
      if (err) return http_panic(lambda_id, res, err, 424)
      var payload = Buffer.concat([ SKELETON, tarball ])
      log_info(lambda_id, 'ballin! bouta serve an installer')
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
