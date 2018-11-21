var https_get = require('https').get
var http_get = require('http').get
var { parse } = require('url')

var NODE_DIST_URI = 'https://nodejs.org/dist/'
var FALLBACK = { os: 'linux', arch: 'x64', version: '' }
var SKELETON = Buffer.from('') // TODO: skeleton.sh buf

// var errors = {
  // bad_version (version) {
  //   return Error(`no such node version: ${version}`)
  // },
  // bad_request (query) {
  //   return Error(`unsupported request params: ${JSON.stringify(query)}`)
  // }
// }

function log_info (...args) {
  console.log('[node-bash-installer service info]', ...args)
}

function log_err (...args) {
  console.log('[node-bash-installer service error]', ...args)
}

function http_panic (res, err, status = 500) {
  log_err(err.message)
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ error: err.message, status }))
}

function parse_query_params (req) {
  var params
  if (req.url.includes('&')) {
    params = parse(req.url).query.split('&').reduce(function (acc, cur) {
      if (!/[^\s]=[^\s]/.test(cur)) return acc
      var kv = cur.split('=')
      acc[kv[0]] = kv[1]
      return acc
    }, {})
  } else if (/macintosh/i.test(req.headers['user-agent'])) { // naive guess
    params = { os: 'darwin' }
  }
  return Object.assign({}, FALLBACK, params)
}

function getz (url, cb) {
  var getr = url.startsWith('https') ? https_get : http_get
  getr(url, function (res) {
    var chunks = []
    res.on('error', cb)
    res.on('data', function (chunk) {
      chunks.push(chunk)
    })
    res.on('end', function () {
      cb(null, Buffer.concat(chunks))
    })
  }).on('error', cb)
}

function list_versions (cb) {
  getz(NODE_DIST_URI, function (err, buf) {
    if (err) return cb(err)
    versions = buf.toString().split(/\r?\n/g)
      .filter(function (line) {
        return /href=.v[^0]/.test(line)
      })
      .map(function (line) {
        return line.replace(/^.*v(\d+\.\d+\.\d+).+$/, '$1')
      })
    cb(null, versions)
  })
}

function pick_version (versions, wanted) {
  if (wanted.startsWith('v')) wanted = wanted.slice(1)
  // match maj min patch
  if (versions.includes(wanted)) return wanted
  // below *map objects map to the highest version number among (*)
  // fallback to maj min match
  var maj_min_map = versions.reduce(function (acc, cur) {
    var maj_min = cur.replace(/\.[^\.]*$/, '')
    if (!acc[maj_min] || v2i(cur) > v21(acc[maj_min])) acc[maj_min] = cur
    return acc
  }, {})
  var wanted_maj_min = wanted.replace(/\.$/, '')
  if (maj_min_map[wanted_maj_min]) return maj_min_map[wanted_maj_min]
  // fallback to maj match
  var maj_map = Object.keys(maj_min_map)
    .reduce(function (acc, cur) {
      acc[cur.replace(/\.[^\.]*$/, '')] = maj_min_map[cur]
      return acc
    }, {})
  var wanted_maj = wanted_maj_min.replace(/\.$/, '')
  if (maj_map[wanted_maj]) return maj_map[wanted_maj]
  // last resort - latest version
  return maj_map[String(Math.max(Object.keys(maj_map)))]
}

function v2i (version) {
  return Number(version.replace(/^(.+\.\d).*$/, '$1').replace(/\./g, ''))
}

// function find_latest (versions) {
//   for (
//     var len = versions.length,
//     version = versions[0],
//     prev = v2i(version),
//     i = 0;
//     i < len; i++
//   ) {
//     v = versions[i]
//     if (v2i(v) > prev) version = v
//   }
//   return version
// }

function is_node_semver (version) {
  return /^\d{1,2}\.\d{1}\.{1}\.?$/.test(version)
}

function to_tarball_url (os, arch, version) {
  return `https://nodejs.org/dist/v${version}/node-v${version}-${os}-${arch}.tar.gz`
}

// TODO: use some request identifier for better logs
function serve (req, res) {
  log_info(`incoming request for: ${req.url}`)
  // what u want
  var query = parse_query_params(req)
  // fetch node dist list
  list_versions(function (err, versions) {
    if (err) return http_panic(res, err, 500)
    if (!is_node_semver(query.version)) return http_panic(res, Error('bad version'), 405)
    var version = pick_version(versions, query.version)
    // if (query.version) {
    //   version = pick_version(versions, query.version)
    //   if (!version) return http_panic(res, errors.bad_version(query.version))
    // } else {
    //   version = find_latest(versions)
    // }
    // fetch tarball
    var tarball_url = to_tarball_url(query.os, query.arch, version)
    log_info(`fetching tarball @ ${tarball_url}`)
    getz(tarball_url, function (err, tarball) {
      if (err) return http_panic(res, err) // FIND: http code to indicate dep err
      // concat skeleton.bash with the tarball
      var payload = Buffer.concat([ SKELETON, tarball ])
      // serve it with correct content type
      log_info('bouta serve an installer')
      res.writeHead(200, { 'content-type': 'application/x-sh' })
      res.end(payload)
    })
  })
}

function b4_exit (cb) {
  var called = false
  function _cb (code) {
    if (!called) cb()
    called = true
    process.exit(code)
  }
  process.once('SIGINT', _cb) // catches ctrl+c event
  process.once('SIGTERM', _cb) // catches child_process.kill()
  process.once('uncaughtException', _cb) // for safety
}

module.exports = {
  log_info,
  serve,
  getz,
  b4_exit
}
