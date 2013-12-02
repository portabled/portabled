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
    uniqueKey: string = '';
    document: typeof document = null;

    private _metadataElement: HTMLScriptElement = null;
    private _docByPath: { [name: string]: RuntimeDocumentState; } = {};

    private _dbName = 'teapo';
    private _db;

    static persistToWebSqlDelay = 100;
    private _modifiedDocByPath: { [name: string]: RuntimeDocumentState; } = null;
    private _persistenceTimeout = 0;
    private _persistToWebsqlClosure = () => this._persistToWebSql();

    constructor(
      public handler: DocumentStorageHandler) {

      this.uniqueKey = this.handler.uniqueKey ? this.handler.uniqueKey : getUniqueKey();
      this.document = this.handler.document ? this.handler.document : document;

      var pathElements = this._scanDomScripts();

      var openDatabase = this.handler.openDatabase;
      if (typeof openDatabase !== 'function') {
        this._loadInitialStateFromDom(pathElements);
        return;
      }

      this._db = openDatabase(this._dbName, 1, null);
      this._execSql(
        'select * in metadata', [],
        (result) => {
          if (!result.rows || !result.rows.length) {
            this._loadInitialStateFromDom(pathElements);
            return;
          }

          var lsEdited = safeParseDate(result.rows.item(0).edited);
          var domEdited = this._metadataElement ?
              safeParseDate(this._metadataElement.getAttribute('edited')) :
              null;
    
          if (!lsEdited || domEdited && domEdited > lsEdited)
            this._loadInitialStateFromDom(pathElements);
          else
            this._loadInitialStateFromWebSql(pathElements);
        });
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
        fullPath, true,
        s,
        this);

      this._docByPath[fullPath] = docState;

      return docState;
    }

    removeDocument(fullPath: string): DocumentState {
      throw new Error('Not implemented');
    }

   

    /**
     * Used from RuntimeDocumentState to trigger the saving of properties.
     * Potentially several changes can be saved together.
     */
    notifyDocChanged(docState: RuntimeDocumentState): void {
      if(!this._modifiedDocByPath)
        this._modifiedDocByPath = {};
      this._modifiedDocByPath[docState.fullPath()] = docState;

      if (!this._metadataElement) {
        this._metadataElement = appendScriptElement(document);
        this._metadataElement.id = 'path-metadata';
      }

      var edited = new Date().toUTCString();
      this._metadataElement.setAttribute('edited', edited);

      if (this._persistenceTimeout)
        clearTimeout(this._persistenceTimeout);
      this._persistenceTimeout = setTimeout(this._persistToWebsqlClosure);
    }

    private _persistToWebSql() {
      this._persistenceTimeout = 0;

      var collectSql: string[] = [];
      var collectArgs: any[] = [];
      // TODO: cycle through _modifiedDocByPath, concatenate SQL, issue _execSql
      for (var k in this._modifiedDocByPath) if (this._modifiedDocByPath.hasOwnProperty(k)) {
        var docState = this._modifiedDocByPath[k];
        docState.appendUpdateSql(collectSql, collectArgs);
      }
    }

    private _execSql(sql: string, args: any[], callback: Function) {
      this._db.transaction((t) => {
        t.executeSql(sql, args, callback);
      });
    }

    private _loadInitialStateFromDom(
      pathElements: { [fullPath: string]: HTMLScriptElement; }) {
      // pull everything from DOM, websql is older
      // (that's the case when they saved/downloaded a new file
      // overwriting the old file in place)
      for (var fullPath in pathElements) if (pathElements.hasOwnProperty(fullPath)) {
        var s = pathElements[fullPath];
        var docState = new RuntimeDocumentState(
          fullPath, true,
          s,
          this);
        this._docByPath[fullPath] = docState;
      }

      // TODO: push the changes to websql

      this.handler.documentStorageCreated(null, this);
    }

    private _loadInitialStateFromWebSql(
      pathElements: { [fullPath: string]: HTMLScriptElement; }) {
      // TODO: load from ***metadata table,
      // TODO: cycle through the documents and load them, 
      // TODO: recreate HTML DOM
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

  }

  class SqlUpdateRequest {
    constructor(public sql: string, public args: any[]) {
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
    private _tableName: string;
    private _modifiedProperties: any = null;

    private _updateSql: string = '';
    private _insertSql: string = '';

    constructor(
      private _fullPath: string,
      private _properties: any,
      private _storeElement: HTMLScriptElement,
      private _storage: RuntimeDocumentStorage) {
      this._tableName = this._storage.uniqueKey + this._fullPath;
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
      if (this._modifiedProperties && name in this._modifiedProperties[name])
        return this._modifiedProperties[name];
      else
        return this._properties[name];
    }

    setProperty(name: string, value: string) {
      if (value===this._properties[name])
        return;

      this._properties[name] = value;
      if (!this._modifiedProperties)
        this._modifiedProperties[name] = value;

      this._storage.notifyDocChanged(this);
    }


    appendUpdateSql(collectSql: string[], collectArgs: any[]){
      // TODO: handle table creation
      for (var k in this._modifiedProperties) if (this._modifiedProperties.hasOwnProperty(k)) {
        if (this._properties.hasOwnProperty(k))
          collectSql.push(this._updateSql);
        else
          collectSql.push(this._insertSql);

        collectArgs.push(k);
        collectArgs.push(this._modifiedProperties[k]);
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