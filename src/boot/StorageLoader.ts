module teapo.boot {

  export class StorageLoader {

    private _domStorage: storage.attached.dom.LoadStorage;

    private _callbacks: StorageLoader.Callbacks = null;

    private _indexedDBDetectCompleted = false;
    private _webSqlDetectCompleted = false;
    private _persistenceName: string = null;
    private _persistence: storage.attached.LoadStorage = null;

    constructor(
      private _dom: Dom,
      private _storageElement: HTMLElement,
      private _uniqueKey: string) {
    }

    loadStorage(callbacks: StorageLoader.Callbacks) {
      if (this._callbacks)
        throw new Error('Cannot load storage twice.');

      this._callbacks = callbacks;

      try {
        this._domStorage =
        new storage.attached.dom.DetectStorage(this._storageElement, this._dom.documenOverride).
          detectStorageSync();
      }
      catch (err) {
        this._callbacks.detectionComplete(err, null, null, null);
        return;
      }

      var detectIndexedDB = new storage.attached.indexedDB.DetectStorage();
      var detectWebSQL = new storage.attached.webSQL.DetectStorage();

      detectIndexedDB.detectStorageAsync(this._uniqueKey, (error, load) => {
        this._indexedDBDetectCompleted = true;

        if (error) {
          if (!this._webSqlDetectCompleted)
            return; // wait for webSQL, it can still succeed

          // revert to webSQL results
          this._detectCompleted();
        }
        else {
          this._persistence = load;
          this._persistenceName = 'indexedDB';

          this._detectCompleted();
        }
      });

      detectWebSQL.detectStorageAsync(this._uniqueKey, (error, load) => {
        this._webSqlDetectCompleted = true;

        if (this._persistence)
          return;

        this._persistence = load;
        if (this._indexedDBDetectCompleted)
          this._detectCompleted();
      });
    }

    private _detectCompleted() {
      var loadingFromPersistence = this._persistence && this._persistence.editedUTC > this._domStorage.editedUTC;

      var sourceLoad = loadingFromPersistence ? this._persistence : this._domStorage;
      var targetLoad = loadingFromPersistence ? this._domStorage : this._persistence;

      this._callbacks.detectionComplete(
        null,
        this._persistenceName,
        sourceLoad.editedUTC,
        loadingFromPersistence);

      var byFullPath: { [fullPath: string]: { [property: string]: string; }; } = {};
      var totalFileCount = 0;
      var loadedFileCount = 0;
      sourceLoad.load({
        files: (fileCount) => {
          totalFileCount = fileCount;
        },
        file: (fullPath: string, values: { [name: string]: string; }) => {
          byFullPath[fullPath] = values;
          loadedFileCount++;
          this._callbacks.loadProgress(totalFileCount || 140, loadedFileCount, fullPath);
        },
        completed: (sourceUpdater: storage.attached.UpdateStorage) => {

          if (!targetLoad) {
            this._callbacks.loadComplete(
              null, byFullPath,
              sourceUpdater,
              null);
            return;
          }

          targetLoad.migrate(sourceLoad.editedUTC, byFullPath, (err, targetUpdater) => {
            if (err) {
              this._callbacks.loadComplete(
                err,
                byFullPath,
                null,
                null);
            }
            else {
              this._callbacks.loadComplete(
                null,
                byFullPath,
                loadingFromPersistence ? targetUpdater : sourceUpdater,
                loadingFromPersistence ? sourceUpdater : targetUpdater);
            }
          });
        },
        failed: (error: Error) => {
          this._callbacks.loadComplete(
            error,
            byFullPath,
            null,
            null);
        }

      });
    }

  }

  export module StorageLoader {

    export interface Callbacks {

      detectionComplete(
        err: Error,
        persistenceName: string,
        editedUTC: number,
        loadingFromPersistence: boolean): void;

      loadProgress(
        totalFileCount: number,
        loadedFileCount: number,
        lastLoadedFilename: string);

      loadComplete(
        err: Error,
        byFullPath: { [fullPath: string]: { [property: string]: string; }; },
        domUpdater: storage.attached.UpdateStorage,
        persistenceUpdater: storage.attached.UpdateStorage);

    }

  }

}