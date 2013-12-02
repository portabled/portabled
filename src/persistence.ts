/// <reference path='typings/webSql.d.ts' />

/// <reference path='editor.ts' />
/// <reference path='files.ts' />

module teapo {

  /**
   * Encapsulating all necessary for storing documents, metadata and properties.
   */
  export interface DocumentStorage {
    /**
     * Returns EditorType object handling editor behavior for a given file.
     * Expected to be populated externally.
     */
    typeResolver: { getType(fullPath: string): EditorType; };

    /**
     * Returns FileEntry object representing the file in list/tree.
     * Expected to be populated externally.
     */
    entryResolver: { getFileEntry(fullPath: string): FileEntry; };

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

  export function openStorage(callback: (storage: DocumentStorage) => void): void {
    
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
    type(): EditorType {
      if (!this._docState.type)
        this._docState.type = this._docState.runtime.storage.typeResolver.getType(this._docState.fullPath);
      return this._docState.type;
    }

    /**
     * Retrieves object encapsulating editor behaviour for the document.
     */
    editor(): Editor {
      if (!this._docState.editor)
        this._docState.editor = this.type().editDocument(this);

      return this._docState.editor;
    }

    currentEditor(): Editor {
      return this._docState.editor;
    }

    /**
     * Retrieves object representing a node in the file list or tree view.
     */
    fileEntry(): FileEntry {
      if (this._docState.fileEntry)
        this._docState.fileEntry = this._docState.runtime.storage.entryResolver.getFileEntry(this._docState.fullPath);
      return this._docState.fileEntry;
    }

    /**
     * Retrieves property value from whatever persistence mechanism is implemented.
     */
    getProperty(name: string): string {
      if (!this._docState.loadFromDom) {
        var slotName = this._docState.localStorageKey + (name?name:'');
        var localValue = this._docState.runtime.storage.localStorage[slotName];
        if (typeof localValue!=='undefined')
          return localValue;
      }

      if (name)
        return this._docState.storeElement.getAttribute('data-'+name);
      else
        return this._docState.storeElement.innerHTML;
    }

    /**
     * Persists property value.
     */
    setProperty(name: string, value: string): void {
      var valueStr = value ? value : '';
      if (name)
        this._docState.storeElement.setAttribute('data-'+name, valueStr);
      else
        this._docState.storeElement.innerHTML = valueStr;

      var slotName = this._docState.localStorageKey + (name?name:'');
      this._docState.runtime.storage.localStorage[slotName] = valueStr;

      this._docState.runtime.docChanged(this._docState);
    }

    /**
     * Retrieves transient property value from whatever persistence mechanism is implemented.
     * Transient properties live within a local browser setup and are not persisted in HTML DOM.
     */
    getTransientProperty(name: string): string {
      var slotName = this._docState.localStorageKey + '~*' + name;
      return this._docState.runtime.storage.localStorage[slotName];
    }

    /**
     * Persists property value.
     * Transient properties live within a local browser setup and are not persisted in HTML DOM.
     */
    setTransientProperty(name: string, value: string): void {
      var slotName = this._docState.localStorageKey + '~*' + name;
      this._docState.runtime.storage.localStorage[slotName] = value;
      this._docState.runtime.docChanged(this._docState);
    }
  }   


  class RuntimeDocumentStorage implements DocumentStorage {

    /** Needed to separate data slots for file:// scheme. */
    uniqueKey: string = getUniqueKey();

    /**
     * Returns EditorType object handling editor behavior for a given file.
     * Expected to be populated externally.
     */
    typeResolver: { getType(fullPath: string): EditorType; } = null;

    /**
     * Returns FileEntry object representing the file in list/tree.
     * Expected to be populated externally.
     */
    entryResolver: { getFileEntry(fullPath: string): FileEntry; } = null;

    private _metadataElement: HTMLScriptElement = null;
    private _docByPath: { [name: string]: RuntimeDocumentState; } = {};

    private _dbName = 'teapo';
    private _db;

    constructor(
      private _callback: (storage: RuntimeDocumentStorage) => void) {

      var pathElements = this._scanDomScripts();

      if (typeof openDatabase === 'undefined') {
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

          var lsEdited = safeParseDate(result.rows.item(i).edited);
          var domEdited = this._metadataElement ?
              safeParseDate(this._metadataElement.getAttribute('edited')) :
              null;
    
          if (!lsEdited || domEdited && domEdited > lsEdited)
            this._loadInitialStateFromDom(pathElements);
          else
            this._loadInitialStateFromLocalStorage(pathElements);
        });
    }

    documentNames(): string[] {
      return Object.keys(this._docByPath);
    }

    getDocument(fullPath: string): DocumentState {
      return this._docByPath[fullPath].doc;
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

      this._storeFilenamesToLocalStorage();
      this._storeEdited();

      return docState.doc;
    }

