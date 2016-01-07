module nobrowser {

  export function overrideLocalStorage(drive: persistence.Drive, cachePath: string) {

    var cachePathDir = cachePath + (cachePath.slice(-1) === '/' ? '' : '/');

    return LocalStorageOverride;

    class LocalStorageOverride {

      private _keys: string[] = null;
      length = 0;

      constructor() {
        var files = drive.files();
        for (var i = 0; i < files.length; i++) {
          var f = files[i];
          if (f.length > cachePathDir.length && f.slice(0, cachePathDir.length) === cachePathDir)
            this._keys.push(f.slice(cachePathDir.length));
        }
        this.length = this._keys.length;
      }

      clear() {
        for (var i = 0; i < this._keys.length; i++) {
          var f = cachePathDir + this._keys[i];
          drive.write(f, null);
        }
        this._keys = [];
      }

    	key(index: number) {
        return this._keys[index];
      }

    	getItem(key: string): string {
        var keypath = cachePathDir + key;
        return drive.read(keypath);
      }

    	setItem(key: string, value: string): void {
        var keypath = cachePathDir + key;
        drive.write(keypath, value);
        for (var i = 0; i < this._keys.length; i++) {
          if (key === this._keys[i]) return;
        }
        this._keys.push(key);
        this.length++;
      }

    	removeItem(key: string): void {
        var keypath = cachePathDir + key;
        for (var i = 0; i < this._keys.length; i++) {
          if (key === this._keys[i]) {
            this._keys.splice(i, 1);
            this.length++;
            drive.write(keypath, null);
            return;
          }
        }
      }
    }

  }
}