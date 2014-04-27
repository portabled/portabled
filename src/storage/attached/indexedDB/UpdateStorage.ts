module teapo.storage.attached.indexedDB { 

  export class UpdateStorage implements attached.UpdateStorage { 

    constructor(private _db: IDBDatabase) { 
    }
    
    update(file: string, property: string, value: string, callback?: (error: Error) => void) {
      var transaction = this._db.transaction(['files', 'metadata'], 'readwrite');
      transaction.onerror = (errorEvent) => callback(wrapErrorEvent(errorEvent, 'update: transaction'));
      var filesStore = transaction.objectStore('files');
      var getFile = filesStore.get(file);
      getFile.onerror = (errorEvent) => callback(wrapErrorEvent(errorEvent, 'update: objectStore(files).get('+file+')'));
      getFile.onsuccess = (event) => {
        var fileData: FileData = getFile.result || { path: file, properties: {} };
        var properties = fileData.properties || (fileData.properties = {});
        properties[property] = value;

        var putFile = filesStore.put(fileData);
        putFile.onerror = (errorEvent) => callback(wrapErrorEvent(errorEvent, 'update: objectStore(files).get(' + file + ')-put('+property+','+value+')'));
        putFile.onsuccess = (event) =>
          this._updateEditedUTC(
            Date.now(),
            transaction,
            (errorEvent) => callback(wrapErrorEvent(errorEvent, 'update: _updateEditedUTC')));
      };
    }

    remove(file: string, callback?: (error: Error) => void) { 
      var transaction = this._db.transaction(['files', 'metadata'], 'readwrite');
      transaction.onerror = (errorEvent) => callback(wrapErrorEvent(errorEvent, 'update: transaction'));
      var filesStore = transaction.objectStore('files');
      var deleteFile = filesStore['delete'](file);
      deleteFile.onerror = (errorEvent) => callback(wrapErrorEvent(errorEvent, 'update: objectStore(files).get(' + file + ')'));
      deleteFile.onsuccess = (event) =>
        this._updateEditedUTC(
          Date.now(),
          transaction,
          (errorEvent) => callback(wrapErrorEvent(errorEvent, 'update: _updateEditedUTC')));
    }

    private _updateEditedUTC(now: number, transaction: IDBTransaction, callback: (errorEvent: ErrorEvent) => void) {
      var metadataStore = transaction.objectStore('metadata');

      var metadataData = { property: 'editedUTC', value: Date.now() };
      var putMetadata = metadataStore.put(metadataData);
      putMetadata.onerror = (errorEvent) => callback(errorEvent);
      putMetadata.onsuccess = (event) => callback(null);
    }
  
  }

}