    removeDocument(fullPath: string): DocumentState {
      var docState = this._docByPath[fullPath];
      if (!docState)
        throw new Error('File does not exist: '+fullPath+'.');
  
      docState.storeElement.parentElement.removeChild(docState.storeElement);

      for (var k in this._localStorage) if (this._localStorage.hasOwnProperty(k)) {
        if (k.length>=docState.localStorageKey
            && k.slice(0, docState.localStorageKey.length)===docState.localStorageKey)
          delete this._localStorage[k];
      }
      return docState;
    }


    docChanged(docState: RuntimeDocumentState) {
      this.storeEdited();
    }

    storeFilenamesToLocalStorage() {
      var files = Object.keys(this._docByPath);
      var filesStr = files.join('\n');
      this._lsSet('files', filesStr);
    }

    storeEdited() {
      this.storeFilenamesToLocalStorage();

      var edited = new Date().toUTCString();
      this._lsSet('edited', edited);

      if (!this.metadataElement) {
        this.metadataElement = appendScriptElement(this.storage.document);
        this.metadataElement.id = 'path-metadata';
      }
  
      this.metadataElement.setAttribute('edited', edited);
    }

    private _execSql(sql: string, args: any[], callback: Function) {
      this._db.transaction((t) => {
        t.executeSql(sql, args, callback);
      });
    }

    private _loadInitialStateFromLocalStorage(pathElements: { [fullPath: string]: HTMLScriptElement; }) {
      var lsFilenames = this._loadFilenamesFromLocalStorage();
      if (lsFilenames) {
        for (var i = 0; i < lsFilenames.length; i++) {
          var lsFullPath = lsFilenames[i];
          var s = pathElements[lsFullPath];
          if (s) {
            // TODO: clear DOM attributes
            
          }
          else {
            s = appendScriptElement(this.storage.document);
            s.setAttribute('data-path', lsFullPath);
          }
          var docState = new RuntimeDocumentState(
            lsFullPath, false,
            s,
            this);
          this.docByPath[lsFullPath] = docState;
  
          // leave only DOM elements that are redundant
          delete pathElements[lsFullPath];
        }
      }

      // remove redundant DOM elements,
      // as we consider localStorage the true state
      for (var fullPath in pathElements) if (pathElements.hasOwnProperty(fullPath)) {
        var s = pathElements[fullPath];
        s.parentElement.removeChild(s);
      }
    }

    private _loadInitialStateFromDom(pathElements: { [fullPath: string]: HTMLScriptElement; }) {
      // pull everything from DOM, localStorage is older
      // (that's the case when they saved/downloaded a new file
      // overwriting the old file in place)
      for (var fullPath in pathElements) if (pathElements.hasOwnProperty(fullPath)) {
        var s = pathElements[fullPath];
        var docState = new RuntimeDocumentState(
          fullPath, true,
          s,
          this);
        this.docByPath[fullPath] = docState;
      }

      // clean old stuff from localStorage
      var deletePrefix = this.storage.uniqueKey + '/';
      for (var k in this.storage.localStorage) if (this.storage.localStorage.hasOwnProperty(k)) {
        if (k.length>=deletePrefix.length && k.slice(0,deletePrefix.length) === deletePrefix)
          delete this.storage.localStorage[k];
      }

      this._callback(this);
      this._callback = null;
    }

    private _loadFilenamesFromLocalStorage(): string[] {
      var filenamesStr = this._lsGet('files');
      if (filenamesStr)
        return filenamesStr.split('\n');
      else
        return null;
    }

    private _scanDomScripts() {
      var pathElements: { [name: string]: HTMLScriptElement; } = {};

      for (var i = 0; i < this.storage.document.scripts.length; i++) {
        var s = <HTMLScriptElement>this.storage.document.scripts[i];
        var path = s.getAttribute('data-path');
        if (path) {
          if (path.charAt(0)==='/' || path.charAt(0)==='#') {
            pathElements[path] = s;
          }
        }
        else if (s.id==='storageMetadata') {
          this.metadataElement = s;
        }
      }

      return pathElements;
    }

    private _lsGet(name: string): string {
      return this.storage.localStorage[this.storage.uniqueKey+name];
    }

    private _lsSet(name: string, value: string) {
      this.storage.localStorage[this.storage.uniqueKey+name] = value;
    }
  }

  /**
   * Standard implementation of DocumentState.
   * This class is not exposed outside of this module.
   */
  class RuntimeDocumentState {
    doc: DocumentState;
    type: EditorType = null;
    editor: Editor = null;
    fileEntry: FileEntry = null;
    localStorageKey: string;

    constructor(
      public fullPath: string,
      public loadFromDom: boolean,
      public storeElement: HTMLScriptElement,
      public runtime: RuntimeDocumentStorage) {
      this.localStorageKey = this.runtime.storage.uniqueKey + fullPath;
      this.doc = new DocumentState(this);
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