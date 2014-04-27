module teapo.storage.attached.localStorage {

  export class UpdateStorage implements attached.UpdateStorage {

    private _nameCache: { [name: string]: { [name: string]: string; }; } = {};

    constructor(
      private _prefix: string,
      private _localStorage: Storage,
      private _editedKey: string) {
    }

    update(file: string, propertyName: string, value: string, callback?: (error: Error) => void) {
      var cacheLine = this._nameCache[file] || (this._nameCache[file] = {});
      var key = cacheLine[propertyName] || (cacheLine[propertyName] = this._prefix + file + '*' + propertyName);
      this._localStorage.setItem(key, value);

      this._updateEdited(Date.now());

      if (callback)
        callback(null);
    }

    remove(file: string, callback?: (error: Error) => void) {
      var removeKeys: string[] = [];
      var prefix = this._prefix + file + '*';
      for (var i = 0; i < this._localStorage.length; i++) {
        var key = this._localStorage.key(i);
        if (startsWith(key, prefix))
          removeKeys.push(key);
      }

      removeKeys.forEach(k=> this._localStorage.removeItem(k));
      delete this._nameCache[file];

      this._updateEdited(Date.now());

      if (callback)
        callback(null);
    }

    private _updateEdited(editedUTC: number){
      this._localStorage.setItem(this._editedKey, editedUTC.toString());
    }
    
  }

}