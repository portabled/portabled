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
  export function openStorage(handler: DocumentStorageHandler): void {

    var storage = new RuntimeDocumentStorage(handler);
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

  class RuntimeDocumentStorage implements DocumentStorage {
    document: typeof document = null;

    _metadataElement: HTMLScriptElement = null;

    private _metadataProperties: any = null;
    private _docByPath: { [name: string]: RuntimeDocumentState; } = {};

    private _executeSql = null;

    constructor(
      public handler: DocumentStorageHandler) {

      this.document = this.handler.document ? this.handler.document : document;

      var pathElements = this._scanDomScripts();

      var openDatabase = this.handler.openDatabase;
      if (typeof openDatabase==='function') {
        var dbName = this.handler.uniqueKey ? this.handler.uniqueKey : getUniqueKey();
        var db = openDatabase(dbName, 1, null, 1024*1024*40);

        this._executeSql = (sql, args, callback, errorcallback) => 
          db.transaction((t) => t.executeSql(sql, args, callback, errorcallback));

        this._loadMetadataFromWebSql(() => {
          var wsEdited = safeParseDate(this._metadataProperties.edited);
          var domEdited = this._metadataElement ?
            safeParseDate(this._metadataElement.getAttribute('edited')) :
            null;
          if (!wsEdited || domEdited && domEdited > wsEdited)
            this._loadInitialStateFromDom(pathElements);
          else
            this._loadInitialStateFromWebSql(pathElements);
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
      var docState = new RuntimeDocumentState(
        fullPath,
        s,
        this._executeSql,
        this,
        true);

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
      throw null;
    }

    setProperty(name: string, value: string): void {
      throw null;
    }



    private _loadInitialStateFromDom(
      pathElements: { [fullPath: string]: HTMLScriptElement; }) {

      if (this._executeSql) {
        // TODO: drop database, create database
      }

      // pull everything from DOM, websql is older
      // (that's the case when they saved/downloaded a new file
      // overwriting the old file in place)
      for (var fullPath in pathElements) if (pathElements.hasOwnProperty(fullPath)) {

        var s = pathElements[fullPath];

        if (this._executeSql) {
          // TODO: create table
        }

        var properties = {};
        properties[''] = s.innerHTML;

        var sql = 'INSERT INTO "'+fullPath+'"(name,value) VALUES(?,?)';
        for (var i=0; i<s.attributes.length; i++) {
          var a = s.attributes.item(i);
          properties[a.name] = a.value;

          if (this._executeSql) {
            this._executeSql(
              sql,
              [a.name, a.value]);
          }
        }

        var docState = new RuntimeDocumentState(
          fullPath,
          properties,
          s,
          this);
        this._docByPath[fullPath] = docState;
      }

      // TODO: update metadata

      this.handler.documentStorageCreated(null, this);
    }

    private _loadInitialStateFromWebSql(
      pathElements: { [fullPath: string]: HTMLScriptElement; }) {

      // removing HTML DOM - easier to recreate than to merge
      for (var k in pathElements) if (pathElements.hasOwnProperty(k)) {
        var s = pathElements[k];
        s.parentElement.removeChild(s);
      }

      // retrieving data from WebSQL and creating documents
      this._loadFileListFromWebsql((files) => {
        var completedFileCount = 0;
        for (var i = 0; i < files.length; i++) {
          this._loadDocFromWebSql(
            files[i],
             () => {
               completedFileCount++;
               if (completedFileCount===files.length) {
                 this._loadMetadataFromWebSql(
                   () => this._finishLoadingInitialStateFromWebSql());
               }
             });
        }
      });
    }

    private _finishLoadingInitialStateFromWebSql() {
      this.handler.documentStorageCreated(null, this);
    }

    private _loadMetadataFromWebSql(completed: () => void) {
      this._execSql(
        'SELECT name, value FROM "*metadata"',
        [],
         (result) => {
           this._metadataProperties = {};
           for (var i=0; i<result.rows.length; i++)  {
             this._metadataProperties[result.rows.item(i).name] = result.rows(i).value;
           }
           completed();
         });
    }

    private _loadDocFromWebSql(fullPath: string, completed: () => void) {
      this._execSql(
        'SELECT name, value FROM "'+fullPath+'"',
         [],
         (result) => {
           var properties: any = {};
           for (var i = 0; i < result.rows.length; i++) {
             properties[result.rows(i).name] = result.rows[i].value;
           }

           var storeElement = appendScriptElement(this.document);
           storeElement.setAttribute('data-path', fullPath);

           var docState = new RuntimeDocumentState(
             fullPath,
             properties,
             storeElement,
             this);
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

    private _loadFileListFromWebsql(callback: (filenames: string[]) => void) {
      var sql = 'SELECT name FROM sqlite_master WHERE type=\'table\'';
      this._execSql(sql, [], (result) => {
        var files: string[] = [];
        for (var i = 0; i < result.rows.length; i++) {
          var tableName = result.rows(i).name;
          if (tableName.charAt(0)==='/'
               || tableName.charAt(0)==='#') {
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

    private _properties: any = null;

    private _updateSql: string = '';
    private _insertSql: string = '';

    constructor(
      private _fullPath: string,
      private _storeElement: HTMLScriptElement,
      private _executeSql: (sql: string, args: any[], callback, errorcallback) => void ,
      private _storage: RuntimeDocumentStorage,
      loadFromDom: boolean) {

      var tableName = this._fullPath;
      this._insertSql = 'INSERT INTO "'+tableName+'"(name,value) VALUES(?,?)';
      this._updateSql = 'UPDATE "'+tableName+'" SET value=? WHERE name=?';

      if(loadFromDom) {
        // TODO: populate _properties
      }
      else {
        // TODO: populate _properties, use a callback
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
      return this._properties[name];
    }

    setProperty(name: string, value: string) {
      if (value===this._properties[name])
        return;

      var existingProperty = this._properties.hasOwnProperty(name);
      this._properties[name] = value;

      if (name)
        this._storeElement.setAttribute(name, value);
      else
        this._storeElement.innerHTML = value;

      if (this._executeSql) {
        var sql = existingProperty ? this._updateSql : this._insertSql;
        this._executeSql(
          sql,
          [name, value],
          null, null);
      }
    }

    _removeStorage() {
      // TODO: remove _storeElement, drop table
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

  function safeParseDate(str: string): Date {
    if (!str) return null;
    try {
      return new Date(str);
    }
    catch (e) {
      return null;
    }
  }

  function appendScriptElement(doc: typeof document): HTMLScriptElement {
    var s = doc.createElement('script');
    s.setAttribute('type', 'text/data');
    doc.body.appendChild(s);
    return s;
  }

}