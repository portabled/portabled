module shell {

  export function redirectLocalStorage(drive: persistence.Drive, cachePath: string) {

    var keys: string[] = null;

    function updateKeys() {
      if (keys) return;
      keys = [];
      var files = drive.files();
      for (var i = 0; i < files.length; i++) {
        if (files[i].length > cachePath.length && files[i].slice(0, cachePath.length) === cachePath) {
          keys.push(files[i].slice(cachePath.length));
        }
      }
    }

    class LocalStorageOverride {

      constructor() {
        Object.defineProperty(this, 'length', {
          get: () => {
            updateKeys();
            return keys.length;
          }
        });
      }

      key(index: number) {
        updateKeys();
        return keys[index];
      }

      getItem(key: string) {
        var dt = drive.read(cachePath + key);
        console.log('localStorage.getItem(', key, ') ', typeof dt === 'string' ? dt.length : dt);
        // if (typeof debugContinue === 'undefined') throw new Error('debug');
        return dt;
      }

      setItem(key: string, value: string) {
        console.log('localStorage.setItem(', key, ', ', typeof value === 'string' ? value.length : value, ')');
        drive.write(cachePath + key, value || '');
        keys = null;
      }

      removeItem(key: string) {
        console.log('localStorage.removeItem(', key, ')');
        drive.write(cachePath + key, null);
        keys = null;
      }
    }

    return new LocalStorageOverride();
  }

}