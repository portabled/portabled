/// <reference path='typings/codemirror.d.ts' />

module teapo {
  
  export function getDocumentStoreUniqueKey(w = window): string {
    var url = w.location + '';
    var posHash = url.indexOf('#');
    if (posHash>=0)
      url = url.slice(0,posHash);
    return url;
  }
  
  export function appendScriptElement(id: string, d = document): HTMLScriptElement {
    var element = document.createElement('script');
    element.setAttribute('type', 'text/data');
    element.id = id;
    document.head.appendChild(element);
    return element;
  }
  
  export interface DocumentStore {
    changeDate(): Date;
    documentNames(): string[];
    loadDocument(name: string): DocumentStoreEntry;
    saveDocument(name: string, doc: DocumentStoreEntry): void;
    deleteDocument(name: string): void;
  }

  export interface DocumentStoreEntry {
    content?: string;
    history?: string;

    cursor?: number;
    selectionStart?: number;
    selectionEnd?: number;
    scrollTop?: number;
  }
  
  export class ScriptElementStore implements DocumentStore {
    private _changeDate: Date = null;
    private _changeDateElement: HTMLScriptElement= null;
    private _documentElements: any = {};
    private _staticDocuments: any = {};
  
    constructor(private _document = document) {
      for (var i = 0; i < this._document.scripts.length; i++) {
        var s = <HTMLScriptElement>this._document.scripts[i];
        if (!s.id) continue;
        
        if (s.id.charAt(0)==='/') {
          this._documentElements[s.id] = s;
        }
        else if (s.id==='changeDate') {
          this._changeDateElement = s;
          try {
            this._changeDate = new Date(s.innerHTML);
          }
          catch (e) { }
        }
        else if(s.id.charAt(0)==='#') {
          this._staticDocuments[s.id] = s.innerHTML;
        }
      }
    }
    
    changeDate() {
      return this._changeDate;
    }
    
    documentNames(): string[] {
      return Object.keys(this._documentElements);
    }
    
    loadDocument(name: string): DocumentStoreEntry {
      var element = this._documentElements[name];
      if (!element)
        return null;

      var history = element.getAttribute('history');
      var content = element.innerHTML;
      try { var cursor = parseInt(element.getAttribute('cursor')); } catch (e) { }
      try { var selectionStart = parseInt(element.getAttribute('selectionStart')); } catch (e) { }
      try { var selectionEnd = parseInt(element.getAttribute('selectionEnd')); } catch (e) { }
      try { var scrollTop = parseInt(element.getAttribute('scrollTop')); } catch (e) { }

      var result = {
        history: history,
        content: content,
        cursor: cursor,
        selectionStart: selectionStart,
        selectionEnd: selectionEnd,
        scrollTop: scrollTop
      };
      return result;
    }
    
    saveDocument(name: string, doc: DocumentStoreEntry) {
      var element = this._documentElements[name];
      if (!element) {
        element = appendScriptElement(name);
        this._documentElements[name] = element;
      }
      
      if ('content' in doc)
        element.innerHTML = doc.content;
      if ('history' in doc)
        element.setAttribute('history', doc.history);
      if ('cursor' in doc)
        element.setAttribute('cursor', doc.cursor);
      if ('selectionStart' in doc)
        element.setAttribute('selectionStart', doc.selectionStart);
      if ('selectionEnd' in doc)
        element.setAttribute('selectionEnd', doc.selectionEnd);
      if ('scrollTop' in doc)
        element.setAttribute('scrollTop', doc.scrollTop);
      
      this._updateChangeDate();
    }
    
    deleteDocument(name: string): void {
      var element = this._documentElements[name];
      if (!element)
        return;
      
      document.head.removeChild(element);
      delete this._documentElements[name];
      
      this._updateChangeDate();
    }
    
    staticDocumentNames(): string[] {
      return Object.keys(this._staticDocuments);
    }
    
    readStaticDocument(name: string) {
      return this._staticDocuments[name];
    }
    
    
    private _updateChangeDate() {
      if (!this._changeDateElement)
        this._changeDateElement = appendScriptElement('changeDate');

      this._changeDateElement.innerHTML = new Date().toUTCString();
    }
  }
  
  export class LocalStorageStore implements DocumentStore {
    constructor(
      private _baseStore: DocumentStore,
      private _uniqueKey = getDocumentStoreUniqueKey(),
      private _localStorage = localStorage) {
    }
    
    changeDate() {
      var str = this._localStorage[this._uniqueKey+'changeDate'];
      if (!str)
        return this._baseStore.changeDate();

      try { return new Date(str); }
      catch (e) { return this._baseStore.changeDate(); }
    }
    
    documentNames(): string[] {
      var filesStr = this._localStorage[this._uniqueKey+'*files'];
      if (!filesStr) return this._baseStore.documentNames();
      try {
        return JSON.parse(filesStr);
      }
      catch (ignoreJsonErrors) {
        return this._baseStore.documentNames();
      }
    }
    
    loadDocument(name: string): DocumentStoreEntry {
      var content = this._localStorage[this._uniqueKey+name];
      if (content !== '' && !content) return this._fallbackLoadDocument(name);
      var history = this._localStorage[this._uniqueKey+name+'*history'];
      try { var cursor = parseInt(this._localStorage[this._uniqueKey+name+'*cursor']); } catch (e) { }
      try { var selectionStart = parseInt(this._localStorage[this._uniqueKey+name+'*selectionStart']); } catch (e) { }
      try { var selectionEnd = parseInt(this._localStorage[this._uniqueKey+name+'*selectionEnd']); } catch (e) { }
      try { var scrollTop = parseInt(this._localStorage[this._uniqueKey+name+'*scrollTop']); } catch (e) { }
      return {
        history: history,
        content: content,
        cursor: cursor,
        selectionStart: selectionStart,
        selectionEnd: selectionEnd,
        scrollTop: scrollTop
      };
    }
    
    private _fallbackLoadDocument(name: string) {
      var files = this.documentNames();
      for (var i = 0; i < files.length; i++) {
        if (files[i]===name)
          return this._baseStore.loadDocument(name);
      }
      return null;
    }
    
    saveDocument(name: string, doc: DocumentStoreEntry): void {
      var wasPreviousContent = this._uniqueKey+name in this._localStorage;

      if ('content' in doc)
        this._localStorage[this._uniqueKey+name] = doc.content;
      if ('history' in doc)
        this._localStorage[this._uniqueKey+name+'*history'] = doc.history;
      if ('cursor' in doc)
        this._localStorage[this._uniqueKey+name+'*cursor'] = doc.cursor;
      if ('selectionStart' in doc)
        this._localStorage[this._uniqueKey+name+'*selectionStart'] = doc.selectionStart;
      if ('selectionEnd' in doc)
        this._localStorage[this._uniqueKey+name+'*selecionEnd'] = doc.selectionEnd;
      if ('scrollTop' in doc)
        this._localStorage[this._uniqueKey+name+'*scrollTop'] = doc.scrollTop;

      this._localStorage[this._uniqueKey+'*changeDate'] = new Date().toUTCString();

      if (!wasPreviousContent) {
        var files = this.documentNames();
        files.push(name);
        this._localStorage[this._uniqueKey+'*files'] = files;
      }
    }
    
    deleteDocument(name: string): void {
      var mangled = this._uniqueKey+name;
      if (!this._localStorage[mangled])
        return;
    
      delete this._localStorage[mangled];
      this._localStorage[this._uniqueKey+'changeDate'] = new Date().toUTCString();
    }
  }
}