var http = require('http'),
  url = require('url'),
  path = require('path'),
  fs = require('fs');
var mimeTypes = {
  "html": "text/html",
  "jpeg": "image/jpeg",
  "jpg": "image/jpeg",
  "png": "image/png",
  "js": "text/javascript",
  "css": "text/css",
  "svg": "image/svg+xml"
};

function respondWithFile(res, req, fileName) {
  var fileNames = Array.isArray(fileName) ? fileName : [fileName];
  for (var i in fileNames) {
    fileName = fileNames[i];
    try {
      var fStat = fs.lstatSync(fileName);
      if (fStat.isDirectory()) {
        fileName = fileName + '/index.html';
      }
    } catch (e) {console.error(e);}
    
    try {
      if (fs.existsSync(fileName)) {
        var mimeType = mimeTypes[path.extname(fileName).split(".")[1]];
        if (mimeType) {
          res.setHeader("Content-Type", mimeType);
        }
        res.writeHead(200);

        var readStream = fs.createReadStream(fileName);
        readStream.pipe(res);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
  }
  console.log('no requested files found: ' + JSON.stringify(fileNames));
  return false;
}

module.exports = function (options) {
  options = options || {};
  options.base = options.base || './';
  options.defaultServResource = options.defaultServResource || 'index.html';

  var plugins = [];

  function addPlugin(plugin) {
      plugins.push(plugin);
      if (plugin.setServer) {
        plugin.setServer(this);
      }
  }

  function startServer() {
    console.log('dev server started (' + options.port + ')');

    return http.createServer(function (req, res) {
      var uri = url.parse(req.url).pathname,
        requestOptions = {
          req: req,
          res: res,
          uri: uri,
          base: './' + options.buildPath
        };

      // iterate through all available plugins to handle the request
      var callback = function (i) {
        function next() {
          i++;
          var nextPlugin = plugins[i];
          if (nextPlugin) {
            var nextCallback = callback(i);
            nextPlugin.onRequest(requestOptions, options, nextCallback);
          } else {
            // no plugin has responded
            res.writeHead(404, {
              'Content-Type': 'text/plain'
            });
            res.write('No plugins handled "' + uri + '"');
            res.end();
            console.log('request not handled: ' + uri + ' (' + req.method + ')');
          }
        }

        return function (response) {
          if (!response) {
            return next();
          }
          else if (response === true) {
            return;
          }
          else if (response.fileName) {
            if (!respondWithFile(res, req, response.fileName)) {
              return next();
            }
          } else if (response.text || response.stream) {
            var mimeType = response.mimeType || 'text/plain';
            res.writeHead(200, mimeType);

            if (response.stream) {
              res.pipe(response.stream);
            } else {
              res.write(response.text);
            }
            
            res.end();
          }
        }
      }

      // initiate the plugin chain
      callback(-1)();

    }).listen(options.port);
  }

  var rtn = {
    start: startServer,

    addPlugin: addPlugin,

    getPlugins: function() {
      return plugins;
    }
  }

  var _plugins = options.plugins;
  if (_plugins) {
    for (var i=0; i<_plugins.length; i++) {
      if (plugins[i]) {
        rtn.addPlugin(_plugins[i]);
      }
    }
  }

  if (options.mocks) {
    rtn.addPlugin(require('./plugins/mock-server')(options.mocks));
  }
  rtn.addPlugin(require('./plugins/admin-config')());
  rtn.addPlugin(require('./plugins/public-resources'));

  return rtn;
};
