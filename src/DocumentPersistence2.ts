module teapo {

  /*export class PersistentDocumentStorage implements PersistentDocumentStorage.PersistentDocumentStorageSource {
    
  }*/

  module PersistentDocumentStorage {

    /**
     * Creating and appending a script element to the document.
     * Additionally, setting type to a non-JavaScript value, making sure browser doesn't try to parse it.
     */
    function appendScriptElement(d = document): HTMLScriptElement {
      var element = <HTMLScriptElement>d.createElement('script');
      element.setAttribute('type', 'text/data');
      document.head.appendChild(element);
      return element;
    }

    /**
     * Unified API for persisting the document list,
     * including active document name and states of all the documents.
     * Implementations use HTML DOM and localStorage.
     */
    export interface PersistentDocumentStorageSource {
      documents(): PersistentDocumentState[];
      addDocument(fullPath: string): PersistentDocumentState;
  
      getActiveDocument(): string;
      setActiveDocument(fullPath: string): void;
    }

    /**
     * Unified API for persisting state of one document.
     * Implementations use HTML DOM and localStorage.
     */
    export interface PersistentDocumentState {
      fullPath(): string;
  
      getContent(): string;
      getHistory(): any;
      getCursor(): { line: number; ch: number; };
      getSelectionStart(): { line: number; ch: number; };
      getSelectionEnd(): { line: number; ch: number; };
      getScrollTop(): number;
  
      setContent(content: string): void;
      setHistory(history: any): void;
      setCursorOffset(cursorPos: { line: number; ch: number; }): void;
      setSelectionStart(startPos: { line: number; ch: number; }): void;
      setSelectionEnd(endPos: { line: number; ch: number; }): void;
      setScrollTop(lineNumber: number): void;
  
      remove(): void;
    }

    /**
     * Impementing PersistentDocumentStateSource using HTML script elements.
     * This is the basic implementation supported on all browsers and platforms.
     */
    export class ScriptElementStorage {

      /** One dedicated HTML script element for metadata, such as active document. */
      private _metadataElement: HTMLScriptElement;
      private _documents: { [path: string]: ScriptElementDocument; } = {};

      /** Static documents are useful for special 'invisible' data streams like lib.d.ts used by TypeScript. */
    	private _staticDocuments: { [path: string]: string; } = {};

      constructor(private _document = document) {
        for (var i = 0; i < this._document.scripts.length; i++) {
          var s = <HTMLScriptElement>this._document.scripts[i];
       		var path = s.getAttribute('path') || '';
       
          if (path.charAt(0)==='/') {
            var d: ScriptElementDocument;
            d = new ScriptElementDocument(s, () => this._documentRemoved(d), this._document);
            this._documents[path] = d;
          }

          var staticPath = s.getAttribute('staticPath') || '';
          if (staticPath.charAt(0)==='#') {
            this._staticDocuments[staticPath] = s.innerHTML;
          }

          if (s.id === 'metadata') {
          	this._metadataElement = s;
          }
        }
      }

      documents(): PersistentDocumentState[] {
        var result: PersistentDocumentState[] = [];
        for (var k in this._documents) if (this._documents.hasOwnProperty(k)) {
        	result.push(this._documents[k]);
        }
        return result;
      }

      addDocument(fullPath: string): PersistentDocumentState {
        var s = appendScriptElement(this._document);
        s.setAttribute('path', fullPath);
        var d: ScriptElementDocument;
        d = new ScriptElementDocument(s, () => this._documentRemoved(d), this._document);
        this._document.body.appendChild(s);
        this._documents[fullPath] = d;
        return d;
      }
  
      getActiveDocument(): string {
        if (this._metadataElement)
          return this._metadataElement.getAttribute('activeDocument');
        else
          return null;
      }

      setActiveDocument(fullPath: string): void {
        if (!this._metadataElement) {
          this._metadataElement = appendScriptElement(this._document);
          this._metadataElement.id = 'metadata';
        }
        this._metadataElement.setAttribute('activeDocument', fullPath);
      }

      private _documentRemoved(d: ScriptElementDocument) {
        delete this._documents[d.fullPath()];
      }
   }

  	/**
     * Persisting document state into DOM element.
     */
    class ScriptElementDocument implements PersistentDocumentState {
      constructor(
        private _element: HTMLScriptElement,
        private _onremove: () => void,
        private _document: typeof document) {
      }
  
      fullPath(): string {
        return this._element.getAttribute('path');
      }
    
      getContent(): string {
        return this._element.innerHTML;
      }
  
      getHistory(): any {
        var historyStr = this._element.getAttribute('history');
        if (!historyStr) return null;
  
        try {
          return JSON.parse(historyStr);
        }
        catch (e) {
          return null;
        }
      }
  
      getCursor(): { line: number; ch: number; } {
        return this._getPosProperty('cursor');
      }
  
      getSelectionStart(): { line: number; ch: number; } {
        return this._getPosProperty('selectionStart');
      }
  
      getSelectionEnd(): { line: number; ch: number; }  {
        return this._getPosProperty('selectionEnd');
      }
  
      getScrollTop(): number {
        return this._getNumberProperty('scrollTop');
      }
      
      setContent(content: string): void {
        this._element.innerHTML = content;
      }
  
      setHistory(history: any): void {
        var historyStr: string;
        try {
          historyStr = history===null || typeof history==='undefined' ? null : JSON.stringify(history);
        }
        catch (e) {
          historyStr = null;
        }
        this._element.setAttribute('history', historyStr);
      }
  
      setCursorOffset(cursorPos: { line: number; ch: number; }): void {
        this._setPosProperty('cursor', cursorPos);
      }
  
      setSelectionStart(startPos: { line: number; ch: number; }): void {
        this._setPosProperty('selectionStart', startPos);
      }
  
      setSelectionEnd(endPos: { line: number; ch: number; }): void {
        this._setPosProperty('selectionEnd', endPos);
      }
  
      setScrollTop(lineNumber: number): void {
        this._setProperty('scrollTop', lineNumber);
      }
      
      remove(): void {
        this._document.body.removeChild(this._element);
        if (this._onremove)
          this._onremove();
      }
  
      private _getNumberProperty(name: string): number {
          var str = this._element.getAttribute(name);
        if (!str) return null;
        try {
          return parseInt(str);
        }
        catch (e) {
          return null;
        }
      }
  
      private _getPosProperty(name: string): { line: number; ch: number; } {
        var line = this._getNumberProperty(name+'.line');
        var ch = this._getNumberProperty(name+'.ch');
        if (line!==null || ch !==null)
          return { line: line || 0, ch: ch || 0 };
        else
          return null;
      }
  
      private _getJsonProperty(name: string): any {
          var str = this._element.getAttribute(name);
        if (!str) return null;
        try {
          return JSON.parse(str);
        }
        catch (e) {
          return null;
        }
      }
  
      private _setProperty(name: string, value: any) {
        this._element.setAttribute(name, value);
      }
  
      private _setPosProperty(name: string, pos: { line: number; ch: number; }) {
        this._setProperty(name+'.line', pos ? pos.line : null);
        this._setProperty(name+'.ch', pos ? pos.ch : null);
      }
    }

  	export function getUniqueKey(w = window): string {
      var key = w.location.href;
      key = key.split('#')[0];
      if (key.length > 'index.html' && key.slice(key.length - 'index.html'.length).toLowerCase()==='index.html')
        key = key.slice(0, key.length-'index.html'.length);
			key = '[teapo]'+key;
      return key;
    }

    export class LocalStorageDocumentStorageSource implements PersistentDocumentStorageSource {

      private _documents: { [path: string]: LocalStorageDocumentStorage; } } = {};

      constructor(
        private _baseSource: PersistentDocumentStorageSource,
        private _uniqueKey: string = getUniqueKey(),
        private _localStorage = localStorage) {

        var filesStr = this._localStorage[this._uniqueKey+'*files'];
        if (filesStr) {
          var fileList: string[];
          try {
            fileList = JSON.parse(filesStr);
          }
          catch (e) {
          	fileList = null;
          }

          if (fileList) {
          	for (var i = 0; i < fileList.length; i++) {
              
            }
          }
                               
        }
      }

      documents(): PersistentDocumentState[] {
      }

      addDocument(fullPath: string): PersistentDocumentState {
        
      }
  
      getActiveDocument(): string {
        
      }

      setActiveDocument(fullPath: string): void {
        
      }
    }

    class LocalStorageDocumentStorage {
      constructor(private _fullPath: string, private _uniqueKey: string, private _localStorage: typeof localStorage) {
      }
    }
  }
}