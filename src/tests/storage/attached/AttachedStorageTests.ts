module teapo.tests {

  export class AttachedStorageTests {

    constructor(private _detect: teapo.storage.attached.DetectStorage) {
    }

    detectStorageAsync_succeeds(callback: (error: Error) => void) {
      var ukey = this._generateKey();
      this._detect.detectStorageAsync(
        ukey,
        (error, load) => callback(error));
    }

    detectStorageAsync_editedUTC_null(callback: (error: Error) => void) {
      var ukey = this._generateKey();
      this._detect.detectStorageAsync(
        ukey,
        (error, load) =>
          callback(load.editedUTC ?
            new Error('Expected null, found ' + load.editedUTC) :
            null)
        );
    }

    load(callback: (error: Error) => void) {
      var ukey = this._generateKey();
      this._detect.detectStorageAsync(
        ukey,
        (error, load) => {
          load.load({
            files: () => {},
            file: (name, values) => callback(new Error('LoadStorageRecipient.file should not be called.')),
            completed: (updater) => callback(null),
            failed: (error) => callback(error)
          });
        });
    }

    update(callback: (error: Error) => void) {
      var ukey = this._generateKey();
      this._detect.detectStorageAsync(
        ukey,
        (error, load) => {
          load.load({
            files: () => { },
            file: (name, values) => callback(new Error('LoadStorageRecipient.file should not be called.')),
            completed: (updater: teapo.storage.attached.UpdateStorage) => {
              updater.update(
                'file.txt', 'property', 'value',
                callback);
            },
            failed: (error) => callback(error)
          });
        });
    }

    update_detectStorageAsync_editedUTC_recent(callback: (error: Error) => void) {
      var ukey = this._generateKey();
      this._detect.detectStorageAsync(
        ukey,
        (error, load) => {
          load.load({
            files: () => { },
            file: (name, values) => callback(new Error('LoadStorageRecipient.file should not be called.')),
            completed: (updater: teapo.storage.attached.UpdateStorage) => {
              updater.update(
                'file.txt', 'property', 'value',
                (error: Error) => {
                  this._detect.detectStorageAsync(
                    ukey,
                    (error, load) =>
                      callback(load.editedUTC ? null : new Error('Expected non-null.')));
                });
            },
            failed: (error) => callback(error)
          });
        });
    }

    update_loadAgain_sameValue(callback: (error: Error) => void) {
      this._update_loadAgain_sameValue_core(
        'update_loadAgain_sameValue.txt', 'property234', 'value94783',
        callback);
    }

    update_loadAgain_sameValue_unicodeValue(callback: (error: Error) => void) {
      var unicodeString = 'abc941' +
        [256, 257, 1024, 1026, 12879, 13879].map(m=> String.fromCharCode(m)).join('');

      this._update_loadAgain_sameValue_core(
        'update_loadAgain_sameValue_unicodeValue.txt', 'property83784', unicodeString,
        callback);
    }

    update_loadAgain_sameValue_unicodeProperty(callback: (error: Error) => void) {
      var unicodeString = 'abc6253' +
        [256, 257, 1024, 1026, 12879, 13879].map(m=> String.fromCharCode(m)).join('');

      this._update_loadAgain_sameValue_core(
        'update_loadAgain_sameValue_unicodeProperty.txt', unicodeString, 'value345634',
        callback);
    }


    update_loadAgain_sameValue_crlfValue(callback: (error: Error) => void) {
      var crlfString = 'abc941\nasdf3434\r07958\r\n4838hr';

      this._update_loadAgain_sameValue_core(
        'update_loadAgain_sameValue_crlfValue.txt', 'property83784', crlfString,
        callback);
    }

    update_loadAgain_sameValue_crOnly(callback: (error: Error) => void) {
      this._update_loadAgain_sameValue_core(
        'file82263.txt', 'property83784', '\r',
        callback);
    }

    update_loadAgain_sameValue_lfOnly(callback: (error: Error) => void) {
      this._update_loadAgain_sameValue_core(
        'file82263.txt', 'property83784', '\n',
        callback);
    }

    update_loadAgain_sameValue_crlfOnly(callback: (error: Error) => void) {
      this._update_loadAgain_sameValue_core(
        'update_loadAgain_sameValue_lfOnly.txt', 'property83784', '\r\n',
        callback);
    }

    update_loadAgain_sameValue_zeroCharOnly(callback: (error: Error) => void) {
      this._update_loadAgain_sameValue_core(
        'update_loadAgain_sameValue_zeroCharOnly.txt', 'property83784', String.fromCharCode(0),
        callback);
    }

    update_loadAgain_sameValue_zeroCharPrefix(callback: (error: Error) => void) {
      this._update_loadAgain_sameValue_core(
        'update_loadAgain_sameValue_zeroCharOnly.txt', 'property83784', String.fromCharCode(0) + 'abcd',
        callback);
    }

    update_loadAgain_sameValue_zeroCharSuffix(callback: (error: Error) => void) {
      this._update_loadAgain_sameValue_core(
        'update_loadAgain_sameValue_zeroCharOnly.txt', 'property83784', 'abcde' + String.fromCharCode(0),
        callback);
    }

    update_loadAgain_sameValue_zeroCharMiddle(callback: (error: Error) => void) {
      this._update_loadAgain_sameValue_core(
        'update_loadAgain_sameValue_zeroCharOnly.txt', 'property83784', 'abcde' + String.fromCharCode(0) + 'zxcvbnm',
        callback);
    }

    update_loadAgain_sameValue_charCodesUnder32(callback: (error: Error) => void) {

      var chars = '';
      for (var i = 0; i < 32; i++) chars + String.fromCharCode(i);
      this._update_loadAgain_sameValue_core(
        'update_loadAgain_sameValue_charCodesUnder32.txt', 'property83784', chars,
        callback);
    }


    private _update_loadAgain_sameValue_core(fileName: string, property: string, value: string, callback: (error: Error) => void) {
      var ukey = this._generateKey();
      this._detect.detectStorageAsync(
        ukey,
        (error, load) => {
          load.load({
            files: () => { },
            file: (name, values) => callback(new Error('LoadStorageRecipient.file should not be called.')),
            completed: (updater: teapo.storage.attached.UpdateStorage) => {
              updater.update(
                fileName, property, value,
                (error: Error) => {
                  this._detect.detectStorageAsync(
                    ukey,
                    (error, load) => {
                      var files: any = {};
                      load.load({
                        files: () => { },
                        file: (name, values) => files[name] = values,
                        completed: (updater) => {
                          var fileTxt = files[fileName];
                          if (!fileTxt) {
                            callback(new Error('File is not reported on subsequent load.'));
                          }
                          else {
                            var propertyValue = fileTxt[property];
                            callback(propertyValue === value ? null : new Error('Wrong value ' + JSON.stringify(propertyValue) + ' instead of ' + JSON.stringify(value)));
                          }
                        },
                        failed: (error) => callback(error)
                      });
                    });
                });
            },
            failed: (error) => callback(error)
          });
        });
    }

    migrate(callback: (error: Error) => void) {
      var ukey = this._generateKey();
      this._detect.detectStorageAsync(
        ukey,
        (error, load) => {
          load.migrate(
            2345,
            { "file.txt": { property: "value" } },
            (error, update) => callback(error));
        });
    }

    migrate_load_sameValue(callback: (error: Error) => void) {
      var ukey = this._generateKey();
      this._detect.detectStorageAsync(
        ukey,
        (error, load) => {
          load.migrate(
            2345,
            { "file63.txt": { property: "value" } },
            (error, update) => {
              this._detect.detectStorageAsync(
                ukey,
                (error, load) => {
                  var files: any = {};
                  load.load({
                    files: () => { },
                    file: (name, values) => files[name] = values,
                    completed: (updater) => {
                      var fileTxt = files['file63.txt'];
                      if (!fileTxt) {
                        callback(new Error('File is not reported on subsequent load.'));
                      }
                      else {
                        var propertyValue = fileTxt['property'];
                        callback(propertyValue === 'value' ? null : new Error('Wrong value ' + propertyValue));
                      }
                    },
                    failed: (error) => callback(error)
                  });
                });
            });
        });
    }

    migrate_remove_detectStorageAsync_editedUTC_isrecent(callback: (error: Error) => void) {
      var ukey = this._generateKey();
      this._detect.detectStorageAsync(
        ukey,
        (error, load) => {
          load.migrate(
            2345,
            { "file.txt": { property: "value" } },
            (error, update) => {
              update.remove('file.txt', error => {
                if (error) {
                  callback(error);
                  return;
                }

                this._detect.detectStorageAsync(
                  ukey,
                  (error, load) => {
                    var now = dateNow();
                    callback(Math.abs(now - load.editedUTC) < 10000 ? null : new Error('Recent editedUTC expected, ' + load.editedUTC + ' (now ' + now + ', diff ' + (now - load.editedUTC) + ').'));
                  });

              });
            });
        });
    }

    migrate_remove_load_nofile(callback: (error: Error) => void) {
      var ukey = this._generateKey();
      this._detect.detectStorageAsync(
        ukey,
        (error, load) => {
          load.migrate(
            2345,
            { "file.txt": { property: "value" } },
            (error, update) => {
              update.remove('file.txt', error => {
                if (error) {
                  callback(error);
                  return;
                }

                this._detect.detectStorageAsync(
                  ukey,
                  (error, load) => {
                    var filenames: string[] = [];
                    load.load({
                      files: () => { },
                      file: (name, values) => filenames.push(name),
                      completed: (updater) => {
                        if (filenames.length) {
                          callback(new Error('Should not have any files: ' + filenames.join(', ') + '.'));
                        }
                        else {
                          callback(null);
                        }
                      },
                      failed: (error) => callback(error)
                    });
                  });

              });
            });
        });
    }


    migrate_detectStorageAsync_editedUTC(callback: (error: Error) => void) {
      var ukey = this._generateKey();
      this._detect.detectStorageAsync(
        ukey,
        (error, load) => {
          load.migrate(
            2345,
            { "file.txt": { property: "value" } },
            (error, update) => {
              this._detect.detectStorageAsync(
                ukey,
                (error, load) => {
                  callback(load.editedUTC === 2345 ? null : new Error('Incorrect editedUTC value ' + load.editedUTC + ' (expected 2345).'));
                });
            });
        });
    }

    updateTwice_loadAgain_secondValue(callback: (error: Error) => void) {
      var ukey = this._generateKey();
      this._detect.detectStorageAsync(
        ukey,
        (error, load) => {
          load.load({
            files: () => { },
            file: (name, values) => callback(new Error('LoadStorageRecipient.file should not be called.')),
            completed: (updater: teapo.storage.attached.UpdateStorage) => {
              updater.update(
                'file.txt', 'property1', 'value2',
                (error: Error) => updater.update(
                  'file.txt', 'property1', 'value4',
                  (error: Error) => {
                    this._detect.detectStorageAsync(
                      ukey,
                      (error, load) => {
                        var files: any = {};
                        load.load({
                          files: () => { },
                          file: (name, values) => files[name] = values,
                          completed: (updater) => {
                            var fileTxt = files['file.txt'];
                            if (!fileTxt) {
                              callback(new Error('File is not reported on subsequent load.'));
                            }
                            else {
                              var propertyValue = fileTxt['property1'];
                              callback(propertyValue === 'value4' ? null : new Error('Wrong value ' + propertyValue));
                            }
                          },
                          failed: (error) => callback(error)
                        });
                      });
                  }));
            },
            failed: (error) => callback(error)
          });
        });
    }

    private _generateKey(): string {
      return Math.random() + '-' + Math.random();
    }

  }

}