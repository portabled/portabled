module persistence {

  function getLocalStorage() {
    return typeof localStorage === 'undefined' || typeof localStorage.length !== 'number' ? null : localStorage;
  }

  // is it OK&
  export module attached.localStorage {

    export var name = 'localStorage';

    export function detect(uniqueKey: string, callback: (detached: Drive.Detached) => void): void {
      var localStorageInstance = getLocalStorage();
      if (!localStorageInstance) {
        callback(null);
        return;
      }

      var access = new LocalStorageAccess(localStorageInstance, uniqueKey);
      var dt = new LocalStorageDetached(access);
      callback(dt);
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
        return this._localStorage.setItem(k, value);
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


    class LocalStorageDetached implements Drive.Detached {

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

      applyTo(mainDrive: Drive, callback: Drive.Detached.CallbackWithShadow): void {
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

      purge(callback: Drive.Detached.CallbackWithShadow): void {
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
    
    class LocalStorageShadow implements Drive.Shadow {

      constructor(private _access: LocalStorageAccess, public timestamp: number) {
      }

      write(file: string, content: string) {
        this._access.set(file, content);
        this._access.set('*timestamp', <any>this.timestamp);
      }

    }

  }
  
}