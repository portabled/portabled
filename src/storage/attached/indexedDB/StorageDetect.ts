module teapo.storage.attached.indexedDB {

  export class StorageDetect implements attached.StorageDetect {

    constructor(
      private _window: { indexedDB: IDBFactory; } = window) {

    }

    detect(
      uniqueKey: string,
      callback: (error: Error, metadata: attached.StorageDetect.BootState, access: StorageAccess) => void) {

      if (!this._window.indexedDB) {
        callback(new Error('No indexedDB object exposed from window.'), null, null);
        return;
      }

      if (typeof this._window.indexedDB.open !== 'function') {
        callback(new Error('No open method exposed on indexedDB object.'), null, null);
        return;
      }

      var dbName = uniqueKey || 'teapo';

      var openRequest = this._window.indexedDB.open(dbName, 1);
      openRequest.onerror = (errorEvent) => callback(wrapErrorEvent(errorEvent, 'detectStorageAsync-open'), null, null);

      openRequest.onupgradeneeded = (versionChangeEvent) => {
        var db: IDBDatabase = openRequest.result;
        var filesStore = db.createObjectStore('files', { keyPath: 'path' });
        var metadataStore = db.createObjectStore('metadata', { keyPath: 'property' });
      };

      openRequest.onsuccess = (event) => {
        var db: IDBDatabase = openRequest.result;

        var transaction = db.transaction('metadata');
        transaction.onerror = (errorEvent) => callback(wrapErrorEvent(errorEvent, 'detectStorageAsync-openRequest.onsuccess-transaction'), null, null);

        var metadataStore = transaction.objectStore('metadata');

        var editedUTCRequest = metadataStore.get('editedUTC');

        editedUTCRequest.onerror = (errorEvent) => {
          this._proceedOpen(null, db, callback);
        };

        editedUTCRequest.onsuccess = (event) => {
          var result: MetadataData = editedUTCRequest.result;
          this._proceedOpen(result && typeof result.value === 'number' ? result.value : null, db, callback);
        };

      };

    }

    private _proceedOpen(
      editedUTC: number,
      db: IDBDatabase,
      callback: (error: Error, metadata: attached.StorageDetect.BootState, access: StorageAccess) => void) {

      var transaction = db.transaction('files');
      transaction.onerror = (errorEvent) => callback(wrapErrorEvent(errorEvent, 'load: transaction'), null, null);
      var filesStore = transaction.objectStore('files');
      var cursorRequest = filesStore.openCursor();
      cursorRequest.onerror = (errorEvent) => callback(wrapErrorEvent(errorEvent, 'load: objectStore-openCursor'), null, null);

      var filenames: string[] = [];

      cursorRequest.onsuccess = (event) => {
        var cursor: IDBCursor = cursorRequest.result;

        if (!cursor) {
          var meta = { editedUTC: editedUTC, files: filenames };
          var access = new StorageAccess(db);
          callback(null, meta, access);
          return;
        }

        var result: FileData = (<any>cursor).value;
        if (result && result.properties) {
          filenames.push(result.path);
        }

        cursor.continue();
      };
    }

  }

}