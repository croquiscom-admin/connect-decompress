{expect} = require 'chai'
express = require 'express'
request = require 'supertest'
superagent = require 'superagent'
zlib = require 'zlib'
decompress = require '../'

delete superagent.serialize['application/json']

app = express()
app.use decompress()
app.use express.json()
app.post '/echo', (req, res) ->
  res.send req.body

describe 'connect-decompress', ->
  it 'gziped JSON request', (done) ->
    data = a: 1, b: 2
    buf = new Buffer JSON.stringify(data)
    zlib.gzip buf, (error, buf) ->
      expect(error).to.equal null
      request(app)
        .post('/echo')
        .set('Content-Length', buf.length)
        .set('Content-Encoding', 'gzip')
        .send(buf)
        .expect(200)
        .end (error, result) ->
          expect(error).to.equal null
          expect(result.body).to.eql data
          done null

  it 'normal JSON request', (done) ->
    data = a: 1, b: 2
    request(app)
      .post('/echo')
      .type('json')
      .send(JSON.stringify data)
      .expect(200)
      .end (error, result) ->
        expect(error).to.equal null
        expect(result.body).to.eql data
        done null

  it 'corrupt gziped request', (done) ->
    buf = new Buffer 3
    request(app)
      .post('/echo')
      .set('Content-Length', buf.length)
      .set('Content-Encoding', 'gzip')
      .send(buf)
      .expect(400)
      .end (error, result) ->
        expect(error).to.equal null
        expect(result.text).to.match /invalid Content-Encoding/
        done null
