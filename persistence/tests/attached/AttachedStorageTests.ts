namespace tests.attached {

  export function _generateAttachedStorageTests(opt: persistence.Drive.Optional): any {

    var nowRunKey = 'test'+opt.name+(new Date()+'').replace(/[^a-zA-Z]/g, '');

    function _generateKey(): string {
      return nowRunKey + '-'+Math.random();
    }

    var predetection_failed = false;
    try {
      var ukey = _generateKey();
      opt.detect(ukey, function(error, detached) {
        if (error) predetection_failed = true;
      });
    }
    catch (err) {
      predetection_failed = true;
    }

    if (predetection_failed) {
      return {
        detect_succeeds(callback: (error: Error) => void) {
          var ukey = _generateKey();
          opt.detect(
            ukey,
            (error, detached) => callback(error ? new Error(error) : null));
        }
      };
    }


    return {

      detect_succeeds(callback: (error: Error) => void) {
        var ukey = _generateKey();
        opt.detect(
          ukey,
          (error, detached) => callback(error ? new Error(error) : null));
      },

      detect_timestamp_null(callback: (error: Error) => void) {
        var ukey = _generateKey();
        opt.detect(
          ukey,
          (error, detached) => {
          	if (error) { return callback(new Error(error)); }

            callback(detached.timestamp ?
              new Error('Expected null, found ' + detached.timestamp) :
              null);
          });
      },

      applyTo(callback: (error: Error) => void) {
        var ukey = _generateKey();
        opt.detect(
          ukey,
          (error, detached) => {
          	if (error) { return callback(new Error(error)); }

            detached.applyTo({
                timestamp: 0,
                write: (name, content, encoding) => callback(new Error('Detached.apply: unexpected write('+name+','+content+','+encoding+'), the store should be empty.'))
              },
              shadow => {
              	callback(null);
            	});
            });
      },

      write_opt_timestamp_recent(callback: (error: Error) => void) {
        var ukey = _generateKey();
        opt.detect(
          ukey,
          (error, detached) => {
          	if (error) { return callback(new Error(error)); }

            detached.applyTo({
                timestamp: 0,
                write: (name, content, encoding) => callback(new Error('Detached.apply: unexpected write('+name+','+content+','+encoding+'), the store should be empty.'))
              },
              shadow => {
              	var writeTime = +new Date();
                shadow.timestamp = writeTime;
                shadow.write('/file.txt', 'value', 'LF');
              	setTimeout(() => {
                  opt.detect(
                    ukey,
                    (error, detached) => {
                      //if (detached.timestamp!==2398423234)
                      var now = +new Date()
                      if (now-detached.timestamp>2000)
                        callback(new Error('Timestamp difference over 2 seconds: '+(now-detached.timestamp)+', timestamp appears to point to '+new Date(detached.timestamp)+'.'));
                      else
                        callback(null);
                    });
                }, 5);
              });
            });
      },

      write_loadAgain_sameValue_array20(callback: (error: Error) => void) {
        var array20 = [];
        for (var i = 0; i < 20; i++) array20[i] = 100 + i;
        _write_loadAgain_sameValue_core(
          'write_loadAgain_sameValue_array20.txt', array20 as any,
          callback);
      },

      write_loadAgain_sameValue_array40(callback: (error: Error) => void) {
        var array40 = [];
        for (var i = 0; i < 40; i++) array40[i] = 100 + i;
        _write_loadAgain_sameValue_core(
          'write_loadAgain_sameValue_array20.txt', array40 as any,
          callback);
      },

      write_loadAgain_sameValue_array8K(callback: (error: Error) => void) {
        var array8K = [];
        for (var i = 0; i <  1024*8; i++) array8K[i] = (100 + i) % 256;
        _write_loadAgain_sameValue_core(
          'write_loadAgain_sameValue_array8K.txt', array8K as any,
          callback);
      },

      write_loadAgain_sameValue(callback: (error: Error) => void) {
        _write_loadAgain_sameValue_core(
          'write_loadAgain_sameValue.txt', 'value94783',
          callback);
      },

      write_loadAgain_sameValue_unicodeContent(callback: (error: Error) => void) {
        var unicodeString = 'abc941' +
          [256, 257, 1024, 1026, 12879, 13879].map(m=> String.fromCharCode(m)).join('');

        _write_loadAgain_sameValue_core(
          'write_loadAgain_sameValue_unicodeValue.txt', unicodeString,
          callback);
      },



      write_loadAgain_sameValue_crlfValue(callback: (error: Error) => void) {
        var crlfString = 'abc941\nasdf3434\r07958\r\n4838hr';

        _write_loadAgain_sameValue_core(
          'write_loadAgain_sameValue_crlfValue.txt', crlfString,
          callback);
      },

      write_loadAgain_sameValue_crOnly(callback: (error: Error) => void) {
        _write_loadAgain_sameValue_core(
          'file82263.txt', '\r',
          callback);
      },

      write_loadAgain_sameValue_lfOnly(callback: (error: Error) => void) {
        _write_loadAgain_sameValue_core(
          'file82263.txt', '\n',
          callback);
      },

      write_loadAgain_sameValue_crlfOnly(callback: (error: Error) => void) {
        _write_loadAgain_sameValue_core(
          'write_loadAgain_sameValue_lfOnly.txt', '\r\n',
          callback);
      },

      write_loadAgain_sameValue_zeroCharOnly(callback: (error: Error) => void) {
        _write_loadAgain_sameValue_core(
          'write_loadAgain_sameValue_zeroCharOnly.txt', String.fromCharCode(0),
          callback);
      },

      write_loadAgain_sameValue_zeroCharPrefix(callback: (error: Error) => void) {
        _write_loadAgain_sameValue_core(
          'write_loadAgain_sameValue_zeroCharOnly.txt', String.fromCharCode(0) + 'abcd',
          callback);
      },

      write_loadAgain_sameValue_zeroCharSuffix(callback: (error: Error) => void) {
        _write_loadAgain_sameValue_core(
          'write_loadAgain_sameValue_zeroCharOnly.txt', 'abcde'+String.fromCharCode(0),
          callback);
      },

      write_loadAgain_sameValue_zeroCharMiddle(callback: (error: Error) => void) {
        _write_loadAgain_sameValue_core(
          'write_loadAgain_sameValue_zeroCharOnly.txt', 'abcde' + String.fromCharCode(0) + 'zxcvbnm',
          callback);
      },

      write_loadAgain_sameValue_charCodesUnder32(callback: (error: Error) => void) {

        var chars='';
        for (var i = 0; i < 32; i++) chars + String.fromCharCode(i);
        _write_loadAgain_sameValue_core(
          'write_loadAgain_sameValue_charCodesUnder32.txt', chars,
          callback);
      },



      writeTwice_loadAgain_secondValue(callback: (error: Error) => void) {
        var ukey = _generateKey();
        opt.detect(
          ukey,
          (error, detached) => {
          	if (error) { return callback(new Error(error)); }

            detached.applyTo({
                timestamp: 0,
                write: (name, content, encoding) => callback(new Error('Detached.apply: unexpected write('+name+','+content+','+encoding+'), the store should be empty.'))
              },
              shadow => {
                shadow.write('/file.txt', 'value2', 'LF');
                shadow.write('/file.txt', 'value4', 'LF');
              	setTimeout(() => {
                  opt.detect(
                    ukey,
                    (error, detached) => {
                      var files: any = {};
                      detached.applyTo({
                          timestamp: 0,
                          write: (name, content, encoding) => {
                            var enc = persistence.encodings[encoding];
                            files[name] = enc(content);
                          }
                        },
                        shadow => {
                          var fileTxt = files['/file.txt'];
                          if (!fileTxt) {
                            callback(new Error('File is not reported on subsequent load.'));
                          }
                          else if (fileTxt!=='value4') {
                            callback(new Error('Wrong content on re-read '+fileTxt+', expected value4.'));
                          }
                          else {
                            callback(null);
                          }
                        });
                    });
                }, 5);
            });
          });
      }
  };

    function _write_loadAgain_sameValue_core(fileName: string, content: string, callback: (error: Error) => void) {

      var normFilename = /^\//.test(fileName) ? fileName : '/'+fileName;

      var entry = persistence.bestEncode(content);

      var ukey = _generateKey();
      opt.detect(
        ukey,
        (error, detached) => {
          if (error) return callback(typeof error === 'string' ? new Error('Detect failed: '+error) : error as any);

          detached.applyTo({
              timestamp: 0,
                write: (name, content, encoding) => callback(new Error('Detached.apply: unexpected write('+name+','+content+','+encoding+'), the store should be empty.'))
            },
            shadow => {
              shadow.write(normFilename, entry.content, entry.encoding);
            	setTimeout(() => {
                opt.detect(
                  ukey,
                  (error, detect) => {
                    if (error) return callback(typeof error === 'string' ? new Error('Detect failed after shadow.write' + error) : error as any);

                    var files: any = {};
                    detect.applyTo({
                        timestamp: 0,
                        write: (name, content, encoding) => {
                          var enc = persistence.encodings[encoding];
                          files[name] = enc(content);
                        }
                      },
                      shadow => {
                        var fileTxt = files[normFilename];
                        if (!fileTxt && content) {
                          callback(new Error('File '+fileName+' is not reported on subsequent load.'));
                        }
                        else if (fileTxt!==content) {
                          if (fileTxt.length == content.length) {
                            for (var i = 0; i < fileTxt.length; i++) {
                              if (fileTxt[i]!==content[i]) {
                                callback(new Error('Wrong content on re-read at '+i+': '+fileTxt[i]+'!=='+content[i]+'  ['+fileTxt.length+'] '+fileTxt+', expected ['+content.length+'] '+content+'.'));
                                return;
                              }
                            }
                            callback(null);
                            return;
                          }

                          callback(new Error('Wrong content on re-read ['+fileTxt.length+'] '+fileTxt+',\n expected ['+content.length+'] '+content+'.'));
                        }
                        else {
                          callback(null); // success!
                        }
                      });
                  });
                }, 5);
            });
        });
    }

	}

}