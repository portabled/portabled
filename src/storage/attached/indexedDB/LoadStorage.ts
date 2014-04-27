module teapo.storage.attached.indexedDB {
  
  export class LoadStorage implements attached.LoadStorage {
    
    constructor(
      public editedUTC: number,
      private _db: IDBDatabase){
    }

    load(recipient: attached.LoadStorageRecipient) {
      var transaction = this._db.transaction('files');
      transaction.onerror = (errorEvent) => recipient.failed(wrapErrorEvent(errorEvent, 'load: transaction'));
      var filesStore = transaction.objectStore('files');
      var cursorRequest = filesStore.openCursor();
      cursorRequest.onerror = (errorEvent) => recipient.failed(wrapErrorEvent(errorEvent, 'load: objectStore-openCursor'));
      cursorRequest.onsuccess = (event) => {
        var cursor: IDBCursor = cursorRequest.result;

        if (!cursor) {
          recipient.completed(new UpdateStorage(this._db));
          return;
        }

        var result: FileData = (<any>cursor).value;
        if (result && result.properties) {
          recipient.file(result.path, result.properties);
        }

        cursor['continue']();
      };
    }
    
    migrate(
      editedUTC: number,
      filesByName: { [name: string]: { [name: string]: string; }; },
      callback: (error: Error, updater: attached.UpdateStorage) => void){

      var transaction = this._db.transaction(['files', 'metadata'], 'readwrite');
      transaction.onerror = (errorEvent) => callback(wrapErrorEvent(errorEvent, 'migrate: transaction'), null);
      var filesStore = transaction.objectStore('files');
      var clearFiles = filesStore.clear(); 
      clearFiles.onerror = (errorEvent) => callback(wrapErrorEvent(errorEvent, 'migrate: objectStore(files)-clear'), null);
      clearFiles.onsuccess = (event) => {
        var metadataStore = transaction.objectStore('metadata');
        var clearMetadata = metadataStore.clear();
        clearMetadata.onerror = (errorEvent) => callback(wrapErrorEvent(errorEvent, 'migrate: objectStore(files)/clear-objectStore(metadata)-clear'), null);
        clearMetadata.onsuccess = (event) => {

          var putEditedUTC = metadataStore.put({ property: 'editedUTC', value: editedUTC });
          putEditedUTC.onerror = (errorEvent) => callback(
            wrapErrorEvent(errorEvent, 'migrate: objectStore(files)/clear-objectStore(metadata)/clear-put(' + editedUTC+')'),
            null);
          putEditedUTC.onsuccess = (event) => {
            var filenames: string[] = [];
            for (var k in filesByName) if (filesByName.hasOwnProperty(k)) { 
              filenames.push(k);
            }

            if (!filenames.length) {
              var update = new UpdateStorage(this._db);
              callback(null, update);
              return;
            }

            var completedFiles = 0;
            var anyError = false;
            filenames.forEach(file => {
              if (anyError) return;

              var fileData = { path: file, properties: filesByName[file] };
              var putFile = filesStore.put(fileData);
              putFile.onerror = (errorEvent) => {
                if (anyError) return;
                anyError = true;                
                callback(wrapErrorEvent(errorEvent, ''), null);
              }
              putFile.onsuccess = (event) => {
                completedFiles++;

                if (completedFiles === filenames.length) { 
                  var update = new UpdateStorage(this._db);
                  callback(null, update);
                }
              }
            });
          };
        };
      };

    }

  }
  
}