/// <reference path='editor.ts' />
/// <reference path='files.ts' />

module teapo {

  /**
   * Encapsulating all necessary for storing documents, metadata and properties.
   */
  export class DocumentStorage {

    private _docByPath: { [name: string]: RuntimeDocumentState; } = {};

    constructor(
      private _typeResolver: (fullPath: string) => DocumentType,
      private _entryResolver: (fullPath: string) => FileEntry,
      private _uniqueKey = getUniqueKey(),
      private _document = document,
      private _localStorage = localStorage) {
      // TODO: apart from localStorage support better local access API
      this._loadInitialState();
    }

    /**
     * Full paths of all files.
     */
    documentNames(): string[] {
      return Object.keys(this._docByPath);
    }

    /**
     * Given a path retrieves an object for reading and writing document state,
     * also exposes runtime features like editor and entry in the file list.
     */
    getDocument(fullPath: string): DocumentState {
      return this._docByPath[fullPath];
    }

    createDocument(fullPath: string): DocumentState {
      if (this._docByPath[fullPath])
        throw new Error('File already exists: '+fullPath+'.');

      var s = appendScriptElement(this._document);
      var docState = new RuntimeDocumentState(
        fullPath, true,
        s,
        this._document,
        this._localStorage,
        this._uniqueKey + fullPath,
        this._typeResolver,
        this._entryResolver);
      this._docByPath[fullPath] = docState;
      return docState;
    }

    private _loadInitialState() {
      var domElements = this._findDomElements();

      var lsEdited = safeParseDate(this._lsGet('edited'));
      var domEdited = domElements.metadataElement ?
          safeParseDate(domElements.metadataElement.getAttribute('edited')) :
          null;

      if (!lsEdited || domEdited && domEdited > lsEdited)
        this._loadInitialStateFromLocalStorage(domElements);
      else
        this._loadInitialStateFromDom(domElements);
    }

    private _loadInitialStateFromDom(domElements: InitialDomElements) {
      var lsFilenames = this._loadFilenamesFromLocalStorage();
      for (var i = 0; i < lsFilenames.length; i++) {
        var lsFullPath = lsFilenames[i];
        var s = domElements.pathElements[lsFullPath];
        if (s) {
          // TODO: clear DOM attributes
          
        }
        else {
          s = appendScriptElement(this._document);
          s.setAttribute('data-path', lsFullPath);
        }
        var docState = new RuntimeDocumentState(
          lsFullPath, false,
          s,
          this._document,
          this._localStorage,
          this._uniqueKey + lsFullPath,
          this._typeResolver,
          this._entryResolver);
        this._docByPath[lsFullPath] = docState;

        // leave only DOM elements that are redundant
        delete domElements.pathElements[lsFullPath];
      }

      // remove redundant DOM elements,
      // as we consider localStorage the true state
      for (var fullPath in domElements.pathElements) if (domElements.pathElements.hasOwnProperty(fullPath)) {
        var s = <HTMLScriptElement>domElements.pathElements[fullPath];
        s.parentElement.removeChild(s);
      }
    }

    private _loadInitialStateFromLocalStorage(domElements: InitialDomElements) {
      // pull everything from DOM, localStorage is older
      // (that's a case when they saved/downloaded a new file
      // overwriting the old file in place)
      for (var fullPath in domElements.pathElements) if (domElements.pathElements.hasOwnProperty(fullPath)) {
        var s = domElements.pathElements[fullPath];
        var docState = new RuntimeDocumentState(
          fullPath, false,
          s,
          this._document,
          this._localStorage,
          this._uniqueKey+fullPath,
          this._typeResolver,
          this._entryResolver);
        this._docByPath[fullPath] = docState;
      }

      // clean old stuff from localStorage
      var deletePrefix = this._uniqueKey + '/';
      for (var k in this._localStorage) if (this._localStorage.hasOwnProperty(k)) {
        if (k.length>=deletePrefix.length && k.slice(0,deletePrefix.length) === deletePrefix)
          delete this._localStorage[k];
      }
    }

