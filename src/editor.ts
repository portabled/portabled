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
    private _editor: CodeMirror.Editor = null;
    private _editorElement: HTMLElement = null;

    constructor() {
    }

    editDocument(doc: DocumentState): Editor {
      return null;
    }

    private _initEditor() {
      var options = {
      };

      this._editor = CodeMirror(
        (editorElement) => this._editorElement = editorElement,
        options);
    }
  }
}