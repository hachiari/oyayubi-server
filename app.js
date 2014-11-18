var Hapi = require('hapi');
var path = require('path');
var Request = require('request');
var sharp = require('sharp');
var http = require('http');
var GridFS = require('GridFS').GridFS;
var gfs = new GridFS('oyayubi');

http.globalAgent.maxSockets = 1000;
sharp.concurrency(1000);

var port = 2222;

var server = Hapi.createServer(port);

server.ext('onRequest', function(request, reply) {
  var query = request.query;
  gfs.get(query.url+query.dim, function(err, data) {
    if (err) { return reply(); }
    reply(data);
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

    var sharpStream = sharp()
      .resize(Number(dims[0]), Number(dims[1]))
      .crop(sharp.gravity.north)
      .toBuffer(function(err, buff, metadata) {
        var format = metadata.format;
        if (err || !format) { return reply('oyayubi server: streamed payload is not an image').code(400); }
        var contentType = 'image/'+format;
        gfs.put(buff, query.url+query.dim, 'w', {content_type: contentType}, function(err){
          if(err) console.log(err);
          reply(buff).type(contentType);
        });
      });
    Request.get(url).pipe(sharpStream);
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
      var sharpStream = sharp()
        .resize(Number(dims[0]), Number(dims[1]))
        .crop(sharp.gravity.north)
        .toBuffer(function(err, buff, metadata) {
          var format = metadata.format;
          if (err || !format) { return reply('oyayubi server: streamed payload is not an image').code(400); }
          var contentType = 'image/'+format;
          reply(buff).type(contentType);
        });
      payload.pipe(sharpStream);
    }
  }
}]);

server.start(function() {
  console.log('oyayubi server running at port ' + port);
});
