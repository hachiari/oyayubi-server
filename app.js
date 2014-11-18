var Hapi = require('hapi');
var path = require('path');
var Request = require('request');
var ext = require('content-type-ext').ext;
var gm = require('gm');

var port = 2222;

var server = Hapi.createServer(port);

var getExtension = function(url) {
  // get file extension from url with querystring or &, ?, # tail
  // eg test.jpg&, test.jpg?, test.jpg# -> ['.jpg#', '.jpg']

  var getExtensionRegex = /\.([0-9a-z]+)(?:[\&?#]|$)/i;
  var extensions = url.toString().match(getExtensionRegex);
  if (!extensions) { return; }
  return ext.getContentType(extensions[1]);
};

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

    var resizeStream = gm(Request.get(url))
      .resize(dims[0], dims[1] + "^>")
      .gravity('center')
      .extent(dims[0], dims[1])
      .stream();

    reply(resizeStream).type(fileType);
  }
}, {
  method: 'POST',
  path: '/{dim}',
  config: {
    payload: {
      maxBytes:209715200,
      output: 'stream',
      parse: true,
    },
    handler: function(request, reply) {
      var params = request.params;
      var dim = params.dim || '150x150';
      var dims = dim.split(/x/g);
      var payload = request.payload;

      if (!payload || !Object.keys(payload).length) { return reply('oyayubi server: image streaming payload required').code(400); }
      var resizeStream = gm(request.payload)
        .resize(dims[0], dims[1] + "^>")
        .gravity('center')
        .extent(dims[0], dims[1])
        .format(function(err, format) {
          if (err || !format) { return reply('oyayubi server: streamed payload is not an image').code(400); }
          reply(resizeStream).type('image/'+format.toLowerCase());
        }).stream();
    }
  }
}]);

server.start(function() {
  console.log('oyayubi server running at port ' + port);
});
