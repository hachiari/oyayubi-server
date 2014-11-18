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

server.route({
  method: 'GET',
  path: '/',
  handler: function(request, reply) {
    var url = request.query.url;
    var dim = request.query.dim;
    var dims = dim.split(/x/g);
    var fileType = getExtension(url);
    
    // unrecognized file type
    if (!fileType) { return reply('Not found!').code(404); }
    
    var resizeStream = gm(Request.get(url))
      .resize(dims[0], dims[1] + "^>")
      .gravity('center')
      .extent(dims[0], dims[1])
      .stream();

    reply(resizeStream).type(fileType);
  }
});

server.start(function() {
  console.log('oyayubi server running at port ' + port);
});
