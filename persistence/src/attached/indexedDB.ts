//declare var onerror;

function _getIndexedDB() {
  return typeof indexedDB === 'undefined' || typeof indexedDB.open !== 'function' ? null : indexedDB;
}

namespace attached.indexedDB {

  export var name = 'indexedDB';

  export function detect(uniqueKey: string, callback: (error: string, detached: persistence.Drive.Detached) => void): void {
    try {

      // Firefox fires global window.onerror
      // when indexedDB.open is called in private mode
      // (even though it still reports failure in request.onerror and DOES NOT throw anything)
      var needsFirefoxPrivateModeOnerrorWorkaround =
          typeof document !== 'undefined' && document.documentElement && document.documentElement.style
          && 'MozAppearance' in document.documentElement.style;

      if (needsFirefoxPrivateModeOnerrorWorkaround) {
        try {

          detectCore(uniqueKey, function(error, detached) {
            callback(error, detached);

          	// the global window.onerror will fire AFTER request.onerror,
            // so here we temporarily install a dummy handler for it
            var tmp_onerror = onerror;
            onerror = function() { };
            setTimeout(function() {
              // restore on the next 'beat'
            	onerror = tmp_onerror;
            }, 1);

          });

        }
        catch (err) {
          callback(err.message, null);
        }
      }
      else {

          detectCore(uniqueKey, callback);
      }

    }
    catch (error) {
      callback(error.message, null);
    }
  }

  function detectCore(uniqueKey: string, callback: (error: string, detached: persistence.Drive.Detached) => void): void {

    var indexedDBInstance = _getIndexedDB();
    if (!indexedDBInstance) {
      callback('Variable indexedDB is not available.', null);
      return;
    }

    var dbName = uniqueKey || 'portabled';

    var openRequest = indexedDBInstance.open(dbName, 1);

    openRequest.onerror = (errorEvent) => callback('Opening database error: '+getErrorMessage(errorEvent), null);

    openRequest.onupgradeneeded = createDBAndTables;

    openRequest.onsuccess = (event) => {
      var db: IDBDatabase = openRequest.result;

      try {
        var transaction = db.transaction(['files', 'metadata']);
        // files mentioned here, but not really used to detect
        // broken multi-store transaction implementation in Safari

        transaction.onerror = (errorEvent) => callback('Transaction error: '+getErrorMessage(errorEvent), null);

        var metadataStore = transaction.objectStore('metadata');
        var filesStore = transaction.objectStore('files');
        var editedUTCRequest = metadataStore.get('editedUTC');
      }
      catch (getStoreError) {
        callback('Cannot open database: '+getStoreError.message, null);
        return;
      }

      if (!editedUTCRequest) {
        callback('Request for editedUTC was not created.', null);
        return;
      }

      editedUTCRequest.onerror = (errorEvent) => {
        var detached = new IndexedDBDetached(db, transaction, null);
        callback(null, detached);
      };

      editedUTCRequest.onsuccess = (event) => {
        var result: MetadataData = editedUTCRequest.result;
        var detached = new IndexedDBDetached(db, transaction, result && typeof result.value === 'number' ? result.value : null);
        callback(null, detached);
      };
    }


    function createDBAndTables() {
      var db: IDBDatabase = openRequest.result;
      var filesStore = db.createObjectStore('files', { keyPath: 'path' });
      var metadataStore = db.createObjectStore('metadata', { keyPath: 'property' })
      }
  }

  function getErrorMessage(event): string {
    if (event.message) return event.message;
    else if (event.target) return event.target.errorCode;
    return event+'';
  }


  class IndexedDBDetached implements persistence.Drive.Detached {

    constructor(
      private _db: IDBDatabase,
      private _transaction: IDBTransaction,
      public timestamp: number) {

      // ensure the same transaction is used for applyTo/purge if possible
      // -- but not if it's completed
      if (this._transaction) {
        this._transaction.oncomplete = () => {
          this._transaction = null;
        };
      }
    }

    applyTo(mainDrive: persistence.Drive.Detached.DOMUpdater, callback: persistence.Drive.Detached.CallbackWithShadow): void {
      var transaction = this._transaction || this._db.transaction(['files', 'metadata']); // try to reuse the original opening _transaction
      var metadataStore = transaction.objectStore('metadata');
      var filesStore = transaction.objectStore('files');

      var countRequest = filesStore.count();
      countRequest.onerror = (errorEvent) => {
        if (typeof console!=='undefined' && console && typeof console.error==='function')
          console.error('Could not count files store: ', errorEvent);
        callback(new IndexedDBShadow(this._db, this.timestamp));
      };

      countRequest.onsuccess = (event) => {

        try {

          var storeCount: number = countRequest.result;

          var cursorRequest = filesStore.openCursor();
          cursorRequest.onerror = (errorEvent) => {
            if (typeof console!=='undefined' && console && typeof console.error==='function')
              console.error('Could not open cursor: ', errorEvent);
            callback(new IndexedDBShadow(this._db, this.timestamp));
          };

          var processedCount = 0;

          cursorRequest.onsuccess = (event) => {

            try {
              var cursor: IDBCursor = cursorRequest.result;

              if (!cursor) {
                callback(new IndexedDBShadow(this._db, this.timestamp));
                return;
              }

              if (callback.progress)
                callback.progress(processedCount, storeCount);
              processedCount++;

              var result: FileData = (<any>cursor).value;
              if (result && result.path) {
                mainDrive.timestamp = this.timestamp;
                mainDrive.write(result.path, result.content);
              }

              cursor['continue']();

            }
            catch (cursorContinueSuccessHandlingError) {
              var message = 'Failing to process cursor continue';
              try {
                message += ' ('+processedCount+' of '+storeCount+'): ';
              }
              catch (ignoreDiagError) {
                message += ': ';
              }

              if (typeof console!=='undefined' && console && typeof console.error==='function')
                console.error(message, cursorContinueSuccessHandlingError);
              callback(new IndexedDBShadow(this._db, this.timestamp));
            }

          }; // cursorRequest.onsuccess

        }
        catch (cursorCountSuccessHandlingError) {

          var message = 'Failing to process cursor count';
          try {
            message += ' ('+countRequest.result+'): ';
          }
          catch (ignoreDiagError) {
            message += ': ';
          }

          if (typeof console!=='undefined' && console && typeof console.error==='function')
            console.error(message, cursorCountSuccessHandlingError);
          callback(new IndexedDBShadow(this._db, this.timestamp));
        }

      }; // countRequest.onsuccess

    }

    purge(callback: persistence.Drive.Detached.CallbackWithShadow): void {
      if (this._transaction) {
        this._transaction = null;
        setTimeout(() => { // avoid being in the original transaction
          this._purgeCore(callback);
        }, 1);
      }
      else {
        this._purgeCore(callback);
      }
    }

    private _purgeCore(callback: persistence.Drive.Detached.CallbackWithShadow) {
      var transaction = this._db.transaction(['files', 'metadata'], 'readwrite');

      var filesStore = transaction.objectStore('files');
      filesStore.clear();

      var metadataStore = transaction.objectStore('metadata');
      metadataStore.clear();

      callback(new IndexedDBShadow(this._db, -1));
    }

  }


  class IndexedDBShadow implements persistence.Drive.Shadow {

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

    forget(file: string) {
      var transaction = this._db.transaction(['files'], 'readwrite');
      var filesStore = transaction.objectStore('files');
      filesStore['delete'](file);
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
