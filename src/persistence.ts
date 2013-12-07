/// <reference path='typings/websql.d.ts' />

/// <reference path='editor.ts' />
/// <reference path='files.ts' />

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

  /**
   * Encapsulating all necessary for storing documents, metadata and properties.
   */
  export interface DocumentStorage {

    /**
     * Full paths of all files.
     */
    documentNames(): string[];

    /**
     * Given a path retrieves an object for reading and writing document state,
     * also exposes runtime features like editor and entry in the file list.
     */
    getDocument(fullPath: string): DocumentState;

    /**
     * Creates a persisted state for a document, and returns it as a result.
     */
    createDocument(fullPath: string): DocumentState;

    /**
     * Removes the document and all its state.
     */
    removeDocument(fullPath: string): DocumentState;

    getProperty(name: string): string;
    setProperty(name: string, value: string): void;
  }

  /**
   * Allows reading, writing properties of the document,
   * and also exposes runtime features like editor and entry in the file list.
   */  
  export interface DocumentState {

    fullPath(): string;

    /**
     * Retrieves object encapsulating document type (such as plain text, JavaScript, HTML).
     * Note that type is metadata, so the instance is shared across all of the documents
     * of the same type.
     */
    type(): EditorType;

    /**
     * Retrieves object encapsulating editor behaviour for the document.
     */
    editor(): Editor;

    /**
     * Same as editor, but returns null if the editor has never been instantiated yet.
     */
    currentEditor(): Editor;

    /**
     * Retrieves object representing a node in the file list or tree view.
     */
    fileEntry(): FileEntry;

    /**
     * Retrieves property value from whatever persistence mechanism is implemented.
     */
    getProperty(name: string): string;

    /**
     * Persists property value.
     */
    setProperty(name: string, value: string): void;
  }

  /**
   * Details necessary to request DocumentStorage creation,
   * as well as the callback logic.
   */
  export interface DocumentStorageHandler {

    /**
     * Callback invoked when the document storage creation is completed.
     */
    documentStorageCreated(error: Error, storage: DocumentStorage);

    /**
     * Returns EditorType object handling editor behavior for a given file.
     */
    getType(fullPath: string): EditorType;

    /**
     * Returns FileEntry object representing the file in list/tree.
     */
    getFileEntry(fullPath: string): FileEntry;

    /**
     * Overrides unique key used to differentiate multiple documents
     * sharing the same domain/scheme in WebSQL storage.
     */
    uniqueKey?: string;

    /** Overrides access to the global document object. */
    document?: typeof document;

    /** Overrides WebSQL API */
    openDatabase?: typeof openDatabase;
  }




  interface ExecuteSqlDelegate {
    (sqlStatement: string,
    arguments?: any[],
    callback?: (transaction: SQLTransaction, result: SQLResultSet) => void,
    errorCallback?: (transaction: SQLTransaction, resultSet: SQLResultSet) => void): void;
  }

  class RuntimeDocumentStorage implements DocumentStorage {
    document: typeof document = null;

    _metadataElement: HTMLScriptElement = null;

    private _metadataProperties: any = null;
    private _docByPath: { [name: string]: RuntimeDocumentState; } = {};

    private _executeSql: ExecuteSqlDelegate = null;
    private _insertMetadataSql = '';
    private _updateMetadataSql = '';

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
      if (typeof openDatabase==='function') {
        var dbName = this.handler.uniqueKey ? this.handler.uniqueKey : getUniqueKey();
        var db = openDatabase(dbName, 1, null, 1024*1024*5);

        this._executeSql = (
          sqlStatement: string,
          args?: any[],
          callback?: (transaction: SQLTransaction, result: SQLResultSet) => void,
          errorCallback?: (transaction: SQLTransaction, error: SQLError) => void) => {

          var errorCallbackSafe = errorCallback;
          if (!errorCallbackSafe)
            errorCallbackSafe = (t: SQLTransaction, e: SQLError) => alert(e+' '+e.message+'\n'+sqlStatement+'\n'+args);
          db.transaction((t) => t.executeSql(sqlStatement, args, callback, errorCallbackSafe));
        };
        this._insertMetadataSql = 'INSERT INTO "*metadata" (name, value) VALUES(?,?)';
        this._updateMetadataSql = 'UPDATE "*metadata" SET value=? WHERE name=?';

        this._metadataProperties = {};
        this._loadTableListFromWebsql((tableList) => {
          var metadataTableExists = false;
          for (var i = 0; i < tableList.length; i++) {
            if (tableList[i]==='*metadata') {
              metadataTableExists = true;
              break;
            }
          }
          if (!metadataTableExists || forceLoadFromDom) {
            this._loadInitialStateFromDom(pathElements);
            return;
          }

          loadPropertiesFromWebSql(
            '*metadata',
             this._metadataElement,
             this._metadataProperties,
             this._executeSql,
             () => {
  
              var wsEdited = safeParseInt(this._metadataProperties.edited);
              var domEdited = this._metadataElement ?
                safeParseInt(this._metadataElement.getAttribute('edited')) :
                null;
              if (!wsEdited || domEdited && domEdited > wsEdited)
                this._loadInitialStateFromDom(pathElements);
              else
                this._loadInitialStateFromWebSql(pathElements);
             });
        });
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
        throw new Error('File already exists: '+fullPath+'.');

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
      return this._metadataProperties[name||''];
    }

    setProperty(name: string, value: string): void {
      name = name||'';
      if (value===this._metadataProperties[name])
        return;

      var existingProperty = this._metadataProperties.hasOwnProperty(name);
      this._metadataProperties[name] = value;

      if (name)
        this._metadataElement.setAttribute(name, value);
      else
        this._metadataElement.innerHTML = encodeForInnerHTML(value);

      if (this._executeSql) {
        if (existingProperty)
          this._executeSql(this._updateMetadataSql, [value,name]);
        else
          this._executeSql(this._insertMetadataSql, [name, value]);
      }

      if (name!=='edited')
        this.setProperty('edited', <any>Date.now());
    }



    private _loadInitialStateFromDom(
      pathElements: { [fullPath: string]: HTMLScriptElement; }) {

      /** pull from DOM assuming webSQL state is clean of any tables */
      var loadInClearState = () => {
        
        for (var fullPath in pathElements) if (pathElements.hasOwnProperty(fullPath)) {
  
          var s = pathElements[fullPath];
  
          var docState = new RuntimeDocumentState(
            fullPath,
            s,
            this._executeSql,
            this,
            null);

          this._docByPath[fullPath] = docState;
        }

        if (this._executeSql) {
          this._executeSql(
            'CREATE TABLE "*metadata" (name TEXT, value TEXT)',
            [],
            null, null);

        }
  
        this.handler.documentStorageCreated(null, this);
      };

      if (this._executeSql) {
        this._dropAllTables(loadInClearState);
      }
      else {
        loadInClearState();
      }
    }

    private _dropAllTables(completed: () => void) {
      this._loadTableListFromWebsql(
        (tableList) => {
          for (var i = 0; i < tableList.length; i++) {
            this._executeSql(
              'DROP TABLE "'+tableList[i]+'"',
              [],
              null, null);
          }

          completed();
        });
    }

    private _loadInitialStateFromWebSql(
      pathElements: { [fullPath: string]: HTMLScriptElement; }) {

      // retrieving data from WebSQL and creating documents
      this._loadTableListFromWebsql((tables) => {

        var files = tables.filter((tab) => tab.charAt(0) === '/' || tab.charAt(0)==='#');
        var completedFileCount = 0;
        for (var i = 0; i < files.length; i++) {

          var fullPath = files[i];
          
          var s = pathElements[fullPath];
          if (s) {
            removeAttributes(s);
            delete pathElements[fullPath]; // all remaining elements will be destroyed
          }
          else {
            appendScriptElement(this.document);
            s.setAttribute('data-path', fullPath);
          }
          
          var docState = new RuntimeDocumentState(
            fullPath,
            s,
            this._executeSql,
            this,
            () => {
          
              completedFileCount++;
          
              if (completedFileCount===files.length) {
                this.handler.documentStorageCreated(null, this);
              }
            });
          
          this._docByPath[fullPath] = docState;
        }

        // removing HTML DOM - easier to recreate than to merge
        for (var k in pathElements) if (pathElements.hasOwnProperty(k)) {
          var s = pathElements[k];
          s.parentElement.removeChild(s);
        }
      });
    }


    private _scanDomScripts() {
      var pathElements: { [name: string]: HTMLScriptElement; } = {};

      for (var i = 0; i < document.scripts.length; i++) {
        var s = <HTMLScriptElement>document.scripts[i];
        var path = s.getAttribute('data-path');
        if (path) {
          if (path.charAt(0)==='/' || path.charAt(0)==='#') {
            pathElements[path] = s;
          }
        }
        else if (s.id==='storageMetadata') {
          this._metadataElement = s;
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
            if (tableName.charAt(0)==='/'
                 || tableName.charAt(0)==='#'
                 || tableName.charAt(0)==='*') {
              files.push(tableName);
            }
          }
          callback(files);
        });
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
        this._insertSql = 'INSERT INTO "'+tableName+'" (name, value) VALUES(?,?)';
        this._updateSql = 'UPDATE "'+tableName+'" SET value=? WHERE name=?';
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
      return this._properties[name||''];
    }

    setProperty(name: string, value: string) {
      var name = name||'';
      if (value===this._properties[name])
        return;

      var existingProperty = this._properties.hasOwnProperty(name);
      this._properties[name] = value;

      if (name)
        this._storeElement.setAttribute(name, value);
      else
        this._storeElement.innerHTML = encodeForInnerHTML(value);

      if (this._executeSql) {
        if (existingProperty)
          this._executeSql(this._updateSql, [value,name]);
        else
          this._executeSql(this._insertSql, [name, value]);
      }

      this._storage.setProperty('edited', <any>Date.now());
    }

    _removeStorage() {
      if (this._editor)
        this._editor.remove();

      this._storeElement.parentElement.removeChild(this._storeElement);
      if (this._executeSql) {
        this._executeSql('DROP TABLE "'+this._fullPath+'"');
      }
    }

  }

  function getUniqueKey(): string {
    var key = window.location.href;

    key = key.split('?')[0];
    key = key.split('#')[0];

    if (key.length > 'index.html'.length
       && key.slice(key.length-'index.html'.length).toLowerCase()==='index.html')
      key = key.slice(0, key.length-'index.html'.length);

    key += '*';

    return key;
  }

  function getOpenDatabase() {
    return typeof openDatabase == 'undefined' ? null : openDatabase;
  }

  function safeParseInt(str: string): number {
    if (!str) return null;
    if (typeof str==='number') return <number><any>str;
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

  function loadPropertiesFromDom(
    tableName: string,
    script: HTMLScriptElement,
    properties: any,
    executeSql: ExecuteSqlDelegate) {

    if (executeSql) {
      executeSql(
        'CREATE TABLE "'+tableName+'" ( name TEXT, value TEXT)');
    }

    var insertSQL = 'INSERT INTO "'+tableName+'" (name, value) VALUES(?,?)';

    for (var i = 0; i < script.attributes.length; i++) {
      var a = script.attributes.item(i);

      if (a.name==='id' || a.name==='data-path' || a.name==='type')
        continue;

      properties[a.name] = a.value;

      if (executeSql)
        executeSql(insertSQL, [a.name, a.value]);
    }

    // restore HTML-safe conversions
    var contentStr = decodeFromInnerHTML(script.innerHTML);
    properties[''] = contentStr;
    if (executeSql)
      executeSql(insertSQL, ['', contentStr]);
  }

  function loadPropertiesFromWebSql(
    tableName: string,
    script: HTMLScriptElement,
    properties: any,
    executeSql: ExecuteSqlDelegate,
    completed: () => void) {

    executeSql(
      'SELECT name, value from "'+tableName+'"',
       [],
      (t, results) => {

        var rowCount = results.rows.length; // TODO: check if this is necessary
        for (var i=0; i < rowCount; i++) {
          var row: { name: string; value: string; } = results.rows.item(i);
          properties[row.name] = row.value || '';
          if (row.name)
            script.setAttribute(row.name, row.value || '')
          else
            script.innerHTML = encodeForInnerHTML(row.value);
        }

        completed();
      });
  }

  function removeAttributes(element: HTMLElement) {
    for (var i = 0; i < element.attributes.length; i++) {
      var a = element.attributes[i];
      if (a.name==='id' || a.name==='type' || a.name==='data-path')
        continue;
      element.removeAttribute(a.name);
      i--;
    }
  }

  /**
   * Escape unsafe character sequences like a closing script tag.
   */
  function encodeForInnerHTML(content: string): string {
    return content.replace(/<\/script/g, '<//script');
  }

  /**
   * Unescape character sequences wrapped with encodeForInnerHTML for safety.
   */
  function decodeFromInnerHTML(innerHTML: string): string {
    return innerHTML.replace(/<\/\/script/g, '</'+'script');
  }
}
