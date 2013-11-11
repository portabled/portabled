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
    element.id = id;
    document.head.appendChild(element);
    return element;
  }

  export interface DocumentStore {
    changeDate(): Date;
    documentNames(): string[];
    loadDocument(name: string): { history: string; content: string; };
    saveDocument(name: string, history: string, content: string): void;
    deleteDocument(name: string): void;
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

    loadDocument(name: string): { history: string; content: string; } {
      var element = this._documentElements[name];
      if (!element)
        return null;
      var result = {
        history: element.getAttribute('history'),
        content: element.innerHTML
      };
      return result;
    }

    saveDocument(name: string, history: string, content: string) {
      var element = this._documentElements[name];
      if (!element) {
        element = appendScriptElement(name);
        this._documentElements[name] = element;
      }

      element.setAttribute('history', history);
      element.innerHTML = content;

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
      if (!this._changeDateElement) {
        this._changeDateElement = appendScriptElement('changeDate');
      }
      this._changeDateElement.innerHTML = new Date().toUTCString();
    }
  }

  export class LocalStorageStore implements DocumentStore {
    constructor(
      private _localStorage = localStorage,
      private _uniqueKey = getDocumentStoreUniqueKey()) {
    }

    changeDate(): Date {
      var str = this._localStorage[this._uniqueKey+'changeDate'];
      if (!str)
        return null;
      try { return new Date(str); }
      catch (e) { return null; }
    }

    documentNames(): string[] {
      var result: string[] = [];
      var expectedLead = this._uniqueKey + '/';
      for (var k in this._localStorage) if (this._localStorage.hasOwnProperty(k)) {
        var lead = k.slice(0,expectedLead.length);
        if (lead!==expectedLead)
          continue;
        result.push(k.slice(expectedLead.length-1));
      }
      return result;
    }

    loadDocument(name: string): { history: string; content: string; } {
      var str = this._localStorage[this._uniqueKey+name];
      if (!str) return null;
      return JSON.parse(str);
    }

    saveDocument(name: string, history: string, content: string): void {
      var d = { history: history, content: content };
      this._localStorage[this._uniqueKey+name] = JSON.stringify(d);
      this._localStorage[this._uniqueKey+'changeDate'] = new Date().toUTCString();
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