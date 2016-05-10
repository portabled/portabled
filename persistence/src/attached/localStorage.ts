function _getLocalStorage() {
  return typeof localStorage === 'undefined' || typeof localStorage.length !== 'number' ? null : localStorage;
}

namespace attached.localStorage {

  export var name = 'localStorage';

  export function detect(uniqueKey: string, callback: (error: string, detached: persistence.Drive.Detached) => void): void {
    try {
      detectCore(uniqueKey, callback);
    }
    catch (error) {
      callback(error.message, null);
    }
  }

  function detectCore(uniqueKey: string, callback: (error:string, detached: persistence.Drive.Detached) => void): void {
    var localStorageInstance = _getLocalStorage();
    if (!localStorageInstance) {
      callback('Variable localStorage is not available.', null);
      return;
    }

    var access = new LocalStorageAccess(localStorageInstance, uniqueKey);
    var dt = new LocalStorageDetached(access);
    callback(null, dt);
  }

  class LocalStorageAccess {
    private _cache: { [key: string]: string; } = {};

    constructor(private _localStorage: Storage, private _prefix: string) {
    }

    get (key: string): string {
      var k = this._expandKey(key);
      var r = this._localStorage.getItem(k);
      return r;
    }

    set(key: string, value: string): void {
      var k = this._expandKey(key);
      try {
        return this._localStorage.setItem(k, value);
      }
      catch (error) {
        try {
          this._localStorage.removeItem(k);
          return this._localStorage.setItem(k, value);
        }
        catch (furtherError) {
        }
      }
    }

    remove(key: string): void {
      var k = this._expandKey(key);
      return this._localStorage.removeItem(k);
    }

    keys(): string[] {
      var result: string[] = [];
      var len = this._localStorage.length;
      for (var i = 0; i < len; i++) {
        var str = this._localStorage.key(i);
        if (str.length > this._prefix.length && str.slice(0, this._prefix.length) === this._prefix)
          result.push(str.slice(this._prefix.length));
      }
      return result;
    }

    private _expandKey(key: string): string {
      var k: string;

      if (!key) {
        k = this._prefix;
      }
      else {
        k = this._cache[key];
        if (!k)
          this._cache[key] = k = this._prefix + key;
      }

      return k;
    }
  }


  class LocalStorageDetached implements persistence.Drive.Detached {

    timestamp: number = 0;

    constructor(private _access: LocalStorageAccess) {
      var timestampStr = this._access.get('*timestamp');
      if (timestampStr && timestampStr.charAt(0)>='0' && timestampStr.charAt(0)<='9') {
        try {
          this.timestamp = parseInt(timestampStr);
        }
        catch (parseError) {
        }
      }
    }

    applyTo(mainDrive: { timestamp: number; write(path: string, content: any); }, callback: persistence.Drive.Detached.CallbackWithShadow): void {
      var keys = this._access.keys();
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (k.charAt(0)==='/') {
          var value = this._access.get(k);
          mainDrive.write(k, value);
        }
      }

      var shadow = new LocalStorageShadow(this._access, mainDrive.timestamp);
      callback(shadow);
    }

    purge(callback: persistence.Drive.Detached.CallbackWithShadow): void {
      var keys = this._access.keys();
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (k.charAt(0)==='/') {
          var value = this._access.remove(k);
        }
      }

      var shadow = new LocalStorageShadow(this._access, this.timestamp);
      callback(shadow);
    }

  }

  class LocalStorageShadow implements persistence.Drive.Shadow {

    constructor(private _access: LocalStorageAccess, public timestamp: number) {
    }

    write(file: string, content: string) {
      this._access.set(file, content);
      this._access.set('*timestamp', <any>this.timestamp);
    }

    forget(file: string) {
      this._access.remove(file);
    }

  }

}