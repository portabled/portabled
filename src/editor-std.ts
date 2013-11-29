/// <reference path='typings/codemirror.d.ts' />

/// <reference path='persistence.ts' />
/// <reference path='editor.ts' />

module teapo {

  /**
   * Basic implementation for a text-based editor.
   */
  export class CodeMirrorEditor implements Editor {
    private _doc: CodeMirror.Doc = null;
    private _invokeonchange: () => void;
    private _text: string = null;

    constructor(
      private _shared: CodeMirrorEditor.SharedState,
      public docState: DocumentState) {
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
        tabSize: 2,
        extraKeys: {"Tab": "indentMore", "Shift-Tab": "indentLess"}
      };
    }

    /**
     * Invoked when a file is selected in the file list/tree and brought open.
     */
    open(onchange: () => void): HTMLElement {
      // storing passed function
      // (it should be invoked for any change to trigger saving)
      this._invokeonchange = onchange;

      // this may actually create CodeMirror instance
      var editor = this.editor();

      editor.swapDoc(this.doc());

      // invoking overridable logic
      this.handleOpen();

      var element = this._shared.element;
      if (element && !element.parentElement)
        setTimeout(() => editor.refresh(), 1);
      return element;
    }

    /**
     * Invoked when file needs to be saved.
     */
    save() {
      // invoking overridable logic
      this.handleSave();
    }

    /**
     * Invoked when file is closed (normally it means another one is being opened).
     */
    close() {
      // should not try triggering a save when not opened
      this._invokeonchange = null;
      this.handleClose();
    }

    doc() {
      if (!this._doc)
        this._initDoc();
  
      return this._doc;
    }

    editor() {
      // note that editor instance is shared
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
    }

    handleChange(change: CodeMirror.EditorChange) {
    }

    handleClose() {
    }

    handleLoad() {
      if (this.docState) {
        this.doc().setValue(this.docState.getProperty(null) || '');
        this.doc().clearHistory();
      }
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
      var options = this._shared.options || CodeMirrorEditor.standardEditorConfiguration();
      this._doc =
        options.mode ? new CodeMirror.Doc('', options.mode) :
        new CodeMirror.Doc('');

      this.handleLoad();
      CodeMirror.on(
        this._doc,
        'change',
        (instance, change) => {

          // it is critical that _text is cleared on any change
          this._text = null;

          this._invokeonchange();
          this.handleChange(change);
        });
    }
  }

  export module CodeMirrorEditor {
    export interface SharedState {
      editor?: CodeMirror.Editor;
      element?: HTMLElement;
      options?: CodeMirror.EditorConfiguration;
    }
  }


  class PlainTextEditorType implements EditorType {
    private _shared: CodeMirrorEditor.SharedState = {};

    constructor() {
    }

    canEdit(fullPath: string): boolean {
      return true;
    }

    editDocument(docState: DocumentState): Editor {
      return new CodeMirrorEditor(this._shared, docState);
    }
  }

  export module EditorType {
    export var PlainText: EditorType = new PlainTextEditorType();
  }
}