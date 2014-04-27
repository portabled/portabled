module teapo.storage.attached.localStorage {

  export class LoadStorage implements attached.LoadStorage {

    private _prefix: string;
    editedUTC: number;

    constructor(
      uniqueKey: string,
      private _localStorage: Storage) {

      this._prefix = uniqueKey ? uniqueKey + '#' : 'teapo#';

      var editedValue = this._localStorage.getItem(this._prefix + '#edited');
      if (editedValue) {
        try {
          this.editedUTC = parseInt(editedValue);
        }
        catch (parseError) { }
      }

    }

    load(recipient: LoadStorageRecipient) {

      var docs: { [name: string]: { [name: string]: string; } } = {};

      for (var i = 0; i < this._localStorage.length; i++) {
        var key = this._localStorage.key(i);
        if (!startsWith(key, this._prefix)) continue;

        var starPos = key.indexOf('*', this._prefix.length);
        if (starPos < 0) continue;

        var filename = key.slice(this._prefix.length, starPos);
        var propertyName = key.slice(starPos + 1);
        var value = this._localStorage.getItem(key);

        var doc = docs[filename] || (docs[filename] = {});
        doc[propertyName] = value;
      }

      for (var k in docs) if (docs.hasOwnProperty(k)) {
        recipient.file(k, docs[k]);
      }

      recipient.completed(new UpdateStorage(this._prefix, this._localStorage, this._prefix + '#edited'));
    }

    migrate(
      editedUTC: number,
      filesByName: { [name: string]: { [name: string]: string; }; },
      callback: (error: Error, updater: attached.UpdateStorage) => void) {

      // will remove all unneeded entries after collecting
      var validKeys: { [name: string]: boolean; } = {};

      // add entries to localStorage from filesByName
      for (var file in filesByName) if (filesByName.hasOwnProperty(file)) {
        var properties = filesByName[file];
        for (var propertyName in properties) if (properties.hasOwnProperty(propertyName)) {
          var value = properties[propertyName];

          var key = this._prefix + file + '*' + propertyName;
          this._localStorage.setItem(key, value);
          validKeys[key] = true;
        }
      }

      // clean entries that don't match filesByName
      var removeKeys: string[] = [];
      for (var i = 0; i < this._localStorage.length; i++) {
        var key = this._localStorage.key(i);
        if (!validKeys[key])
          removeKeys.push(key);
      }

      removeKeys.forEach(rk=> this._localStorage.removeItem(rk));

      var editedKey = this._prefix + '#edited';
      this._localStorage.setItem(editedKey, editedUTC.toString());

      callback(null, new UpdateStorage(this._prefix, this._localStorage, editedKey));
    }

  }

}