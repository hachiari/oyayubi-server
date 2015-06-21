var Hapi = require('hapi');
var path = require('path');
var Request = require('request');
var gm = require('gm');
var http = require('http');

// GFS
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.connect('mongodb://127.0.0.1/oyayubi');
var conn = mongoose.connection;
var Grid = require('gridfs-stream');
Grid.mongo = mongoose.mongo;
var gfs = null;
conn.once('open', function () {
  console.log('connected to mongodb');
  gfs = Grid(conn.db);
});

var mime = require('mime-types');

http.globalAgent.maxSockets = Infinity;
var port = 2222;
var server = new Hapi.Server();
server.connection({ port: port});

server.ext('onRequest', function(request, reply) {
  var query = request.query;
  if (!Object.keys(query).length) { return reply.continue(); }
  gfs.files.find({filename:query.url+query.dim}).toArray(function(err, found) {
    if (err || !found || !found.length) { return reply.continue(); }
    found = found[0];
    var extension = mime.extension(found.contentType);
    extension = (extension === "jpeg") ? "jpg" : extension;
    reply.redirect("/images/"+found._id+"."+extension);
  });
});

server.route([{
  method: "GET",
  path: "/images/{_id}",
  handler: function(request, reply) {
    var params = request.params._id.split(".");
    gfs.findOne({_id: params[0]}, function(err, found) {
      var stream = gfs.createReadStream({filename: found.filename});
      reply(stream).type(found.contentType);
    });
  }
}, {
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
    var w = gfs.createWriteStream({filename: query.url+query.dim, mode: 'w', content_type: contentType});
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
