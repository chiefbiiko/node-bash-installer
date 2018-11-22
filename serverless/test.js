var tape = require('tape')
var serve = require('./lambda.js')
var { getz } = require('./utils.js')
var { createServer } = require('http')

tape('mini test', function (t) {
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
