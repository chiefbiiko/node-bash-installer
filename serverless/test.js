var tape = require('tape')
var { createServer } = require('http')
var serve = require('./api/installer/index.js')
var {
  parse_query_params,
  getz,
  list_versions,
  clean_version,
  compare_versions,
  pick_version,
  is_version,
  to_tarball_url
} = require('./lib.js')

tape('clean_version', function (t) {
  t.equal(clean_version('v11.2.0.'), '11.2.0', 'clean version')
  t.end()
})

tape('is_version', function (t) {
  var good_versions = [ '11.2.0', '4', '9.9.0', '8.9', '11', '7.7.4.' ]
  var good_truth = good_versions.every(function (version) {
    return is_version(version)
  })
  t.true(good_truth, 'good version formats')
  var bad_versions = [ 'v11.2.0', '4..', '99.9.0', '8.99999', '11.1.4567' ]
  var bad_truth = bad_versions.every(function (version) {
    return is_version(version)
  })
  t.false(bad_truth, 'bad version formats')
  t.end()
})

tape('compare_versions', function (t) {
  t.equal(compare_versions('11.2.0', '11.2.0'), 0, 'equal versions')
  t.equal(compare_versions('11.2.0', '11.2'), 1, 'equal but more specific')
  t.equal(compare_versions('11.2.0', '10.1.0'), 1, 'a > b')
  t.equal(compare_versions('10.7.0', '11.2.0'), -1, 'a < b')
  t.equal(compare_versions('10.7', '11.2.0'), -1, 'a < b')
  t.equal(compare_versions('10.7.0', '6.11'), 1, 'a > b')
  t.equal(compare_versions('11.2', '10.1.0'), 1, 'a > b')
  t.end()
})

tape('list_versions', function (t) {
  list_versions(function (err, versions) {
    if (err) t.end(err)
    t.true(Array.isArray(versions), 'versions array')
    t.ok(versions.length, 'versions got some length')
    var all_good_versions = versions.every(function (version) {
      return is_version(version)
    })
    t.true(all_good_versions, 'all good versions')
    t.end()
  })
})

tape('pick_version', function (t) {
  list_versions(function (err, versions) {
    if (err) t.end(err)
    t.equal(pick_version(versions, '9'), '9.9.0', 'highest 9 minor')
    t.equal(pick_version(versions, '9.7'), '9.7.1', 'highest 9.7 patch')
    t.equal(pick_version(versions, 'v11.2'), '11.2.0', 'tolerant')
    var some_versions= [ '10.1.0', '10.2.0', '11.2.0', '9.9.0' ]
    t.equal(pick_version(some_versions, '10.11.99'), '10.2.0', 'fallback pt1')
    t.equal(pick_version(some_versions, '9.77.11'), '9.9.0', 'fallback pt2')
    t.equal(pick_version(some_versions, ''), '11.2.0', 'falsey means latest')
    t.end()
  })
})

tape('parse_query_params', function (t) {
  var req1 = { 
    url: 'http://localhost:41900/fraud?os=darwin&arch=x64&version=11'
  }
  var query = parse_query_params(req1)
  t.equal(query.os, 'darwin', 'parsed os')
  t.equal(query.arch, 'x64', 'parsed arch')
  t.equal(query.version, '11', 'parsed node version')
  var req2 = { 
    url: 'http://localhost:41900/fraud?arch=x64' 
  }
  var query = parse_query_params(req2)
  t.equal(query.os, 'linux', 'os fallback')
  t.equal(query.arch, 'x64', 'parsed arch pt 2')
  t.equal(query.version, undefined, 'undefined internally means provide latest')
  t.end()
})

tape('lambda', function (t) {
  var server = createServer(serve).listen(41900, function () {
    var uri = 'http://localhost:41900/whatever?os=linux&arch=x64&version=11'
    getz(uri, function (err, buf) {
      if (err) t.end(err)
      t.pass(`got a response from ${uri}`)
      t.ok(buf.length, 'buf got some length')
      t.true(String(buf.slice(0, 20)).startsWith('#!/usr/bin/env bash'), 'bash')
      server.close(function () {
        t.end()
      })
    })
  })
})
