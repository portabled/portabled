module teapo.storage.attached.localStorage { 

  export class StorageAccess implements attached.StorageAccess { 
  
    private _nameCache: { [name: string]: { [name: string]: string; }; } = {};

    constructor(
      private _prefix: string,
      private _localStorage: Storage,
      private _editedKey: string) {
    }

    update(
      byFullPath: PropertiesByFullPath,
      timestamp: number,
      callback: (error: Error) => void): void {
      for (var fullPath in byFullPath) if (byFullPath.hasOwnProperty(fullPath)) {
        var propBag = byFullPath[fullPath];
        if (!propBag) {
          var cacheLine = this._nameCache[fullPath];
          if (!cacheLine) continue;

          for (var k in cacheLine) if (cacheLine.hasOwnProperty(k)) {
            var key = cacheLine[k];
            this._localStorage.removeItem(key);
          }

          delete this._nameCache[fullPath];
        }
        else {
          var cacheLine = this._nameCache[fullPath] || (this._nameCache[fullPath] = {});
          for (var k in propBag) if (propBag.hasOwnProperty(k)) {
            var key = cacheLine[k] || (cacheLine[k] = this._prefix + fullPath + '*' + k)
            var value = propBag[k];

            if (value === null || typeof value === 'undefined') {
              this._localStorage.removeItem(key);
              delete cacheLine[k];
            }
            else {
              this._localStorage.setItem(key, value);
            }
          }
        }
      }

      this._updateEdited(timestamp);

      callback(null);
    }

    read(
      fullPaths: string[],
      callback: (error: Error, byFullPath: PropertiesByFullPath) => void): void {

      var allPaths = fullPaths ? false : true;

      var byFullPath: PropertiesByFullPath = {};
      if (!allPaths) {
        for (var i = 0; i < fullPaths.length; i++) {
          byFullPath[fullPaths[i]] = {};
        }
      }

      for (var i = 0; i < this._localStorage.length; i++) {
        var key = this._localStorage.key(i);
        if (!startsWith(key, this._prefix)) continue;

        var starPos = key.indexOf('*', this._prefix.length);
        if (starPos < 0) continue;

        var fullPath = key.slice(this._prefix.length, starPos);
        var propertyName = key.slice(starPos + 1);
        var value = this._localStorage.getItem(key);

        if (!fullPaths && !byFullPath[fullPath])
          continue; // they are not interested in this one

        if (!byFullPath[fullPath])
          byFullPath[fullPath] = {};

        byFullPath[fullPath][propertyName] = value;
      }

      callback(null, byFullPath);
    }
    
    private _updateEdited(editedUTC: number) {
      this._localStorage.setItem(this._editedKey, <any>editedUTC);
    }

  }

}