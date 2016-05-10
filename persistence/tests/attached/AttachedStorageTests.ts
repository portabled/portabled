module tests.attached {

  export function _generateAttachedStorageTests(opt: persistence.Drive.Optional) {

    var nowRunKey = 'test'+opt.name+(new Date()+'').replace(/[^a-zA-Z]/g, '');

    function _generateKey(): string {
      return nowRunKey + '-'+Math.random();
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
          (error, detached) =>
            callback(detached.timestamp ?
              new Error('Expected null, found ' + detached.timestamp) :
              null)
          );
      },

      applyTo(callback: (error: Error) => void) {
        var ukey = _generateKey();
        opt.detect(
          ukey,
          (error, detached) => {
            detached.applyTo({
                timestamp: 0,
                write: (name, content) => callback(new Error('Detached.apply: unexpected write('+name+','+content+'), the store should be empty.'))
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
            detached.applyTo({
                timestamp: 0,
                write: (name, content) => callback(new Error('Detached.apply: unexpected write('+name+','+content+'), the store should be empty.'))
              },
              shadow => {
              	var writeTime = +new Date();
                shadow.timestamp = writeTime;
                shadow.write('/file.txt', 'value');
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
            detached.applyTo({
                timestamp: 0,
                write: (name, content) => callback(new Error('Detached.apply: unexpected write('+name+','+content+'), the store should be empty.'))
              },
              shadow => {
                shadow.write('/file.txt', 'value2');
                shadow.write('/file.txt', 'value4');
              	setTimeout(() => {
                  opt.detect(
                    ukey,
                    (error, detached) => {
                      var files: any = {};
                      detached.applyTo({
                          timestamp: 0,
                          write: (name, content) => files[name] = content
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

      var ukey = _generateKey();
      opt.detect(
        ukey,
        (error, detached) => {
          detached.applyTo({
              timestamp: 0,
              write: (name, content) => callback(new Error('Detached.apply: unexpected write('+name+','+content+'), the store should be empty.'))
            },
            shadow => {
              shadow.write(normFilename, content);
            	setTimeout(() => {
                opt.detect(
                  ukey,
                  (error, detect) => {
                    var files: any = {};
                    detect.applyTo({
                        timestamp: 0,
                        write: (name, content) => files[name] = content
                      },
                      shadow => {
                        var fileTxt = files[normFilename];
                        if (!fileTxt && content) {
                          callback(new Error('File '+fileName+' is not reported on subsequent load.'));
                        }
                        else if (fileTxt!==content) {
                          callback(new Error('Wrong content on re-read '+fileTxt+', expected '+content+'.'));
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