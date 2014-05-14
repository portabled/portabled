module teapo {

  /**
   * Initialize storage loading the state from HTML DOM, WebSQL
   * and getting everything in a running state.
   * The API is asynchronous, provide handler.documentStorageCreated function
   * to receive the callback. 
   * @param handler All necessary parameters and overrides
   * for instantiating DocumentStorage.
   */
  export function openStorage(handler: DocumentStorageHandler, forceLoadFromDom = false): void {

    var storage = new RuntimeDocumentStorage(handler, forceLoadFromDom);
  }


  interface ExecuteSqlDelegate {
    (sqlStatement: string,
      arguments: any[],
      callback: (transaction: SQLTransaction, result: SQLResultSet) => void,
      errorCallback: (transaction: SQLTransaction, resultSet: SQLError) => void): void;
  }

  class RuntimeDocumentStorage implements DocumentStorage {
    document: typeof document = null;

    editedUTC: number = null;
    _metadataElement: HTMLScriptElement = null;

    private _metadataProperties: any = null;
    private _docByPath: { [name: string]: RuntimeDocumentState; } = {};

    private _executeSql: ExecuteSqlDelegate = null;
    private _insertMetadataSql = '';
    private _updateMetadataSql = '';
    
    _savingCache = new FileSavingCache();

    savingFiles = this._savingCache.savingFiles;
    
    constructor(
      public handler: DocumentStorageHandler,
      forceLoadFromDom: boolean) {

      this.document = this.handler.document ? this.handler.document : document;

      var pathElements = this._scanDomScripts();
      if (!this._metadataElement) {
        this._metadataElement = appendScriptElement(this.document);
        this._metadataElement.id = 'storageMetadata';
      }

      var openDatabase = this.handler.openDatabase || getOpenDatabase();
      if (typeof openDatabase === 'function') {
        this._initFromOpenDatabase(openDatabase, forceLoadFromDom, pathElements);
      }
      else {
        this._loadInitialStateFromDom(pathElements);
      }
    }

    documentNames(): string[] {
      return Object.keys(this._docByPath);
    }

    getDocument(fullPath: string): DocumentState {
      return this._docByPath[fullPath];
    }

    createDocument(fullPath: string): DocumentState {
      if (this._docByPath[fullPath])
        throw new Error('File already exists: ' + fullPath + '.');

      var s = appendScriptElement(document);
      s.setAttribute('data-path', fullPath);

      var docState = new RuntimeDocumentState(
        fullPath,
        s,
        this._executeSql,
        this,
        null);

      this._docByPath[fullPath] = docState;

      return docState;
    }

    removeDocument(fullPath: string): DocumentState {
      var docState = this._docByPath[fullPath];

      if (docState) {
        docState._removeStorage();
        delete this._docByPath[fullPath];
      }

      return docState;
    }

    getProperty(name: string): string {
      return this._metadataProperties[name || ''];
    }

    setProperty(name: string, value: string): void {
      name = name || '';
      if (value === this._metadataProperties[name])
        return;

      var existingProperty = this._metadataProperties.hasOwnProperty(name);
      this._metadataProperties[name] = value;

      if (name)
        this._metadataElement.setAttribute(name, value);
      else
        this._metadataElement.innerHTML = encodeForInnerHTML(value);

      if (this._executeSql) {
        if (existingProperty) {
          this._savingCache.beginSave('*metadata');
          this._executeSql(
            this._updateMetadataSql,
            [value, name],
            (t, result) => {
              this._savingCache.endSave('*metadata');
              if (name !== 'edited')
                this.setProperty('edited', <any>Date.now());
            },
            (t, sqlError) => {
              alert('setProperty(' + name + ',' + value + ') ' + this._updateMetadataSql + ' [' + value + ',' + name + '] ' + sqlError.message);
              this._savingCache.endSave('*metadata');
            });
        }
        else {
          this._savingCache.beginSave('*metadata');
          this._executeSql(
            this._insertMetadataSql,
            [name, value],
            (t, result) => {
              this._savingCache.endSave('*metadata');
              if (name !== 'edited')
                this.setProperty('edited', <any>Date.now());
            },
            (t, sqlError) => {
              alert('setProperty(' + name + ',' + value + ') ' + this._insertMetadataSql + ' [' + name + ',' + value + '] ' + sqlError.message);
              this._savingCache.endSave('*metadata');
            });

        }
      }
    }


    
    private _initFromOpenDatabase(openDatabase, forceLoadFromDom: boolean, pathElements: { [name: string]: HTMLScriptElement; }) {
      var dbName = this.handler.uniqueKey ? this.handler.uniqueKey : getUniqueKey();

      var detectIndexedDB = new teapo.storage.attached.indexedDB.DetectStorage();
      detectIndexedDB.detectStorageAsync(dbName, (errorIndexedDB, load) => {
        if (errorIndexedDB) {
          var detectWebSQL = new teapo.storage.attached.webSQL.DetectStorage();
          detectWebSQL.detectStorageAsync(dbName, (errorWebSQL, load) => {
            if (errorWebSQL) {
              alert(
                'Persistent storage is not stable\n'+
                'indexedDB ' + errorIndexedDB + '\n' +
                'webSQL ' + errorWebSQL);
              return;
            }

            this._initWithStorage(load, forceLoadFromDom, pathElements);
          });
          return;
        }
        
        this._initWithStorage(load, forceLoadFromDom, pathElements);
      });

      var db = openDatabase(dbName, 1, null, 1024 * 1024 * 5);

      this._executeSql = (
        sqlStatement: string,
        args: any[],
        callback: (transaction: SQLTransaction, result: SQLResultSet) => void,
        errorCallback: (transaction: SQLTransaction, error: SQLError) => void) => {

        var errorCallbackSafe = (t: SQLTransaction, e: SQLError) => {
          alert(e + ' ' + e.message + '\n' + sqlStatement + '\n' + args);
          errorCallback(t, e);
        };

        db.transaction((t) => t.executeSql(sqlStatement, args, callback, errorCallbackSafe));
      };
      this._insertMetadataSql = 'INSERT INTO "*metadata" (name, value) VALUES(?,?)';
      this._updateMetadataSql = 'UPDATE "*metadata" SET value=? WHERE name=?';

      this._metadataProperties = {};
      this._loadTableListFromWebsql((tableList) => {
        this._initWithTableList(tableList, forceLoadFromDom, pathElements);
      });
    }

    private _initWithStorage(load: teapo.storage.attached.LoadStorage, forceLoadFromDom: boolean, pathElements: { [name: string]: HTMLScriptElement; }) {
      var domEdited = this._metadataElement ?
        safeParseInt(this._metadataElement.getAttribute('edited')) :
        null;

      if (domEdited || 0 < load.editedUTC || 0) {
        console.log('DOM is younger, need to call load.load', domEdited, load.editedUTC);
      }
      else {
        console.log('DOM is older, need to call load.migrate', domEdited, load.editedUTC);
        var filesByName: { [fullPath: string]: { [propertyName: string]: string; }; } = { };
        for (var fullPath in pathElements) if (pathElements.hasOwnProperty(fullPath)) {
          var pbag: any = {};
          loadPropertyBagFromDom(pathElements[fullPath], pbag);
          var contentStr = decodeFromInnerHTML(pathElements[fullPath].innerHTML);
          pbag[''] = contentStr;

          filesByName[fullPath] = pbag;
        }

        load.migrate(
          domEdited || new Date().valueOf(),
          filesByName,
          (error, updater) => {
            console.log('migrate completed: ', error, updater, filesByName);
          });
      }
    }

    private _initWithTableList(tableList: string[], forceLoadFromDom: boolean, pathElements: { [name: string]: HTMLScriptElement; }) { 
      var metadataTableExists = false;
      for (var i = 0; i < tableList.length; i++) {
        if (tableList[i] === '*metadata') {
          metadataTableExists = true;
          break;
        }
      }
      if (!metadataTableExists || forceLoadFromDom) {
        this._loadInitialStateFromDom(pathElements);
        return;
      }

      var domEdited = this._metadataElement ?
        safeParseInt(this._metadataElement.getAttribute('edited')) :
        null;

      loadPropertiesFromWebSql(
        '*metadata',
        this._metadataElement,
        this._metadataProperties,
        this._executeSql,
        sqlError => {
          if (sqlError) {
            this.handler.documentStorageCreated(new Error('loadPropertiesFromWebSql:*metadata: ' + sqlError.message), null);
            return;
          }

          var wsEdited = safeParseInt(this._metadataProperties.edited);
          if (!wsEdited || domEdited && domEdited > wsEdited) {
            this.editedUTC = domEdited;
            this._loadInitialStateFromDom(pathElements);
          }
          else{
            this.editedUTC = wsEdited;
            this._loadInitialStateFromWebSql(pathElements);
          }
        });
    }

    private _loadInitialStateFromDom(
      pathElements: { [fullPath: string]: HTMLScriptElement; }) {

      this.handler.setStatus('Loading files from HTML...');
      setTimeout(() => this._loadInitialStateFromDomCore(pathElements), 1);

    }

    private _loadInitialStateFromDomCore(
      pathElements: { [fullPath: string]: HTMLScriptElement; }) {

      /** pull from DOM assuming webSQL state is clean of any tables */
      var loadInClearState = () => {

        var fullPathList = Object.keys(pathElements);
        var addedFileCount = 0;

        var completedAdding = () => {
          if (this._executeSql) {
            this.handler.setStatus('Loading files from HTML: ' + addedFileCount + ' of ' + fullPathList.length + '... metadata...');
            this._executeSql(
              'CREATE TABLE "*metadata" (name TEXT, value TEXT)',
              [],
              (tr, r) => {
                this.handler.documentStorageCreated(null, this);
              },
              (tr,e) => {
                alert('create *metadata ' + e.message);
              });
          }
          else {
            this.handler.documentStorageCreated(null, this);
          }
        };

        var continueAdding = () => {
          if (addedFileCount === fullPathList.length) {
            completedAdding();
            return;
          }


          var fullPath = fullPathList[addedFileCount];
          var s = pathElements[fullPath];

          var docState = new RuntimeDocumentState(
            fullPath,
            s,
            this._executeSql,
            this,
            null);

          this._docByPath[fullPath] = docState;

          addedFileCount++;
          this.handler.setStatus('Loading files from HTML: ' + addedFileCount + ' of ' + fullPathList.length + '...');

          setTimeout(continueAdding, 1);
        };

        continueAdding();
      };

      if (this._executeSql) {
        this.handler.setStatus('Loading files from HTML: deleting cached data...');
        this._dropAllTables(sqlError => {
          if (sqlError) {
            this.handler.documentStorageCreated(new Error('Deleting existing table ' + sqlError.message), null);
            return;
          }
          
          loadInClearState();
        });
      }
      else {
        loadInClearState();
      }
    }

    private _dropAllTables(completed: (sqlError: SQLError) => void) {
      this._loadTableListFromWebsql(
        (tableList) => {

          if (!tableList || !tableList.length) { 
            completed(null);
            return;
          }

          var deletedCount = 0;
          var failed = false;
          for (var i = 0; i < tableList.length; i++) {
            this._executeSql(
              'DROP TABLE "' + tableList[i] + '"',
              [],
              (tr, r) => {
                deletedCount++;
                this.handler.setStatus('Loading files from HTML: deleting cached data (' + deletedCount + ' of ' + tableList.length+')...');
                if (deletedCount == tableList.length)
                  completed(null);
              },
              (tr, error) => {
                if (!failed) {
                  failed = true;
                  completed(error);
                }
              });
          }

        });
    }

    private _loadInitialStateFromWebSql(
      pathElements: { [fullPath: string]: HTMLScriptElement; }) {

      this.handler.setStatus('Loading files from temporary storage...');

      setTimeout(() => this._loadInitialStateFromWebSqlCore(pathElements), 1);
    }

    private _loadInitialStateFromWebSqlCore(
      pathElements: { [fullPath: string]: HTMLScriptElement; }) {

      // retrieving data from WebSQL and creating documents
      this._loadTableListFromWebsql((tables) => {

        var files = tables.filter((tab) => tab.charAt(0) === '/' || tab.charAt(0) === '#');
        var completedFileCount = 0;

        var continueAdding = () => {
          var fullPath = files[completedFileCount];

          var s = pathElements[fullPath];
          if (s) {
            removeAttributes(s);
            delete pathElements[fullPath]; // all remaining elements will be destroyed
          }
          else {
            s = appendScriptElement(this.document);
            s.setAttribute('data-path', fullPath);
          }

          var docState = new RuntimeDocumentState(
            fullPath,
            s,
            this._executeSql,
            this,
            () => {

              completedFileCount++;
              this.handler.setStatus('Loading files from temporary storage: ' + completedFileCount + ' of ' + files.length + '...');

              if (completedFileCount === files.length) {
                // removing remaining HTML DOM
                for (var k in pathElements) if (pathElements.hasOwnProperty(k)) {
                  var s = pathElements[k];
                  removeScriptElement(s);
                }

                this.handler.documentStorageCreated(null, this);
              }
              else {
                setTimeout(continueAdding, 1);
              }
            });

          this._docByPath[fullPath] = docState;
        };

        continueAdding();
      });
    }


    private _scanDomScripts() {
      var pathElements: { [name: string]: HTMLScriptElement; } = {};

      for (var i = 0; i < document.scripts.length; i++) {
        var s = <HTMLScriptElement>document.scripts[i];
        var path = s.getAttribute('data-path');
        if (typeof path === 'string' && path.length > 0) {
          if (path.charAt(0) === '/' || path.charAt(0) === '#') {
            pathElements[path] = s;
          }
        }
        else if (s.id === 'storageMetadata') {
          this._metadataElement = s;
        }
      }

      for (var i = 0; i < document.styleSheets.length; i++) {
        var sty = <HTMLStyleElement>document.styleSheets.item(i).ownerNode;
        var path = sty.getAttribute('data-path');
        if (typeof path === 'string' && path.length > 0) {
          if (path.charAt(0) === '/' || path.charAt(0) === '#') {
            pathElements[path] = <any>sty;
          }
        }
      }

      return pathElements;
    }

    private _loadTableListFromWebsql(callback: (filenames: string[]) => void) {
      var sql = 'SELECT name FROM sqlite_master WHERE type=\'table\'';
      this._executeSql(
        sql,
        [],
        (t, result) => {
          var files: string[] = [];
          for (var i = 0; i < result.rows.length; i++) {
            var tableName = result.rows.item(i).name;
            if (tableName.charAt(0) === '/'
              || tableName.charAt(0) === '#'
              || tableName.charAt(0) === '*') {
              files.push(tableName);
            }
          }
          callback(files);
        },
        (t, error) => {
          this.handler.documentStorageCreated(new Error('_loadTableListFromWebsql ' + sql + ' ' + error.message), null);
        });
    }
  }

  class FileSavingCache {

    savingFiles = ko.observableArray<string>();
    private _cache: { [fullPath: string]: number; } = {};
    
    constructor() { 
    }

    beginSave(fullPath: string) {
      var num = this._cache[fullPath];
      if (num) {
        this._cache[fullPath]++;
      }
      else {
        this.savingFiles.push(fullPath);
        this._cache[fullPath] = 1;
      }
    }

    endSave(fullPath: string) {
      setTimeout(() => {
        var num = this._cache[fullPath];
        if (!num || !(num - 1)) {
          delete this._cache[fullPath];
          this.savingFiles.remove(fullPath);
        }
        else {
          this._cache[fullPath]--;
        }
      }, 400);
    }
  }


  /**
   * Standard implementation of DocumentState.
   * This class is not exposed outside of this module.
   */
  class RuntimeDocumentState implements DocumentState {

    private _type: EditorType = null;
    private _editor: Editor = null;
    private _fileEntry: FileEntry = null;

    private _properties: any = {};

    private _updateSql: string = '';
    private _insertSql: string = '';

    constructor(
      private _fullPath: string,
      private _storeElement: HTMLScriptElement,
      private _executeSql: ExecuteSqlDelegate,
      private _storage: RuntimeDocumentStorage,
      loadFromWebsqlCallback: (docState: RuntimeDocumentState) => void) {

      var tableName = this._fullPath;
      if (this._executeSql) {
        this._insertSql = 'INSERT INTO "' + tableName + '" (name, value) VALUES(?,?)';
        this._updateSql = 'UPDATE "' + tableName + '" SET value=? WHERE name=?';
      }

      if (loadFromWebsqlCallback) {
        loadPropertiesFromWebSql(
          tableName,
          this._storeElement,
          this._properties,
          this._executeSql,
          () => {
            loadFromWebsqlCallback(this);
          });
      }
      else {
        loadPropertiesFromDom(
          tableName,
          this._storeElement,
          this._properties,
          this._executeSql);
      }
    }

    fullPath() {
      return this._fullPath;
    }

    type() {
      if (!this._type)
        this._type = this._storage.handler.getType(this._fullPath);

      return this._type;
    }

    fileEntry() {
      if (!this._fileEntry)
        this._fileEntry = this._storage.handler.getFileEntry(this._fullPath);

      return this._fileEntry;
    }

    editor() {
      if (!this._editor)
        this._editor = this.type().editDocument(this);

      return this._editor;
    }

    currentEditor() {
      return this._editor;
    }

    getProperty(name: string): string {
      return this._properties[name || ''];
    }

    setProperty(name: string, value: string) {
      var name = name || '';
      if (value === this._properties[name])
        return;

      var existingProperty = this._properties.hasOwnProperty(name);
      this._properties[name] = value;

      if (name)
        this._storeElement.setAttribute(name, value);
      else
        this._storeElement.innerHTML = encodeForInnerHTML(value);

      if (this._executeSql) {
        if (existingProperty) {
          this._storage._savingCache.beginSave(this.fullPath());
          this._executeSql(
            this._updateSql,
            [value, name],
            (tr, r) => {
              this._storage._savingCache.endSave(this.fullPath());
              return;
            },
            (tr, e) => {
              alert(this._fullPath + ' setProperty(' + name + ',' + value + ') ' + this._updateSql + ' ' + e.message);
              this._storage._savingCache.endSave(this.fullPath());
            });
        }
        else {
          this._executeSql(
            this._insertSql,
            [name, value],
            (tr, r) => {
              this._storage._savingCache.endSave(this.fullPath());
              return;
            },
            (tr, e) => {
              alert(this._fullPath + 'setProperty(' + name + ',' + value + ') ' + this._insertSql + ' ' + e.message);
              this._storage._savingCache.endSave(this.fullPath());
            });
        }
      }

      this._storage.setProperty('edited', <any>Date.now());
    }

    _removeStorage() {
      if (this._editor)
        this._editor.remove();

      removeScriptElement(this._storeElement);

      if (this._executeSql) {
        this._executeSql(
          'DROP TABLE "' + this._fullPath + '"',
          null,
          (tr, r) => null,
          (tr, e) => {
            alert('drop table ' + this._fullPath + ' ' + e.message);
          });
      }
    }

  }

  function getUniqueKey(): string {
    var key = window.location.href;

    key = key.split('?')[0];
    key = key.split('#')[0];

    if (key.length > 'index.html'.length
      && key.slice(key.length - 'index.html'.length).toLowerCase() === 'index.html')
      key = key.slice(0, key.length - 'index.html'.length);

    key += '*';

    return key;
  }

  function getOpenDatabase() {
    return typeof openDatabase == 'undefined' ? null : openDatabase;
  }

  function safeParseInt(str: string): number {
    if (!str) return null;
    if (typeof str === 'number') return <number><any>str;
    try {
      return parseInt(str);
    }
    catch (e) {
      return null;
    }
  }

  function appendScriptElement(doc: typeof document): HTMLScriptElement {
    var s = doc.createElement('script');
    s.setAttribute('type', 'text/data');
    doc.body.insertBefore(s, doc.body.children[0]);
    return s;
  }

  function removeScriptElement(script: HTMLElement) {
    var keepElement: boolean;
    if (script.tagName.toLowerCase() === 'style') {
      keepElement = true;
    }
    else if (script.tagName.toLowerCase() === 'script') {
      var type = script.getAttribute('type');
      if (!type || type.indexOf('javascript') > 0) {
        keepElement = true;
      }
      else {
        if (script.id === 'page-template'
          || script.id === 'folder-template'
          || script.id === 'file-template')
          keepElement = true;
      }
    }

    if (keepElement) {
      script.removeAttribute('data-path');
    }
    else {
      script.parentElement.removeChild(script);
    }
  }

  function loadPropertiesFromDom(
    tableName: string,
    script: HTMLScriptElement,
    properties: any,
    executeSql: ExecuteSqlDelegate) {

    function afterCreateTable(after: () => void) {
      if (executeSql) {
        executeSql(
          'CREATE TABLE "' + tableName + '" ( name TEXT, value TEXT)', [],
          (tr, r) => {
            after();
          },
          null);
      }
      else {
        after();
      }
    }

    afterCreateTable(() => {
      var insertSQL = 'INSERT INTO "' + tableName + '" (name, value) VALUES(?,?)';

      var pbag = {};
      loadPropertyBagFromDom(script, pbag);
      for (var p in pbag) if (pbag.hasOwnProperty(p)) { 

        var v = pbag[p];
        properties[p] = v;

        if (executeSql) {
          executeSql(
            insertSQL,
            [p, v],
            (tr, r) => { return; },
            (tr, e) => {
              alert('loadPropertiesFromDom(' + tableName + ') ' + insertSQL + ' [' + p + ',' + v + '] ' + e.message);
            });
        }
      }

      // restore HTML-safe conversions
      var contentStr = decodeFromInnerHTML(script.innerHTML);
      properties[''] = contentStr;
      if (executeSql)
        executeSql(
          insertSQL,
          ['', contentStr],
          (tr, r) => { return; },
          (tr, e) => {
            alert('loadPropertiesFromDom(' + tableName + ') ' + insertSQL + ' [,' + contentStr + '] ' + e.message);
          });
    });
  }

  function loadPropertyBagFromDom(script: HTMLElement, properties: any) {
    for (var i = 0; i < script.attributes.length; i++) {
      var a = script.attributes.item(i);

      if (a.name === 'id' || a.name === 'data-path' || a.name === 'type')
        continue;

      properties[a.name] = a.value;
    }
  }

  function loadPropertiesFromWebSql(
    tableName: string,
    script: HTMLScriptElement,
    properties: any,
    executeSql: ExecuteSqlDelegate,
    completed: (error: SQLError) => void) {

    executeSql(
      'SELECT name, value from "' + tableName + '"',
      [],
      (t, results) => {

        var rowCount = results.rows.length; // TODO: check if this is necessary
        for (var i = 0; i < rowCount; i++) {
          var row: { name: string; value: string; } = results.rows.item(i);
          properties[row.name] = row.value || '';
          if (row.name)
            script.setAttribute(row.name, row.value || '')
          else
            script.innerHTML = encodeForInnerHTML(row.value);
        }

        completed(null);
      },
      (t, sqlError) => {
        completed(sqlError);
      });
  }

  function removeAttributes(element: HTMLElement) {
    for (var i = 0; i < element.attributes.length; i++) {
      var a = element.attributes[i];
      if (a.name === 'id' || a.name === 'type' || a.name === 'data-path')
        continue;
      element.removeAttribute(a.name);
      i--;
    }
  }

}