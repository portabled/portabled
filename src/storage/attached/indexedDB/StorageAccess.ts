module teapo.storage.attached.indexedDB {

  export class StorageAccess implements attached.StorageAccess {

    constructor(private _db: IDBDatabase) {
    }

    update(
      byFullPath: PropertiesByFullPath,
      timestamp: number,
      callback: (error: Error) => void): void {

      var transaction = this._db.transaction(['files', 'metadata'], 'readwrite');
      transaction.onerror = (errorEvent) => callback(wrapErrorEvent(errorEvent, 'update: transaction'));
      var filesStore = transaction.objectStore('files');
      
      var outstandingRequests = 1;

      function oneError(errorEvent: ErrorEvent, moreDescription) {
        if (!outstandingRequests) return;

        outstandingRequests = 0;
        callback(wrapErrorEvent(errorEvent, moreDescription));
      }

      function oneCompleted() {
        if (!outstandingRequests) return;

        outstandingRequests--;
        if (!outstandingRequests)
          callback(null);
      }

      for (var fullPath in byFullPath) if (byFullPath.hasOwnProperty(fullPath)) {

        var pbag = byFullPath[fullPath];

        if (!pbag) {
          var deleteRequest = filesStore['delete'](fullPath);
          outstandingRequests++;

          deleteRequest.onerror = (errorEvent) => oneError(errorEvent, 'update: objectStore(files).delete(' + fullPath+')');
          deleteRequest.onsuccess = (event) => {
            oneCompleted();
          };
        }
        else {
          var getRequest = filesStore.get(fullPath);
          outstandingRequests++;

          getRequest.onerror = (errorEvent) => oneError(errorEvent, 'update: objectStore(files).delete(' + fullPath + ')');
          getRequest.onsuccess = (event) => {

            var fileData: FileData = getRequest.result || { path: fullPath, properties: {} };

            var properties = fileData.properties || (fileData.properties = {});
            for (var p in pbag) if (pbag.hasOwnProperty(p)) {
              var v = pbag[p];
              if (v === null || typeof v === 'undefined')
                delete properties[p];
              else
                properties[p] = v;
            }

            var putFile = filesStore.put(fileData);
            getRequest.onerror = (errorEvent) => oneError(errorEvent, 'update: objectStore(files).put(' + fullPath + ')');
            putFile.onsuccess = (event) =>
              this._updateEditedUTC(
                timestamp,
                transaction,
                (errorEvent) => {
                  if (errorEvent)
                    oneError(errorEvent, 'update: _updateEditedUTC');
                  else
                    oneCompleted();
                });
          };
        }
        
      }

      oneCompleted();
    }

    read(
      fullPaths: string[],
      callback: (error: Error, byFullPath: PropertiesByFullPath) => void): void {

      var transaction = this._db.transaction('files');
      transaction.onerror = (errorEvent) => callback(wrapErrorEvent(errorEvent, 'read: transaction'), null);
      var filesStore = transaction.objectStore('files');

      var result: PropertiesByFullPath = {};

      if (fullPaths) {
        var outstandingRequests = 1;

        function oneError(errorEvent: ErrorEvent, moreDescription) {
          if (!outstandingRequests) return;

          outstandingRequests = 0;
          callback(wrapErrorEvent(errorEvent, moreDescription), null);
        }

        function oneCompleted(fullPath: string, propBag: any) {
          if (!outstandingRequests) return;

          if (fullPath) {
            result[fullPath] = propBag;
          }
          
          outstandingRequests--;
          if (!outstandingRequests)
            callback(null, result);
        }

        var readFileProperties = (fullPath: string) => {
          var getRequest = filesStore.get(fullPath);
          getRequest.onerror = (errorEvent) => oneError(errorEvent, 'read: get(' + fullPath + ')');
          getRequest.onsuccess = (event) => {

            var fileData: FileData = getRequest.result;

            oneCompleted(fullPath, fileData ? fileData.properties : null);
          };
        };

        for (var i = 0; i < fullPaths.length; i++) {
          readFileProperties(fullPaths[i]);
        }
      }
      else {
        var cursorRequest = filesStore.openCursor();
        cursorRequest.onerror = (errorEvent) => callback(
          wrapErrorEvent(errorEvent, 'read: objectStore-openCursor'),
          null);


        cursorRequest.onsuccess = (event) => {
          var cursor: IDBCursor = cursorRequest.result;

          if (!cursor) {
            callback(null, result);
            return;
          }

          var rec: FileData = (<any>cursor).value;
          if (rec && rec.properties) {
            result[rec.path] = rec.properties;
          }

          cursor.continue();
        };
      }

    
    }


    private _updateEditedUTC(now: number, transaction: IDBTransaction, callback: (errorEvent: ErrorEvent) => void) {
      var metadataStore = transaction.objectStore('metadata');

      var metadataData = { property: 'editedUTC', value: now };
      var putMetadata = metadataStore.put(metadataData);
      putMetadata.onerror = (errorEvent) => callback(errorEvent);
      putMetadata.onsuccess = (event) => callback(null);
    }

  }

  
}