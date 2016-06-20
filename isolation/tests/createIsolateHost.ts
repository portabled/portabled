
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


namespace tests {

  tests['createIsolateHost'] = createTestsWith_createIsolateHost(isolation.createIsolateHost);

  tests['createIsolateHost_iframe'] = createTestsWith_createIsolateHost(isolation.createIsolateHost.iframe);

  tests['createIsolateHost_worker'] = createTestsWith_createIsolateHost(isolation.createIsolateHost.worker);

  function createTestsWith_createIsolateHost(createIsolateHost: (drive: persistence.Drive, callback: (host: isolation.IsolatedProcess) => void) => void) {
    return {

      createIsolateHost_succeeds: (callback) => {
        createIsolateHost(driveAs({}), host=>{
          callback();
          try { if (host) host.terminate(); }
          catch (error) { }
        });
      },

      createIsolateHost_terminate: (callback) => {
        createIsolateHost(driveAs({}), host => {
          try {
        		host.terminate();
          }
          catch(error) {
            callback(error);
            return;
          }
          callback();
        });
      },

      remoteEval_withoutReturn: (callback) => {
        createIsolateHost(driveAs({}), host => {
          host.remoteEval('2+2', 0, '/tests/remoteEval_withoutReturn.js', (error, result) => {
            try {
              assert(!error, 'error '+error);
              var _undef;
              assert.equal(_undef, result, 'no return no result');
              callback();
            }
            catch (err) {
              callback(err);
            }
            close_clean();
          });

          function close_clean() {
            try { if (host) host.terminate(); }
            catch (error) { }
          }
        });
      },

      remoteEval_returns: (callback) => {
        createIsolateHost(driveAs({}), host => {
          host.remoteEval('return 2+2', 0, '/tests/remoteEval_returns.js', (error, result) => {
            try {
              assert(!error, 'error '+error);
              assert.equal(4, result, '2+2 result');
              callback();
            }
            catch (err) {
              callback(err);
            }
            close_clean();
          });

          function close_clean() {
            try { if (host) host.terminate(); }
            catch (error) { }
          }
        });
      },

      remoteEval_terminate: (callback) => {
        createIsolateHost(driveAs({}), host => {
          host.remoteEval('return 2+2', 0, '/tests/remoteEval_terminate.js', (error, result) => {
            try {
              host.terminate();
              callback();
            }
            catch (err) {
              callback(err);
            }
          });
        });
      },

      remoteEval_throw: (callback) => {
        createIsolateHost(driveAs({}), host => {
          host.remoteEval('throw new Error("Abc34534")', 0, '/tests/remoteEval_throw.js', (error, result) => {
            try {
              assert(error, 'error '+error);
              assert.equal('Abc34534', error.message);
              callback();
            }
            catch (err) {
              callback(err);
            }
            close_clean();
          });

          function close_clean() {
            try { if (host) host.terminate(); }
            catch (error) { }
          }
        });
      },

      remoteEval_throw_CustomError: (callback) => {
        createIsolateHost(driveAs({}), host => {
          host.remoteEval('throw new SyntaxError("DUTYFREE4")', 0, '/tests/remoteEval_throw_CustomError', (error, result) => {
            try {
              assert(error, 'error '+error);
              assert((error+'').indexOf('SyntaxError')>=0, 'indexOf(SyntaxError) in '+error);
              assert((error+'').indexOf('DUTYFREE4')>=0, 'indexOf(DUTYFREE4) in '+error);
              assert.equal('DUTYFREE4', error.message);
              callback();
            }
            catch (err) {
              callback(err);
            }
            close_clean();
          });

          function close_clean() {
            try { if (host) host.terminate(); }
            catch (error) { }
          }
        });
      },

      remoteEval_simpleIN: (callback) => {
        var host = createIsolateHost(driveAs({}), host => {
          host.remoteEval('return arguments[0]', 56,'/tests/remoteEval_simpleIN.js', (error, result) => {
            try {
              assert(!error, 'error '+error);
              assert.equal(56, result);
              callback();
            }
            catch (err) {
              callback(err);
            }
            close_clean();
          });

          function close_clean() {
            try { if (host) host.terminate(); }
            catch (error) { }
          }
        });
      },

      remoteEval_complexIN: (callback) => {
        createIsolateHost(driveAs({}), host => {
          host.remoteEval('return arguments[0].value', { value: 97 }, '/tests/remoteEval_complexIN.js', (error, result) => {
            try {
              assert(!error, 'error '+error);
              assert.equal(97, result);
              callback();
            }
            catch (err) {
              callback(err);
            }
            close_clean();
          });
          function close_clean() {
            try { if (host) host.terminate(); }
            catch (error) { }
          }
        });
      },

      remoteEval_complexOUT: (callback) => {
        createIsolateHost(driveAs({}), host => {
          host.remoteEval('return { value: 23 }', null, '/tests/remoteEval_complexOUT.js', (error, result) => {
            try {
              assert(!error, 'error '+error);
              assert.equal(23, result.value);
              callback();
            }
            catch (err) {
              callback(err);
            }
            close_clean();
          });

          function close_clean() {
            try { if (host) host.terminate(); }
            catch (error) { }
          }
        });
      },

      remoteEval_complexIN_OUT: (callback) => {
        createIsolateHost(driveAs({}), host => {
          host.remoteEval('return { value: arguments[0].x+arguments[0].y }', {x:2,y:2}, '/tests/remoteEval_complexIN_OUT.js', (error, result) => {
            try {
              assert(!error, 'error '+error);
              assert.equal(4, result.value);
              callback();
            }
            catch (err) {
              callback(err);
            }
            close_clean();
          });

          function close_clean() {
            try { if (host) host.terminate(); }
            catch (error) { }
          }
        });
      },

      connection_to_parent: {
        invokeAsync_hits_onmessage: (callback) => {
          createIsolateHost(driveAs({}), host => {
            var key = 'TEST-connection_to_parent_invokeAsync-'+(+new Date())+'-'+Math.random();

            host.onmessage = function() {
              callback();
              close_clean();
            };

            host.remoteEval('connection_to_parent.invokeAsync({TEST_key: "'+key+'"})', null, '/tests/connection_to_parent.js', () => {
              // nothing
            });

            function close_clean() {
              try { if (host) host.terminate(); }
              catch (error) { }
            }
          });
        },

        invokeAsync_passes_right_message: (callback) => {
          createIsolateHost(driveAs({}), host => {
            var key = 'TEST-connection_to_parent_invokeAsync-'+(+new Date())+'-'+Math.random();

            host.onmessage = function(msg) {
              try {
                assert.equal(key, msg.TEST_key);
              }
              catch (error) {
              	callback(error);
                close_clean();
                return;
              }
              callback();
              close_clean();
            };

            host.remoteEval('connection_to_parent.invokeAsync({TEST_key: "'+key+'"})', null, '/tests/invokeAsync_passes_right_message.js', () => {
              // nothing
            });

            function close_clean() {
              try { if (host) host.terminate(); }
              catch (error) { }
            }
          });
        },

        invokeAsync_passes_return_bounce: (callback) => {
          createIsolateHost(driveAs({}), host => {
            var key = 'TEST-connection_to_parent_invokeAsync-'+(+new Date())+'-'+Math.random();

            host.onmessage = function(msg, sync, response_callback) {
              if (msg.TEST_response_after_invoke) {
                try {
                  assert.equal(key, msg.TEST_response_after_invoke);
                }
                catch (error) {
                  callback(error);
                  close_clean();
                  return;
                }
                callback();
                close_clean();
              }
              else if (msg.TEST_key_original_message) {
                try {
                  assert.equal(key, msg.TEST_key_original_message);
                  response_callback(null, {TEST_key_response: key});
                }
                catch (error) {
                  callback(error);
                  close_clean();
                  return;
                }
              }
            };

            host.remoteEval(
              'connection_to_parent.invokeAsync(\n'+
              '  {TEST_key_original_message: "'+key+'"},\n'+
              '  function (error, result) {\n'+
              ' 	 connection_to_parent.invokeAsync({TEST_response_after_invoke: "'+key+'"});\n'+
              '  })',
              null,
              '/tests/invokeAsync_passes_return_bounce.js',
              () => {
                // this execution returns nothing, all conversation is through invokeAsync
              });

            function close_clean() {
              try { if (host) host.terminate(); }
              catch (error) { }
            }
          });
        },

        pushMessage_reply_with_invokeAsync: (callback) => {
          createIsolateHost(driveAs({}), host => {
            var key = 'TEST-connection_to_parent_invokeAsync-'+(+new Date())+'-'+Math.random();

            host.onmessage = function(msg) {
              try {
                assert.equal(key+'123', msg.TEST_key);
              }
              catch (error) {
              	callback(error);
                close_clean();
                return;
              }
              callback();
              close_clean();
            };

            host.remoteEval('var unsub = connection_to_parent.onPushMessage(function(msg) { connection_to_parent.invokeAsync({TEST_key: msg.key+"123"}); unsub(); }); ', null, '/tests/pushMessage_reply_with_invokeAsync.js', () => {
              // nothing
            });

  					host.pushMessage({key: key});

            function close_clean() {
              try { if (host) host.terminate(); }
              catch (error) { }
            }
          });
        },

        drive_empty_files_none: (callback) => {
          createIsolateHost(driveAs({}), host => {

            host.remoteEval('return connection_to_parent.drive.files()', null, '/tests/drive_empty_files_none.js', (error, result) => {
              close_clean();

              if (error) return callback(error);

              try {
                assert.equal(0, result.length);
              }
              catch (error) {
                return callback(error);
              }
              callback();
            });

            function close_clean() {
              try { if (host) host.terminate(); }
              catch (error) { }
            }
          });
        },

        drive_empty_read_null: (callback) => {
          createIsolateHost(driveAs({}), host => {

            host.remoteEval('return connection_to_parent.drive.read("/temp")', null,'/tests/drive_empty_read_null', (error, result) => {
              close_clean();

              if (error) return callback(error);

              try {
                assert.equal(null, result);
              }
              catch (error) {
                return callback(error);
              }
              callback();
            });

            function close_clean() {
              try { if (host) host.terminate(); }
              catch (error) { }
            }
          });
        },

        drive_withFile_files: (callback) => {
          createIsolateHost(driveAs({'/mytext': 'mytext12514'}), host => {

            host.remoteEval('return connection_to_parent.drive.files()', null, '/tests/drive_withFiles.js', (error, result) => {
              close_clean();

              if (error) return callback(error);

              try {
                assert.equal(1, result.length);
                assert.equal('/mytext', result[0]);
              }
              catch (error) {
                return callback(error);
              }
              callback();
            });

            function close_clean() {
              try { if (host) host.terminate(); }
              catch (error) { }
            }
          });
        },

        drive_withFile_read_text06053: (callback) => {
          createIsolateHost(driveAs({'/textfile': 'text06053'}), host => {

            host.remoteEval('return connection_to_parent.drive.read("/textfile")', null, '/tests/drive_withFile_read_text06053.js', (error, result) => {
              close_clean();

              if (error) return callback(error);

              try {
                assert.equal('text06053', result);
              }
              catch (error) {
                return callback(error);
              }
              callback();
            });

            function close_clean() {
              try { if (host) host.terminate(); }
              catch (error) { }
            }
          });
        },

        drive_write_read_immediately: (callback) => {
          createIsolateHost(driveAs({}), host => {

            host.remoteEval('connection_to_parent.drive.write("/mytext", "ui4345"); return connection_to_parent.drive.read("/mytext")', null, '/tests/drive_write_read_immediately.js', (error, result) => {
              close_clean();

              if (error) return callback(error);

              try {
                assert.equal('ui4345', result);
              }
              catch (error) {
                return callback(error);
              }
              callback();
            });

            function close_clean() {
              try { if (host) host.terminate(); }
              catch (error) { }
            }
          });
        },

        drive_write_spinCycle_affectsDrive: (callback) => {
          var drive = driveAs({});
          createIsolateHost(drive, host => {

            host.remoteEval('connection_to_parent.drive.write("/mytext", "rlrjo45")', null, '/tests/drive_write_spinCycle_affectsDrive.js', (error, result) => {
              if (error) {
              	close_clean();
                return callback(error);
              }

              host.remoteEval('null', null, '/tests/drive_write_spinCycle_affectsDrive__null.js', (error, result) => {
                close_clean();

                if (error) return callback(error);

                try {
                  assert.equal('rlrjo45', drive['/mytext']);
                }
                catch (error) {
                  return callback(error);
                }
                callback();

              });
            });

            function close_clean() {
              try { if (host) host.terminate(); }
              catch (error) { }
            }
          });
        }


      }

    };
  }

}