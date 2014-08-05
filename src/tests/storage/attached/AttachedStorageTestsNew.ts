module teapo.tests {

  export class AttachedStorageTestsNew {

    constructor(private _detect: storage.attached.StorageDetect) {
    }

    detectStorageAsync_succeeds(callback: (error: Error) => void) {
      var ukey = this._generateKey();
      this._detect.detect(
        ukey,
        (error, meta) => callback(error));
    }

    detectStorageAsync_editedUTC_null(callback: (error: Error) => void) {
      var ukey = this._generateKey();
      this._detect.detect(
        ukey,
        (error, meta, access) =>
          callback(meta.editedUTC ?
            new Error('Expected null, found ' + meta.editedUTC) :
            null)
        );
    }

    read(callback: (error: Error) => void) {
      var ukey = this._generateKey();
      this._detect.detect(
        ukey,
        (error, meta, access) => {
          try {
            access.read(['None'], (err, propBag) => callback(error));
          }
          catch (error) {
            callback(error);
          }
        });
    }

    update(callback: (error: Error) => void) {
      var ukey = this._generateKey();
      this._detect.detect(
        ukey,
        (error, meta, access) => {
          try {
            if (!access) {
              callback(new Error('BootAccess.open() returned null ' + access));
              return;
            }

            access.update({ "file.txt": { property: "value" } }, 10, callback);
          }
          catch (error) {
            callback(error);
            return;
          }

        });
    }

    update_detectStorageAsync_editedUTC_asPassed(callback: (error: Error) => void) {
      var ukey = this._generateKey();
      this._detect.detect(
        ukey,
        (error, meta, access) => {
          try {
            if (!access) {
              callback(new Error('BootAccess.open() returned null ' + access));
              return;
            }
          }
          catch (error) {
            callback(error);
            return;
          }

          access.update({ "file.txt": { property: "value" } }, 12304, (error) => { 
            this._detect.detect(
              ukey,
              (error, load) =>
                callback(load.editedUTC === 12304 ? null : new Error('Expected 12304: ' + load.editedUTC)));
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
      this._detect.detect(
        ukey,
        (error, meta, access) => {
          try {
            if (!access) {
              callback(new Error('detect() returned null ' + access));
              return;
            }
          }
          catch (error) {
            callback(error);
            return;
          }

          var byFullPath: any = {};
          byFullPath[fileName] = {};
          byFullPath[fileName][property] = value;

          access.update(byFullPath, 10, (error) => {
            this._detect.detect(
              ukey,
              (error, meta, access) => {
                access.read([fileName], (error, byFullPath) => {
                  if (error) { 
                    callback(error);
                    return;
                  }

                  var propBag = byFullPath[fileName];
                  if (!propBag) {
                    callback(new Error('File not found ' + fileName))
                    return;
                  }
                  
                  var propertyValue = propBag[property];
                  callback(propertyValue === value ? null : new Error('Wrong value ' + JSON.stringify(propertyValue) + ' instead of ' + JSON.stringify(value)));
                });
              });
          });

        });
    }

    private _generateKey(): string {
      return Math.random() + '-' + Math.random();
    }

  }

}