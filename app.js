var Hapi = require('hapi');
var path = require('path');
var Request = require('request');
var ext = require('content-type-ext').ext;
var sharp = require('sharp');
var http = require('http');
http.globalAgent.maxSockets = 1000;
sharp.concurrency(1000);

var port = 2222;

var server = Hapi.createServer(port);
var server = Hapi.createServer(port, {
  maxSockets: 1000
});

var getExtension = function(url) {
  // get file extension from url with querystring or &, ?, # tail
  // eg test.jpg&, test.jpg?, test.jpg# -> ['.jpg#', '.jpg']

  var getExtensionRegex = /\.([0-9a-z]+)(?:[\&?#]|$)/i;
  var extensions = url.toString().match(getExtensionRegex);
  if (!extensions) { return; }
  return ext.getContentType(extensions[1]);
};

server.ext('onRequest', function(request, reply) {
  var counters = sharp.counters();
  var concurrency = sharp.concurrency();
  var cache = sharp.cache();
  console.log(counters, concurrency, cache);
  reply();
});

server.route([{
  method: 'GET',
  path: '/',
  handler: function(request, reply) {
    var query = request.query;
    var url = query.url;
    if (!url) { return reply('oyayubi server: url query is required').code(400); }
    var dim = query.dim || '150x150';
    var dims = dim.split(/x/g);
    var fileType = getExtension(url);

    // unrecognized file type
    if (!fileType || fileType.indexOf('image') === -1) { return reply('url query is not an image').code(404); }
    var sharpStream = sharp()
      .resize(Number(dims[0]), Number(dims[1]))
      .crop(sharp.gravity.north);
    var resizeStream = Request.get(url).pipe(sharpStream);
    reply(resizeStream).type(fileType);
  }
}, {
  method: 'POST',
  path: '/{dim}',
  config: {
    payload: {
      maxBytes: 209715200,
      output: 'stream',
      parse: true,
    },
    handler: function(request, reply) {
      var params = request.params;
      var dim = params.dim || '150x150';
      var dims = dim.split(/x/g);
      var payload = request.payload;
      if (!payload || !Object.keys(payload).length) { return reply('oyayubi server: image streaming payload required').code(400); }
      
      var sharpStream = sharp()
        .resize(Number(dims[0]), Number(dims[1]))
        .crop(sharp.gravity.north)
        .toBuffer(function(err, buff, metadata) {
          var format = metadata.format;
          if (err || !format) { return reply('oyayubi server: streamed payload is not an image').code(400); }
          reply(buff).type('image/'+format.toLowerCase());
        });
      payload.pipe(sharpStream);
    }
  }
}]);

server.start(function() {
  console.log('oyayubi server running at port ' + port);
});
