/// <reference path='typings/codemirror.d.ts' />

/// <reference path='persistence.ts' />
/// <reference path='editor.ts' />

module teapo {

  export class CodeMirrorEditor implements Editor {
    private _doc: CodeMirror.Doc = null;
    private _invokeonchange: () => void;
    private _text: string = null;

    constructor(private _shared: CodeMirrorEditorSharedState, public docState?: DocumentState) {
    }

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
        extraKeys: {"Tab": "indentMore", "Shift-Tab": "indentLess"}
      };
    }

    open(onchange: () => void): HTMLElement {
      this._invokeonchange = onchange;

      var editor = this.editor();

      var element = this._shared.element;
      if (element && !element.parentElement)
        setTimeout(() => editor.refresh(), 1);
  
      editor.swapDoc(this.doc());
  
      this.handleOpen();

      return element;
    }

    save() {
      this.handleSave();
    }

    close() {
      this._invokeonchange = null;
      this.handleClose();
    }

    doc() {
      if (!this._doc)
        this._initDoc();
  
      return this._doc;
    }

    editor() {
      if (!this._shared.editor)
        this._initEditor();

      return this._shared.editor;
    }

    text(): string {
      if (!this._text) {
        if (this._doc)
          this._text= this._doc.getValue();
        else
          this._text = this.docState.getProperty(null);
      }
      return this._text;
    }

    handleOpen() {
      if (this.docState)
        this.doc().setValue(this.docState.getProperty(null) || '');
    }

    handleChange(change: CodeMirror.EditorChange) {
    }

    handleClose() {
    }

    handleSave() {
      if (this.docState)
        this.docState.setProperty(null, this.text());
    }

    private _initEditor() {
      var options = this._shared.options || CodeMirrorEditor.standardEditorConfiguration();
      this._shared.editor = CodeMirror(
        (element) => this._shared.element = element,
        options);
    }

    private _initDoc() {
      this._doc = new CodeMirror.Doc('');
      CodeMirror.on(
        this._doc,
        'change',
        (instance, change) => {
          this._text = null;
          this._invokeonchange();
          this.handleChange(change);
        });
    }
  }

  export interface CodeMirrorEditorSharedState {
    editor?: CodeMirror.Editor;
    element?: HTMLElement;
    options?: CodeMirror.EditorConfiguration;
  }


  class TextDocumentEditorType implements DocumentEditorType {
    private _shared: CodeMirrorEditorSharedState = {};

    constructor() {
    }

    canEdit(fullPath: string): boolean {
      return true;
    }

    editDocument(docState: DocumentState): Editor {
      return new CodeMirrorEditor(this._shared, docState);
    }
  }

  DocumentEditorType['Plain Text'] = new TextDocumentEditorType();
}