module teapo.storage.attached.localStorage {

  export class DetectStorage implements teapo.storage.attached.DetectStorage {

    constructor(
      private _window: { localStorage?: typeof localStorage; } = window) {
    }

    detectStorageAsync(uniqueKey: string, callback: (error: Error, load: LoadStorage) => void) {

      var localStorage = this._window.localStorage;

      if (!localStorage) {
        callback(new Error('Browser does not expose localStorage.'), null);
        return;
      }

      var absentFunctions: string[] = [];
      if (typeof localStorage.length !== 'number') absentFunctions.push('length');
      if (!localStorage.getItem) absentFunctions.push('getItem');
      if (!localStorage.setItem) absentFunctions.push('setItem');
      if (!localStorage.removeItem) absentFunctions.push('removeItem');

      if (absentFunctions.length) {
        callback(new Error('Incorrect shape of localStorage (' + absentFunctions.join(', ') + ' ' + (absentFunctions.length == 1 ? 'is' : 'are') + ' absent).'), null);
        return;
      }

      var storage = new LoadStorage(uniqueKey, localStorage);
      callback(null, storage);
    }
  }

}