    private _loadFilenamesFromLocalStorage(): string[] {
      var filenamesStr = this._lsGet('files');
      if (filenamesStr)
        return filenamesStr.split('\n');
      else
        return null;
    }

    private _findDomElements(): InitialDomElements {
      var metadataElement: HTMLScriptElement;
      var pathElements: { [name: string]: HTMLScriptElement; } = {};
      var staticContent: { [name: string]: string; } = {};

      for (var i = 0; i < this._document.scripts.length; i++) {
        var s = <HTMLScriptElement>this._document.scripts[i];
        var path = s.getAttribute('data-path');
        if (path) {
          if (path.charAt(0)==='/') {
            pathElements[path] = s;
          }
          else if (path.charAt(0)==='#') {
            staticContent[path] = s.innerHTML;
          }
        }
        else if (s.id==='storageMetadata') {
          metadataElement = s;
        }
      }

      return {
        pathElements: pathElements,
        staticContent: staticContent,
        metadataElement: metadataElement
      };
    }

    private _lsGet(name: string): string {
      return this._localStorage[this._uniqueKey+name];
    }

    private _lsSet(name: string, value: string) {
      this._localStorage[this._uniqueKey+name] = value;
    }

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
    type(): DocumentType;

    /**
     * Retrieves object encapsulating editor behaviour for the document.
     */
    editor(): Editor;

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

    /**
     * Retrieves transient property value from whatever persistence mechanism is implemented.
     * Transient properties live within a local browser setup and are not persisted in HTML DOM.
     */
    getTransientProperty(name: string): string;

    /**
     * Persists property value.
     * Transient properties live within a local browser setup and are not persisted in HTML DOM.
     */
    setTransientProperty(name: string, value: string): void;
  }

  interface InitialDomElements {
    metadataElement: HTMLScriptElement;
    pathElements: { [name: string]: HTMLScriptElement; };
    staticContent: { [name: string]: string; };
  }
    

  /**
   * Standard implementation of DocumentState.
   * This class is not exposed outside of this module.
   */
  class RuntimeDocumentState implements teapo.DocumentState {
    private _type: DocumentType = null;
    private _editor: Editor = null;
    private _fileEntry: FileEntry = null;

    constructor(
      private _fullPath: string,
      private _loadFromDom: boolean,
      private _storeElement: HTMLScriptElement,
      private _document: typeof document,
      private _localStorage: typeof localStorage,
      private _localStorageKey: string,
      private _typeResolver: (fullPath: string) => DocumentType,
      private _entryResolver: (fullPath: string) => FileEntry) {
    }

    fullPath(): string { return this._fullPath; }

    type(): DocumentType {
      if (!this._type)
        this._type = this._typeResolver(this._fullPath);
      return this._type;
    }

    editor(): Editor {
      if (!this._editor)
        this._editor = this.type().editDocument(this);
      return this._editor;
    }

    fileEntry(): FileEntry {
      if (this._fileEntry)
        this._fileEntry = this._entryResolver(this._fullPath);
      return this._fileEntry;
    }

    getProperty(name: string): string {
      if (this._loadFromDom) {
        if (name)
          return this._storeElement.getAttribute('data-'+name);
        else
          return this._storeElement.innerHTML;
      }
      else {
        var slotName = this._localStorageKey + '*' + name;
        return this._localStorage[slotName];
      }
    }

    setProperty(name: string, value: string): void {
      this._storeElement.setAttribute('data-'+name, value);
      var slotName = this._localStorageKey + '*' + name;
      this._localStorage[slotName] = value;
    }

    getTransientProperty(name: string): string {
      return null;
    }

    setTransientProperty(name: string, value: string): void {
      // 
    }
  }

  function getUniqueKey(): string {
    return window.location.href;
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
    doc.body.appendChild(doc);
    return s;
  }
}