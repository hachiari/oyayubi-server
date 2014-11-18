var Hapi = require('hapi');
var path = require('path');
var Request = require('request');
var gm = require('gm');
var http = require('http');
var GridFS = require('GridFS').GridFS;
var gfs = new GridFS('oyayubi');
var GridStream = require('GridFS').GridStream;

http.globalAgent.maxSockets = 1000;

var port = 2222;

var server = Hapi.createServer(port);

server.ext('onRequest', function(request, reply) {
  var query = request.query;
  gfs.get(query.url+query.dim, function(err, data) {
    if (err) { return reply(); }
    var stream = GridStream.createGridReadStream('oyayubi', query.url+query.dim);
    reply(stream);
  });
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

    var gmStream = gm(Request.get(url))
      .resize(Number(dims[0]), Number(dims[1])+'^>')
      .gravity('center')
      .extent(dims[0], dims[1])
      .format(function(err, format) {
        if (err || !format) { return reply('oyayubi server: streamed payload is not an image').code(400); }
        var contentType = 'image/'+format;
        var w = GridStream.createGridWriteStream('oyayubi', query.url+query.dim, 'w', {conten_type: contentType});
        gmStream.pipe(w);
        reply(gmStream).type(contentType);
      }).stream();
  }
}, {
  method: 'POST',
  path: '/',
  config: {
    payload: {
      maxBytes: 209715200,
      output: 'stream',
      parse: false,
    },
    handler: function(request, reply) {
      // no gridfs cache because query.url can be localhost
      var query = request.query;
      var dim = query.dim || '150x150';
      var dims = dim.split(/x/g);
      var payload = request.payload;
      if (!payload || !Object.keys(payload).length) { return reply('oyayubi server: image streaming payload required').code(400); }
      var gmStream = gm(payload)
        .resize(Number(dims[0]), Number(dims[1])+'^>')
        .gravity('center')
        .extent(dims[0], dims[1])
        .format(function(err, format) {
          if (err || !format) { return reply('oyayubi server: streamed payload is not an image').code(400); }
          var contentType = 'image/'+format;
          reply(gmStream).type(contentType);
        }).stream();
    }
  }
}]);

server.start(function() {
  console.log('oyayubi server running at port ' + port);
});
