/// <reference path='persistence.ts' />

module teapo {

  var DocumentType: {
    [name: string]: DocumentType;
  } = {};

  export interface DocumentType {
    editDocument(doc: DocumentState): Editor;
  }

  export interface Editor {
    open(): HTMLElement;
    close();
  }

  class TextDocumentType implements DocumentType {
    private _editor: CodeMirror = null;

    constructor() {
    }

    editDocument(doc: DocumentState): Editor {
      return null;
    }

    
  }
}