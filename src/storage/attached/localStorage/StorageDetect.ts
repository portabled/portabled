module teapo.storage.attached.localStorage {

  export class StorageDetect implements attached.StorageDetect {

    constructor(
      private _window: { localStorage?: Storage; } = window) {
    }

    detect(
      uniqueKey: string,
      callback: (
        error: Error,
        metadata: attached.StorageDetect.BootState,
        access: attached.StorageAccess) => void): void {
      
      var localStorage = this._window.localStorage;

      if (!localStorage) {
        callback(new Error('Browser does not expose localStorage.'), null, null);
        return;
      }

      var absentFunctions: string[] = [];
      if (typeof localStorage.length !== 'number') absentFunctions.push('length');
      if (!localStorage.getItem) absentFunctions.push('getItem');
      if (!localStorage.setItem) absentFunctions.push('setItem');
      if (!localStorage.removeItem) absentFunctions.push('removeItem');

      if (absentFunctions.length) {
        callback(new Error('Incorrect shape of localStorage (' + absentFunctions.join(', ') + ' ' + (absentFunctions.length == 1 ? 'is' : 'are') + ' absent).'), null, null);
        return;
      }
      
      var prefix = uniqueKey ? uniqueKey + '#' : 'teapo#';

      var editedUTC: number = 0;
      var editedValue = localStorage.getItem(prefix + '#edited'); // note double-hashing, to avoid file name clash
      if (editedValue) {
        try {
          editedUTC = parseInt(editedValue);
        }
        catch (parseError) { }
      }


      var access = new StorageAccess(prefix, localStorage, prefix + '#edited');

      var files: string[] = [];
      access.read(null, (error, byFullPath) => {
        if (error) { 
          callback(error, null, null);
          return;
        }

        for (var fullPath in byFullPath) if (byFullPath.hasOwnProperty(fullPath)) {
          files.push(fullPath);
        }
      });
      
      callback(null, { editedUTC: editedUTC, files: files }, access);

    }

  }
  
  
}