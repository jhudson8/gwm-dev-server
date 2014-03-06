module.exports = function (options) {
  options = options || {};
  options.base = options.base || './dev/mocks/';

  function getFileNameChoices(req, path, base, callback) {
    var choices = [],
      parts = path.split('/'),
      method = req.method;

    if (path.indexOf('.') > 0) {
      // if it has an extension, don't treat like a service call
      choices.push(base + '/' + path);
    }
    else {
      parts = parts.map(function(part) {
      var isVar = false;
      if (part.length >= 32 && part.split('-').join('').length === 32) {
        // probably a UUID
        isVar = true;
        } else if (!isNaN(parseInt(part, 10))) {
        // might be a unique identifier
        isVar = true;
      }
        if (!isVar) {
          // not an id
          return [part];
        } else {
          return [part, '_any'];
        }
      });

      function iterate(parts, i, prefix) {
      for (var j in parts[i]) {
      var _part = parts[i][j];
          if (i === parts.length - 1) {
            choices.push(prefix + '/' + _part + '_' + method + '.json');
            choices.push(prefix + '/' + _part + '.json');
          } else {
            var _prefix = _part ? (prefix + '/' + _part) : prefix;
            iterate(parts, i+1, _prefix);
          }
        }
      }
      iterate(parts, 0, base);
    }
    callback({
      fileName: choices
    });
  }

  var config = {
    filePathLocation: options.base,
    urlPrefix: options.prefix,
    enabled: true
  };

  return {
    userConfig: {
      key: 'mock-server',
      section: 'Dev Server',
      inputs: [
        {key: 'filePathLocation', label: 'Directory to serve files from'},
        {key: 'urlPrefix', label: 'URL Prefix (to enable mock response)'},
        {key: 'enabled', label: 'Mock Server Enabled', type: 'boolean'},
      ],
      store: config
    },

    onRequest: function (requestOptions, pluginOptions, callback) {
      if (options.prefix && config.enabled) {
        var uri = requestOptions.uri
        if (uri.indexOf(options.prefix) === 0) {
          path = uri.substring(options.prefix.length);
          if (path.indexOf('/') === 0) {
            // remove the initial slash
            path = path.substring(1);
          }
          return getFileNameChoices(requestOptions.req, path, options.base, callback);
        } else {
          // check to see if match values were provided
          if (options.match) {
            for (var prefix in options.match) {
              // 'files': /files/(*)/
              var regex = options.match[prefix],
                  _match = uri.match(regex);
              if (_match) {
                var filePath = _match[1];
                return getFileNameChoices(requestOptions.req, filePath, prefix, callback);
              }
            }
          }
        }
      }
      callback();
    }
  };
};
