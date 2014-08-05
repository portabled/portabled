module teapo.boot {

  export class BootController {

    static initialProgress = 0.15;
    static domLoadProgressAmount = 0.3;
    static migrateProgressAmount = 0.3;

    private _layout: BootLayout = null;
    private _layoutAdded = false;
    private _updateProgressInterval = 0;

    private _storageElem: HTMLElement = null;
    private _totalFileCount = -1;

    private _storageLoader: StorageLoader = null;
    private _persistenceName: string = null;
    private _editedUTC: number = 0;
    private _loadingFromPersistence = false;

    private _lastReportedStorageProgress = 0;

    constructor(public dom = new Dom()) {
    }

    startBooting() {
      this._layout = new BootLayout(this.dom);

      this._layout.setTitle('Loading teapo...');
      this._layout.setSmallProgressText('Downloading app...');
      this._layout.setProgressRatio(BootController.initialProgress);
      this._layout.setProgressColor('gold');

      this._checkBootLayoutAdded();

      this._updateProgressInterval = setInterval(() => this._updateDomLoadingProgress(), 50);

      Dom.addEventListener(window, 'load', () => this._domCompleted());
    }

    reportError(error: any) {
      alert(error);
    }

    private _updateDomLoadingProgress() {
      this._checkBootLayoutAdded();

      var wasDomStorageDiscovered = this._storageElem;
      this._discoverDomStorage();
      if (this._storageElem && !wasDomStorageDiscovered) {
        this._layout.setSmallProgressText('Downloading data...');
        this._layout.setProgressColor('green');
      }

      if (this._totalFileCount > 0) {

        this._layout.setProgressRatio(
          BootController.initialProgress +
          BootController.domLoadProgressAmount * (this._storageElem.children.length / this._totalFileCount));

        var lastFileName = this._storageElem.children.length ?
          this._storageElem.children[this._storageElem.children.length - 1].getAttribute('data-teapo-path') : null;

        this._layout.setSmallProgressText('Downloading ' + (lastFileName ? ' embedded file "' + lastFileName + '"' : ' data') + ': ' + this._storageElem.children.length + ' of ' + this._totalFileCount + '...');
      }
    }

    private _domCompleted() {
      clearInterval(this._updateProgressInterval);

      this._checkBootLayoutAdded();
      this._discoverDomStorage();


      this._layout.setProgressRatio(BootController.initialProgress + BootController.domLoadProgressAmount);
      this._layout.setProgressColor('gray');
      this._layout.setSmallProgressText('Initializing files...');

      this._startLoadingStorage();

    }

    private _checkBootLayoutAdded() {
      if (!this._layoutAdded) {
        if (document.body) {
          document.body.appendChild(this._layout.container);
          this._layoutAdded = true;
        }
      }
    }

    private _discoverDomStorage() {
      if (!this._storageElem) {
        this._storageElem = this.dom.getElementById('data-teapo-storage');
        if (!this._storageElem)
          return;

        try {
          this._totalFileCount = parseInt(this._storageElem.getAttribute('data-teapo-file-count'));
        }
        catch (totalFileCountParsingError) {
          // TODO: report out
        }
      }
    }

    private _startLoadingStorage() {

      if (!this._storageElem) {
        this.reportError('No data embedded in this file.');
        this._storageElem = this.dom.createElement('div', { display: 'none' }, this.dom.documenOverride.body);
      }

      var uniqueKey = this._getUniqueKey();

      this._storageLoader = new StorageLoader(this.dom, this._storageElem, uniqueKey);
      this._storageLoader.loadStorage({
        detectionComplete: (err, persistenceName, editedUTC, loadingFromPersistence) =>
          this._storageDetectionComplete(err, persistenceName, editedUTC, loadingFromPersistence),
        loadProgress: (totalFileCount, loadedFileCount, lastLoadedFileName) =>
          this._storageLoadProgress(totalFileCount, loadedFileCount, lastLoadedFileName),
        loadComplete: (err, byFullPath, domUpdater, persistenceUpdater) =>
          this._storageLoaded(err, byFullPath, domUpdater, persistenceUpdater)
      });

    }

    private _storageDetectionComplete(
      err: Error,
      persistenceName: string,
      editedUTC: number,
      loadingFromPersistence) {
      if (err) {
        alert('Detection ' + err.message);
        return;
      }

      this._persistenceName = persistenceName;
      this._editedUTC = editedUTC;
      this._loadingFromPersistence = loadingFromPersistence;

      this._layout.setProgressColor('goldenrod');
      this._layout.setSmallProgressText(
        'Loading files from ' +
        (loadingFromPersistence ? persistenceName + ' to dom' : 'dom' + (persistenceName ? ' to ' + persistenceName : '')) +
        (editedUTC ? ' edited on ' + new Date(editedUTC) : '') +
        '...');
    }

    private _storageLoadProgress(
      totalFileCount: number,
      loadedFileCount: number,
      lastLoadedFileName: string) {

      this._totalFileCount = loadedFileCount;


      var now = dateNow();
      if (now - this._lastReportedStorageProgress < 200) return; // don't update DOM too often
      this._lastReportedStorageProgress = now;


      this._layout.setProgressColor('green');
      this._layout.setSmallProgressText('Loading "' + lastLoadedFileName + '" ' + loadedFileCount + ' of ' + totalFileCount + '...');
      this._layout.setProgressRatio(
        BootController.initialProgress + BootController.domLoadProgressAmount +
        BootController.migrateProgressAmount * loadedFileCount / totalFileCount);
    }

    private _storageLoaded(
      err: Error,
      byFullPath: { [fullPath: string]: { [property: string]: string; }; },
      domUpdater: storage.attached.UpdateStorage,
      persistenceUpdater: storage.attached.UpdateStorage) {
      if (err) {
        alert('Loading ' + err.message);
        return;
      }

      this._totalFileCount = 0;
      for (var k in byFullPath) if (byFullPath.hasOwnProperty(k)) {
        this._totalFileCount++;
      }

      var body = this.dom.documenOverride.body;
      var removeElements: HTMLElement[] = [];
      for (var i = 0; i < body.children.length; i++) {
        var elem = <HTMLElement>body.children[i];
        if (elem === this._layout.container) continue;

        if (elem.style && elem.style.display !== 'none' && elem.offsetWidth) {
          removeElements.push(elem);
        }
      }

      for (var i = 0; i < removeElements.length; i++) {
        body.removeChild(removeElements[i]);
      }

    }

    private _startLoadingDocs() {

      var body = this.dom.documenOverride.body;

      var loadedText = 'Loaded ' + this._totalFileCount + ' files from ' +
        (this._loadingFromPersistence ? this._persistenceName + ' to dom' : 'dom' + (this._persistenceName ? ' to ' + this._persistenceName : '')) +
        (this._editedUTC ? ' edited on ' + new Date(this._editedUTC) : '') + '.';

      this._layout.setSmallProgressText(loadedText);

      var newLayout = new layout.MainLayout(this.dom);

      Dom.setText(newLayout.leftContainer, loadedText);
      newLayout.rightContainer.style.background = 'gold';

      body.appendChild(newLayout.container);

      setTimeout(() => {
        newLayout.readjustSize();

        body.removeChild(this._layout.container);

        addEventListener(window, 'keydown', (evt: KeyboardEvent) => {
          if (evt.keyCode === 83 && evt.ctrlKey) {
            saveCurrentHtmlAsIs();
            if (evt.preventDefault) evt.preventDefault();
            if ('cancelBubble' in evt) evt.cancelBubble = true;
          }
        });
      }, 10);

    }

    private _getUniqueKey() {
      var key = window.location.pathname;

      key = key.split('?')[0];
      key = key.split('#')[0];

      key = key.toLowerCase();

      var ignoreSuffix = '/index.html';

      if (key.length > ignoreSuffix.length && key.slice(key.length - ignoreSuffix.length) === ignoreSuffix)
        key = key.slice(0, key.length - ignoreSuffix.length);

      key += '*';

      return key;
    }

  }

}