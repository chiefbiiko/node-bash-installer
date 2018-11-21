var tape = require('tape')
var { spawn } = require('child_process')
var { getz } = require('./lib.js')

tape('mini test', function (t) {
  var child = spawn('node', [ './index.js' ])
  child.stdout.on('data', function (chunk) {
    t.comment(String(chunk))
  })
  child.stdout.once('readable', function () { // once http server live
    var uri = 'http://localhost:41900/whatever?os=linux&arch=x64&version=11'
    getz(uri, function (err, buf) {
      if (err) t.end(err)
      t.pass(`got a response from ${uri}`)
      t.ok(buf.length, 'buf got some length')
      t.true(String(buf.slice(0, 20)).startswith('#!/usr/bin/env bash'), 'bash')
      child.kill()
      t.end()
    })
  })
})
