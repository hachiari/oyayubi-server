var Hapi = require('hapi');
var path = require('path');
var Request = require('request');
var gm = require('gm');
var http = require('http');
var GridFS = require('bn-gridfs').GridFS;
var gfs = new GridFS('oyayubi');
var GridStream = require('bn-gridfs').GridStream;
var mime = require('mime-types');

http.globalAgent.maxSockets = Infinity;

var port = 2222;
var server = new Hapi.Server();
server.connection({ port: port});

server.ext('onRequest', function(request, reply) {
  var query = request.query;
  gfs.get(query.url+query.dim, function(err, data) {
    if (err) { return reply.continue(); }
    var stream = GridStream.createGridReadStream('oyayubi', query.url+query.dim);
    var contentType = mime.lookup(query.url);
    reply(stream).type(contentType);
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
      .quality(100)
      .resize(Number(dims[0]), Number(dims[1])+'^>')
      .gravity('Center')
      .extent(dims[0], dims[1])
      .autoOrient()
      .stream();
    var contentType = mime.lookup(url);
    if (!contentType) { return reply('oyayubi server: streamed payload is not an image').code(400); }
    var w = GridStream.createGridWriteStream('oyayubi', query.url+query.dim, 'w', {content_type: contentType});
    gmStream.pipe(w);
    reply(gmStream).type(contentType);
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
        .quality(100)
        .resize(Number(dims[0]), Number(dims[1])+'^>')
        .gravity('Center')
        .extent(dims[0], dims[1])
        .autoOrient()
        .format(function(err, format) {
          if (err || !format) { return reply('oyayubi server: streamed payload is not an image').code(400); }
          var contentType = 'image/'+format.toLowerCase();
          reply(gmStream).type(contentType);
        }).stream();
    }
  }
}]);

server.start(function() {
  console.log('oyayubi server running at port ' + port);
});
