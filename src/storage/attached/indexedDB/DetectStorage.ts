module teapo.storage.attached.indexedDB {

  export class DetectStorage implements attached.DetectStorage {

    constructor(
      private _window: { indexedDB: IDBFactory; } = window) {

    }

    detectStorageAsync(uniqueKey: string, callback: (error: Error, load: LoadStorage) => void) {

      if (!this._window.indexedDB) {
        callback(new Error('No indexedDB object exposed from window.'), null);
        return;
      }

      if (typeof this._window.indexedDB.open !== 'function') {
        callback(new Error('No open method exposed on indexedDB object.'), null);
        return;
      }

      var dbName = uniqueKey || 'teapo';

      var openRequest = this._window.indexedDB.open(dbName, 1);
      openRequest.onerror = (errorEvent) => callback(wrapErrorEvent(errorEvent, 'detectStorageAsync-open'), null);

      openRequest.onupgradeneeded = (versionChangeEvent) => {
        var db: IDBDatabase = openRequest.result;
        var filesStore = db.createObjectStore('files', { keyPath: 'path' });
        var metadataStore = db.createObjectStore('metadata', { keyPath: 'property' });
      };

      openRequest.onsuccess = (event) => {
        var db: IDBDatabase = openRequest.result;

        var transaction = db.transaction('metadata');
        transaction.onerror = (errorEvent) => callback(wrapErrorEvent(errorEvent, 'detectStorageAsync-openRequest.onsuccess-transaction'), null);

        var metadataStore = transaction.objectStore('metadata');

        var editedUTCRequest = metadataStore.get('editedUTC');
        editedUTCRequest.onerror = (errorEvent) => {
          callback(null, new LoadStorage(null, db));
        };

        editedUTCRequest.onsuccess = (event) => {
          var result: MetadataData = editedUTCRequest.result;
          callback(null, new LoadStorage(result && typeof result.value === 'number' ? result.value : null, db));
        };

      };

    }

  }

}