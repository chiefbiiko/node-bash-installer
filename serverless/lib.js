var https_get = require('https').get
var http_get = require('http').get
var { parse } = require('url')

var NODE_DIST_URI = 'https://nodejs.org/dist/'
var FALLBACK = { os: 'linux', arch: 'x64', version: '' }
var SKELETON = Buffer.from('#!/usr/bin/env bash\n#...') // TODO: skeleton.sh buf

function log_info (...args) {
  console.log('[node-bash-installer lambda info]', ...args)
}

function log_err (err) {
  console.log('[node-bash-installer lambda error]', err.stack)
}

function http_panic (res, err, status = 500) {
  log_err(err)
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ error: err.message, status }))
}

function parse_query_params (req) {
  var params = parse(req.url).query.split('&').reduce(function (acc, cur) {
    if (!/[^\s]=[^\s]/.test(cur)) return acc
    var kv = cur.split('=')
    acc[kv[0]] = kv[1]
    return acc
  }, {})
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

function clean_version (version) {
  return version.replace(/^v|\.+$/g, '')
}

function compare_versions (a, b) {
  a = clean_version(a)
  b = clean_version(b)
  var az = a.split('.').map(Number)
  var bz = b.split('.').map(Number)
  for (var i = 0; i < 3; i++) {
    if (az[i] === undefined) return -1
    if (bz[i] === undefined) return 1
    if (az[i] > bz[i]) return 1
    else if (az[i] < bz[i]) return -1
  }
  return 0
}

function pick_version (versions, wanted) {
  wanted = clean_version(wanted)
  // match maj min patch
  if (versions.includes(wanted)) return wanted
  // below *map objects map to the highest version number among (*)
  // fallback to maj min match
  var maj_min_map = versions.reduce(function (acc, cur) {
    var maj_min = cur.replace(/\.[^\.]*$/, '')
    if (!acc[maj_min] || compare_versions(cur, acc[maj_min]) === 1)
      acc[maj_min] = cur
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
  return maj_map[String(Math.max(...Object.keys(maj_map)))]
}

function is_version (x) {
  return /^\d{1,2}(?:\.\d\d?){0,2}\.?$/.test(x)
}

function to_tarball_url (os, arch, version) {
  return `https://nodejs.org/dist/v${version}/node-v${version}-${os}-${arch}.tar.gz`
}

module.exports = {
  log_info,
  http_panic,
  parse_query_params,
  getz,
  list_versions,
  clean_version,
  compare_versions,
  pick_version,
  is_version,
  to_tarball_url,
  SKELETON
}