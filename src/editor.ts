/// <reference path='typings/codemirror.d.ts' />

/// <reference path='persistence.ts' />

module teapo {

  // this is in fact of DocumentTypeRegistry
  export var DocumentEditorType: {

    // [name: string]: DocumentEditorType;

    getType(fullPath: string): DocumentEditorType;
  };

  export interface DocumentEditorType {
    canEdit(fullPath: string): boolean;
    editDocument(doc: DocumentState): Editor;
  }

  export interface Editor {
    open(): HTMLElement;
    close();
  }

  class DocumentEditorTypeRegistry {

    getType(fullPath: string): DocumentEditorType {
      for (var k in DocumentEditorType) if (DocumentEditorType.hasOwnProperty(k)) {
        var t = <DocumentEditorType>DocumentEditorType[k];
        if (t.canEdit && t.canEdit(fullPath)) return t;
      }

      return null;
    }
  }
  

  class TextDocumentEditorType implements DocumentEditorType {
    private _editor: CodeMirror.Editor = null;
    private _editorElement: HTMLElement = null;

    // codemirror needs another kick when first time displayed
    // (and since the editor is shared, we need to share this flag too)
    private _firstUse = { isFirstUse: true };

    constructor() {
    }

    static saveTimeout = 600;

    static standardEditorConfiguration(): CodeMirror.EditorConfiguration {
      return {
        lineNumbers: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        matchTags: true,
        showTrailingSpace: true,
        autoCloseTags: true,
        highlightSelectionMatches: {showToken: /\w/},
        styleActiveLine: true,
        // readOnly: 'nocursor',
        tabSize: 2,
        extraKeys: {"Tab": "indentMore", "Shift-Tab": "indentLess"},
        gutters: [ 'teapo-errors' ]        
      };
    }

    canEdit(fullPath: string) {
      return true;
    }

    editDocument(docState: DocumentState): Editor {
      if (!this._editor)
        this._initEditor();

      return new TextEditor(this._editor, this._editorElement, docState, this._firstUse);
    }

    private _initEditor() {
      var options = TextDocumentEditorType.standardEditorConfiguration();

      this._editor = CodeMirror(
        (editorElement) => this._editorElement = editorElement,
        options);
    }
  }

  class TextEditor implements Editor {
    private _doc: CodeMirror.Doc = null;
    private _saveTimeout = null;

    constructor(
      private _editor: CodeMirror.Editor,
      private _editorElement: HTMLElement,
      private _docState: DocumentState,
      private _firstUse: { isFirstUse: boolean; }) {
    }

    open(): HTMLElement {
      if (!this._doc) {
        var content = this._docState.getProperty(null);
        if (!content) content = '';

        if (this._firstUse.isFirstUse) {
          this._firstUse.isFirstUse = false;
          setTimeout(() => {
            this._editor.refresh();
            this._editor.focus();
          }, 1);
        }

        this._doc = new CodeMirror.Doc(content);

        var historyStr = this._docState.getProperty('history');
        if (historyStr) {
          try { var history = JSON.parse(historyStr); }
          catch (e) { }
          if (history)
            this._doc.setHistory(history);
        }

        CodeMirror.on(this._doc, 'change', (instance: CodeMirror.Doc, change: CodeMirror.EditorChange) => this._onchange(change));
      }

      this._editor.swapDoc(this._doc);
      this._editor.focus();

      return this._editorElement;
    }

    close() {
    }

    private _onchange(change: CodeMirror.EditorChange) {
      if (this._saveTimeout)
        clearTimeout(this._saveTimeout);
      this._saveTimeout = setTimeout(() => this._save(), TextDocumentEditorType.saveTimeout);
    }

    private _save() {
      this._docState.setProperty(null, this._doc.getValue());
    }
  }

  DocumentEditorType = new DocumentEditorTypeRegistry();
  DocumentEditorType['Plain Text'] = new TextDocumentEditorType();
}