module nobrowser {

  export function overrideLocalStorage(drive: { files(): string[]; read(key: string); write(key: string, value: string) }) {

    class LocalStorageOverride {

      private _keys: string[] = null;
      length = 0;

      constructor() {
        var files = drive.files();
        for (var i = 0; i < files.length; i++) {
          var f = files[i];
          this._keys.push(f);
        }
        this.length = this._keys.length;
      }

      clear() {
        for (var i = 0; i < this._keys.length; i++) {
          var f = this._keys[i];
          drive.write(f, null);
        }
        this._keys = [];
      }

    	key(index: number) {
        return this._keys[index];
      }

    	getItem(key: string): string {
        return drive.read(key);
      }

    	setItem(key: string, value: string): void {
        drive.write(key, value);
        for (var i = 0; i < this._keys.length; i++) {
          if (key === this._keys[i]) return;
        }
        this._keys.push(key);
        this.length++;
      }

    	removeItem(key: string): void {
        for (var i = 0; i < this._keys.length; i++) {
          if (key === this._keys[i]) {
            this._keys.splice(i, 1);
            this.length++;
            drive.write(key, null);
            return;
          }
        }
      }
    }

    return LocalStorageOverride;

  }
}