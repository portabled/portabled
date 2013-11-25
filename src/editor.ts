/// <reference path='persistence.ts' />

module teapo {

  var DocumentType: {
    [name: string]: DocumentType;
  };

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

    editDocument(docState: DocumentState): Editor {
      if (!this._editor)
        this._initEditor();

      return new TextEditor(this._editor, this._editorElement, docState);
    }

    private _initEditor() {
      var options = {
      };

      this._editor = CodeMirror(
        (editorElement) => this._editorElement = editorElement,
        options);
    }
  }

  class TextEditor implements Editor {
    private _doc: CodeMirror.Doc = null;
    constructor(
      private _editor: CodeMirror.Editor,
      private _editorElement: HTMLElement,
      private _docState: DocumentState) {
    }

    open(): HTMLElement {
      if (!this._doc) {
        this._doc = this._editor.getDoc();
        this._doc.setValue(this._docState.getProperty(null));

        var historyStr = this._docState.getProperty('history');
        if (historyStr) {
          try { var history = JSON.parse(historyStr); }
          catch (e) { }
          if (history)
            this._doc.setHistory(history);
        }
      }

      return this._editorElement;
    }

    close() {
    }
  }

  DocumentType = {
    "Plain Text": new TextDocumentType()
  };
}