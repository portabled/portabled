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

  tests['console'] = createTestsWith_createIsolateHost(isolation.createIsolateHost);

  tests['console_iframe'] = createTestsWith_createIsolateHost(isolation.createIsolateHost.iframe);

  tests['console_worker'] = createTestsWith_createIsolateHost(isolation.createIsolateHost.worker);

  function createTestsWith_createIsolateHost(createIsolateHost: any) {

    function testConsole(script: string, sourcePath: string, onconsole: (level: string, args: any[], close_clean: () => void) => void) {
      var host = createIsolateHost(driveAs({}), host => {
        host.onconsole = function(level, args) {
          onconsole(level, args, close_clean);
        };

        host.remoteEval(script, null, sourcePath, (error, result) => {
          try {
            assert(!error, 'error '+error);
          }
          catch (err) {
            onconsole(null, null, null);
            close_clean();
          }
        });

        function close_clean() {
          try { if (host) host.terminate(); }
          catch (error) { }
        }
      });
    }

    return {

      console_log_3987345: (callback) => {
        testConsole('console.log(3987345)', '/tests/remoteEval_console_log.js', (level, args, close_clean) => {
          try {
            assert.equal('log', level);
            assert.equal(1, args.length);
            assert.equal(3987345, args[0]);
          }
          catch (error) {
            callback(error);
            close_clean();
          }

          callback();
          close_clean();
        });
      },

      console_error_20495: (callback) => {
        testConsole('console.error(20495)', '/tests/remoteEval_console_log.js', (level, args, close_clean) => {
          try {
            assert.equal('error', level);
            assert.equal(1, args.length);
            assert.equal(20495, args[0]);
          }
          catch (error) {
            callback(error);
            close_clean();
          }

          callback();
          close_clean();
        });
      },

      console_warn_abc_1_2: (callback) => {
        testConsole('console.warn("abc", [1,2])', '/tests/remoteEval_console_log.js', (level, args, close_clean) => {
          try {
            assert.equal('warn', level);
            assert.equal(2, args.length);
            assert.equal("abc", args[0]);
            assert.equal(2, args[1].length);
            assert.equal(1, args[1][0]);
            assert.equal(2, args[1][1]);
          }
          catch (error) {
            callback(error);
            close_clean();
          }

          callback();
          close_clean();
        });
      },

      console_trace_obj_a1_b456: (callback) => {
        testConsole('console.trace({a:1,b:456})', '/tests/remoteEval_console_log.js', (level, args, close_clean) => {
          try {
            assert.equal('trace', level);
            assert.equal(1, args.length);
            assert.equal(1, args[0].a);
            assert.equal(456, args[0].b);
          }
          catch (error) {
            callback(error);
            close_clean();
          }

          callback();
          close_clean();
        });
      },

      console_trace_obj_a1_bObject: (callback) => {
        testConsole('console.trace({a:1,b:Object})', '/tests/remoteEval_console_log.js', (level, args, close_clean) => {
          try {
            assert.equal('trace', level);
            assert.equal(1, args.length);
            assert.equal(1, args[0].a);
            assert.equal('function', typeof args[0].b);
          }
          catch (error) {
            callback(error);
            close_clean();
          }

          callback();
          close_clean();
        });
      }





    };
  }

}