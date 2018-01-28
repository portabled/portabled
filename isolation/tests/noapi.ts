namespace tests {

  function driveAs(snapshot) {
    if (!snapshot.timestamp) snapshot.timestamp = 1465249756308;
    snapshot.files = function() {
      var result = [];
      for (var k in snapshot) if (k && k.charCodeAt(0)===47) result.push(k);
      return result;
    };
    snapshot.read = function(f) {
      var dt = snapshot[f];
      if (dt || typeof dt==='string') return dt;
      else return null;
    };
    snapshot.write = function(f, txt) {
      if (txt || typeof txt==='string') snapshot[f] = txt;
      else delete snapshot[f];
    };
    return snapshot;
  }

  tests['noapi'] = createTestsWith_createIsolateHost(isolation.createIsolateHost);

  tests['noapi_iframe'] = createTestsWith_createIsolateHost(isolation.createIsolateHost.iframe);

  tests['noapi_worker'] = createTestsWith_createIsolateHost(isolation.createIsolateHost.worker);

  function createTestsWith_createIsolateHost(createIsolateHost: any) {

    function initNoapi(drive, callback: (host, close_clean) => void) {
      isolation.createApiHost(driveAs(drive), {}, host=> {
        callback(host, close_clean);

        function close_clean() {
          try { if (host) host.terminate(); }
          catch (error) { }
        }
      });
    }

    return {

      initApiContext_succeeds: (callback) => {
        initNoapi({}, (host, close_clean) => {
          host.remoteEval('connection_to_parent.initApiContext({ drive: connection_to_parent.drive })', null, '/tests/initApiContext_succeeds.js', (error, result) => {
            try {
              assert(!error, error);
              callback();
            }
            catch (err) {
              callback(err);
            }
            close_clean();
          });
        });
      },

      initApiContext_process_someProperties: (callback) => {
        initNoapi({}, (host, close_clean) => {
          host.remoteEval(
            'var opts = { drive: connection_to_parent.drive }; connection_to_parent.initApiContext(opts);\n '+
            'return {execPath: opts.process.execPath, platform: opts.process.platform, version: opts.process.version }; ',
            null,
            '/tests/initApiContext_process_someProperties.js',
            (error, result) => {
            try {
              assert(!error, error);
              assert.equal('/usr/bin/nodejs', result.execPath);
              assert.equal('linux', result.platform);
              assert.equal('0.10.38', result.version);
              callback();
            }
            catch (err) {
              callback(err);
            }
            close_clean();
          });
        });
      },

      initApiContext_remoteEval: (callback) => {
        initNoapi({}, (host, close_clean) => {
          host.remoteEval(
            'var opts = { drive: connection_to_parent.drive }; connection_to_parent.initApiContext(opts);\n '+
            'return opts.runGlobal("2+4594");',
            null,
            '/tests/initApiContext_runGlobal.js',
            (error, result) => {
            try {
              assert(!error, error);
              assert.equal(4596, result);
              callback();
            }
            catch (err) {
              callback(err);
            }
            close_clean();
          });
        });
      },

      initApiContext_runGlobal: (callback) => {
        initNoapi({}, (host, close_clean) => {
          host.runGlobal(
            '2+4594',
            '/tests/initApiContext_runGlobal.js',
            (error, result) => {
            try {
              assert(!error, error);
              assert.equal(4596, result);
              callback();
            }
            catch (err) {
              callback(err);
            }
            close_clean();
          });
        });
      },

      initApiContext_runGlobal_hashbang: (callback) => {
        initNoapi({}, (host, close_clean) => {
          host.runGlobal(
            '#!/blablabla\n'+
            '2+4594',
            '/tests/initApiContext_runGlobal_hashbang.js',
            (error, result) => {
            try {
              assert(!error, error);
              assert.equal(4596, result);
              callback();
            }
            catch (err) {
              callback(err);
            }
            close_clean();
          });
        });
      },

      initApiContext_fs_existsSync_false: (callback) => {
        initNoapi({}, (host, close_clean) => {
          host.remoteEval(
            'var opts = { drive: connection_to_parent.drive }; connection_to_parent.initApiContext(opts);\n '+
            'return opts.coreModules.fs.existsSync("/tmp"); ',
            null,
            '/tests/initApiContext_fs_existsSync_false.js',
            (error, result) => {
            try {
              assert(!error, error);
              assert.equal(false, result);
              callback();
            }
            catch (err) {
              callback(err);
            }
            close_clean();
          });
        });
      },

      initApiContext_fs_readFileSync: (callback) => {
        initNoapi({"/tmp": "dummy" }, (host, close_clean) => {
          host.remoteEval(
            'var opts = { drive: connection_to_parent.drive }; connection_to_parent.initApiContext(opts);\n '+
            'return opts.coreModules.fs.readFileSync("/tmp")+""; ',
            null,
            '/tests/initApiContext_fs_readFileSync.js',
            (error, result) => {
            try {
              assert(!error, error);
              assert.equal('dummy', result);
              callback();
            }
            catch (err) {
              callback(err);
            }
            close_clean();
          });
        });
      },

      initApiContext_require_moduleJS: (callback) => {
        initNoapi({"/module.js": "module.exports = 2891279123;" }, (host, close_clean) => {
          host.remoteEval(
            'var opts = { drive: connection_to_parent.drive }; connection_to_parent.initApiContext(opts);\n '+
            'return opts.global.require("/module.js"); ',
            null,
            '/tests/initApiContext_require_moduleJS.js',
            (error, result) => {
            try {
              assert(!error, error);
              assert.equal(2891279123, result);
              callback();
            }
            catch (err) {
              callback(err);
            }
            close_clean();
          });
        });
      },

      initApiContext_inModule_global_connection_to_parent_isUndefined: (callback) => {
        initNoapi({"/module.js": "module.exports = typeof connection_to_parent;" }, (host, close_clean) => {
          host.remoteEval(
            'var opts = { drive: connection_to_parent.drive }; connection_to_parent.initApiContext(opts);\n '+
            'return opts.global.require("/module.js"); ',
            null,
            '/tests/initApiContext_inModule_global_connection_to_parent_isUndefined.js',
            (error, result) => {
            try {
              assert(!error, error);
              assert.equal('undefined', result);
              callback();
            }
            catch (err) {
              callback(err);
            }
            close_clean();
          });
        });
      },

      initApiContext_inModule_global_XMLHttpRequest_isUndefined: (callback) => {
        initNoapi({"/module.js": "module.exports = typeof XMLHttpRequest;" }, (host, close_clean) => {
          host.remoteEval(
            'var opts = { drive: connection_to_parent.drive }; connection_to_parent.initApiContext(opts);\n '+
            'return opts.global.require("/module.js"); ',
            null,
            '/tests/initApiContext_inModule_global_XMLHttpRequest_isUndefined.js',
            (error, result) => {
            try {
              assert(!error, error);
              assert.equal('undefined', result);
              callback();
            }
            catch (err) {
              callback(err);
            }
            close_clean();
          });
        });
      },


      initApiContext_http_get_returnsNotnull: (callback) => {
        initNoapi({}, (host, close_clean) => {
          host.remoteEval(
            'var opts = { drive: connection_to_parent.drive }; connection_to_parent.initApiContext(opts);\n '+
            'var http = opts.coreModules.http;\n'+
            'var req = http.get({host:\'google.com\', path: \'/\'}, function(req) { var body = \'\'; req.on(\'data\', function(dt) { console.log(\'>\'+dt); }); });\n' +
            'console.log(req)', null, '/tests/initApiContext_http_get_returnsNotnull.js', function (error, result) {
              try {
                assert(!error, error);
                callback();
              }
              catch (err) {
                callback(err);
              }
              close_clean();
          });
        });
      },





    };
  }

}