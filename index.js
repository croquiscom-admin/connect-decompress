var getBody = require('raw-body')
  , http = require('http')
  , StringDecoder = require('string_decoder').StringDecoder
  , zlib = require('zlib');

var regexp = /^application\/([\w!#\$%&\*`\-\.\^~]*\+)?json$/i;

function hasBody(req) {
  var encoding = 'transfer-encoding' in req.headers;
  var length = 'content-length' in req.headers && req.headers['content-length'] !== '0';
  return encoding || length;
}

function mime(req) {
  var str = req.headers['content-type'] || ''
    , i = str.indexOf(';');
  return ~i ? str.slice(0, i) : str;
}

function error(code, msg) {
  var err = new Error(msg || http.STATUS_CODES[code]);
  err.status = code;
  return err;
}

module.exports = function decompressFactory(options) {
  options = options || {};
  var strict = options.strict !== false;

  return function decompress(req, res, next) {
    if (req._body) return next();
    req.body = req.body || {};

    if (!hasBody(req)) return next();

    // check Content-Type
    if (!regexp.test(mime(req))) return next();

    // check Content-Encoding
    if (!('content-encoding' in req.headers && req.headers['content-encoding'] === 'gzip')) return next();

    // flag as parsed
    req._body = true;

    getBody(req, {
      limit: options.limit || '1mb',
      length: req.headers['content-length']
    }, function (err, buf) {
      if (err) return next(err);

      zlib.gunzip(buf, function (err, buf) {
        if (err) return next(error(400, 'invalid Content-Encoding'));
        buf = buf.toString();

        var first = buf.trim()[0];

        if (0 == buf.length) {
          return next(error(400, 'invalid json, empty body'));
        }

        if (strict && '{' != first && '[' != first) return next(error(400, 'invalid json'));
        try {
          req.body = JSON.parse(buf, options.reviver);
        } catch (err){
          err.body = buf;
          err.status = 400;
          return next(err);
        }
        next();
      });
    });
  };
};
