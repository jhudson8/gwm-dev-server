module.exports = function (options) {
  options = options || {};
  options.base = options.base || './dev/mocks/';

  function getFileNameChoices(req, path, callback) {
    var choices = [],
      parts = path.split('/'),
      method = req.method;

    if (path.indexOf('.') > 0) {
      // if it has an extension, don't treat like a service call
      choices.push(options.base + '/' + path);
    }
    else {
      parts = parts.map(function(part) {
        if (isNaN(parseInt(part), 10)) {
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
            prefix = _part ? (prefix + '/' + _part) : prefix;
            iterate(parts, i+1, prefix);
          }
        }
      }
      iterate(parts, 0, options.base);
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
          return getFileNameChoices(requestOptions.req, path, callback);
        }
      }
      callback();
    }
  }
}
