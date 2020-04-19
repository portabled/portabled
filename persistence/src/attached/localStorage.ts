function _getLocalStorage() {
  return typeof localStorage === 'undefined' || typeof localStorage.length !== 'number' ? null : localStorage;
}

namespace attached.localStorage {

  export var name = 'localStorage';

  export function detect(uniqueKey: string, callback: persistence.Drive.ErrorOrDetachedCallback): void {
    try {
      detectCore(uniqueKey, callback);
    }
    catch (error) {
      callback(error.message);
    }
  }

  function detectCore(uniqueKey: string, callback: persistence.Drive.ErrorOrDetachedCallback): void {
    var localStorageInstance = _getLocalStorage();
    if (!localStorageInstance) {
      callback('Variable localStorage is not available.');
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

    get (key: string): string | null {
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
        const str = this._localStorage.key(i);
        if (str && str.length > this._prefix.length && str.slice(0, this._prefix.length) === this._prefix)
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

    applyTo(mainDrive: persistence.Drive.Detached.DOMUpdater, callback: persistence.Drive.Detached.CallbackWithShadow): void {
      const keys = this._access.keys();
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (k.charCodeAt(0)===47 /* slash */) {
          const value = this._access.get(k);
          if (value && value.charCodeAt(0)===91 /* open square bracket [ */) {
            const cl = value.indexOf(']');
            if (cl>0 && cl < 10) {
              const encoding = value.slice(1,cl);
              const encFn = (encodings as { [encoding: string]: encodings.Encoding })[encoding];
              if (typeof encFn==='function') {
                mainDrive.write(k, value.slice(cl+1), encoding);
                break;
              }
            }
          }
          mainDrive.write(k, value, 'LF');
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

    constructor(private _access: LocalStorageAccess, public timestamp?: number) {
    }

    write(file: string, content: string, encoding: string) {
      this._access.set(file, '['+encoding+']'+content);
      this._access.set('*timestamp', <any>this.timestamp);
    }

    forget(file: string) {
      this._access.remove(file);
    }

  }

}