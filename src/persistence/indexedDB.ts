module teapo {
  
  function getIndexedDB() {
    return typeof indexedDB === 'undefined' ? null : indexedDB;
  }
  
  export module persistence.indexedDB {

    export function detect(uniqueKey: string, callback: (detached: Drive.Detached) => void ): void {
      var indexedDBInstance = getIndexedDB();
      if (!indexedDBInstance) {
        callback(null);
        return;
      }

      var dbName = uniqueKey || 'teapo';

      var openRequest = indexedDBInstance.open(dbName, 1);
      openRequest.onerror = (errorEvent) => callback(null);

      openRequest.onupgradeneeded = (versionChangeEvent) => {
        var db: IDBDatabase = openRequest.result;
        var filesStore = db.createObjectStore('files', { keyPath: 'path' });
        var metadataStore = db.createObjectStore('metadata', { keyPath: 'property' });
      };

      openRequest.onsuccess = (event) => {
        var db: IDBDatabase = openRequest.result;

        var transaction = db.transaction('metadata');
        transaction.onerror = (errorEvent) => callback(null);

        var metadataStore = transaction.objectStore('metadata');

        var editedUTCRequest = metadataStore.get('editedUTC');

        editedUTCRequest.onerror = (errorEvent) => {
          var detached = new IndexedDBDetached(db, null);
          callback(detached);
        };

        editedUTCRequest.onsuccess = (event) => {
          var result: MetadataData = editedUTCRequest.result;
          var detached = new IndexedDBDetached(db, result && typeof result.value === 'number' ? result.value : null);
          callback(detached);
        };

      };
    }

    class IndexedDBDetached implements Drive.Detached {

      constructor(
        private _db: IDBDatabase,
        public timestamp: number) {
      }

      applyTo(mainDrive: Drive, callback: Drive.Detached.CallbackWithShadow): void {
        var transaction = this._db.transaction(['files', 'metadata'], 'readwrite');
        var metadataStore = transaction.objectStore('metadata');
        var filesStore = transaction.objectStore('files');

        var countRequest = filesStore.count();
        countRequest.onerror = (errorEvent) => {
          console.error('Could not count files store.');
          callback(null);
        };

        countRequest.onsuccess = (event) => {

          var storeCount: number = countRequest.result;

          var cursorRequest = filesStore.openCursor();
          cursorRequest.onerror = (errorEvent) => callback(null);

          // to cleanup any files which content is the same on the main drive
          var deleteList: string[] = [];
          var anyLeft = false;

          var processedCount = 0;

          cursorRequest.onsuccess = (event) => {
            var cursor: IDBCursor = cursorRequest.result;

            if (!cursor) {

              // cleaning up files whose content is duplicating the main drive
              if (anyLeft) {
                for (var i = 0; i < deleteList.length; i++) {
                  filesStore['delete'](deleteList[i]);
                }
              }
              else {
                filesStore.clear();
                metadataStore.clear();
              }

              callback(new IndexedDBShadow(this._db, this.timestamp));
              return;
            }

            if (callback.progress)
              callback.progress(processedCount, storeCount);
            processedCount++;

            var result: FileData = (<any>cursor).value;
            if (result && result.path) {

              var existingContent = mainDrive.read(result.path);
              if (existingContent === result.content) {
                deleteList.push(result.path);
              }
              else {
                mainDrive.timestamp = this.timestamp;
                mainDrive.write(result.path, result.content);
                anyLeft = true;
              }
            }

            cursor['continue']();
          }; // cursorRequest.onsuccess

        }; // countRequest.onsuccess

      }

      purge(callback: Drive.Detached.CallbackWithShadow): void {
        var transaction = this._db.transaction(['files', 'metadata'], 'readwrite');

        var filesStore = transaction.objectStore('files');
        filesStore.clear();

        var metadataStore = transaction.objectStore('metadata');
        metadataStore.clear();

        callback(new IndexedDBShadow(this._db, -1));
      }

    }

    class IndexedDBShadow implements Drive.Shadow { 

      constructor(private _db: IDBDatabase, public timestamp: number) { 
      }

      write(file: string, content: string) { 
        var transaction = this._db.transaction(['files', 'metadata'], 'readwrite');
        var filesStore = transaction.objectStore('files');
        var metadataStore = transaction.objectStore('metadata');

        // no file deletion here: we need to keep account of deletions too!
        var fileData: FileData = {
          path: file,
          content: content,
          state: null
        };

        var putFile = filesStore.put(fileData);

        var md: MetadataData = {
          property: 'editedUTC',
          value: Date.now()
        };

        metadataStore.put(md);

      }
    }


    interface FileData {
      path: string;
      content: string;
      state: string;
    }

    interface MetadataData {
      property: string;
      value: any;
    }


  }
}