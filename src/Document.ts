/// <reference path='typings/knockout.d.ts' />
/// <reference path='typings/codemirror.d.ts' />

/// <reference path='Folder.ts' />
/// <reference path='modes.ts' />

module teapo {
  export class Document {

    fullPath: string;
    doc: CodeMirror.Doc;

    isActive = ko.observable(false);
    isRemoved = ko.observable(false);

    constructor(
      public name: string, public parent: teapo.Folder,
      content: string,
      history: any) {
      
      this.fullPath = (parent ? (parent.fullPath==='/' ? '' : parent.fullPath) : '') + '/' + name;
      this.doc = new CodeMirror.Doc(content || '', detectDocumentMode(this.fullPath);

      if (history)
        this.doc.setHistory(history);
    }

    remove() {
    }
  }
}