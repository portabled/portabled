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

    static standardEditorConfiguration(): CodeMirror.Options {
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

      this._shared.editor = this;

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

      if (this._shared.editor===this)
        this._shared.editor = null;

      // should not try triggering a save when not opened
      this._invokeonchange = null;
      this.handleClose();
    }

    /**
     * Retrieve CodeMirror.Doc that is solely used for this document editing.
     */
    doc() {
      if (!this._doc)
        this._initDoc();

      return this._doc;
    }

    /**
     * Retrieve CodeMirror editor that normally is shared with other documents of the same type.
     * Be careful not to use it when this specific document is closed.
     */
    editor() {
      // note that editor instance is shared
      if (!this._shared.cm)
        this._initEditor();

      return this._shared.cm;
    }

    /**
     * Retrieve the text of this document.
     * This property is cached, so retrieving the text is cheap between the edits.
     * If the document has never been edited, the text is retrieved from the storage instead,
     * which is much cheaper still.
     */
    text(): string {
      if (!this._text) {
        if (this._doc)
          this._text= this._doc.getValue();
        else
          this._text = this.docState.getProperty(null) ||'';
      }
      return this._text;
    }

    /**
     * Overridable method, invoked when the document is being opened.
     */
    handleOpen() {
    }

    /**
     * Overridable method, invoked when the document has been changed.
     * CodeMirrorEditor subscribes to corresponding event internally, and does some internal handling before invoking handleChange.
     */
    handleChange(change: CodeMirror.EditorChange) {
    }

    /**
     * Overridable method, invoked when the document is being closed.
     */
    handleClose() {
    }

    /**
     * Overridable method, invoked when the document is being loaded first time from the storage.
     * The default implementation fetches 'null' property from the storage.
     * Keep calling super.handleLoad() if that is the desired behavior.
     */
    handleLoad() {
      if (this.docState) {
        this.doc().setValue(this.docState.getProperty(null) || '');
        this.doc().clearHistory();
      }
    }

    /**
     * Overridable method, invoked when the document needs to be saved.
     * The default implementation stores into 'null' property of the storage.
     * Keep calling super.handleSave() if that is the desired behavior.
     */
    handleSave() {
      if (this.docState)
        this.docState.setProperty(null, this.text());
    }

    private _initEditor() {
      var options = this._shared.options || CodeMirrorEditor.standardEditorConfiguration();
      this._shared.cm = new CodeMirror(
        (element) => this._shared.element = element,
        options);
    }

    private _initDoc() {

      // resolve options (allow override)
      var options = this._shared.options || CodeMirrorEditor.standardEditorConfiguration();
      this._doc =
        options.mode ? new CodeMirror.Doc('', options.mode) :
        new CodeMirror.Doc('');

      // invoke overridable handleLoad()
      this.handleLoad();

      // subscribe to change event
      CodeMirror.on(
        this._doc,
        'change',
        (instance, change) => {

          // it is critical that _text is cleared on any change
          this._text = null;

          // notify the external logic that the document was changed
          this._invokeonchange();

          this.handleChange(change);
        });
    }
  }

  export module CodeMirrorEditor {

    /**
     * Editors need to share a CodeMirror instance, and physical HTML element.
     * CodeMirror options therefore must be decided centrally too.
     * Note that all the properties are optional, they are going to be assigned by CodeMirrorEditor.
     */
    export interface SharedState {
      editor?: CodeMirrorEditor;
      cm?: CodeMirror;
      element?: HTMLElement;
      options?: CodeMirror.Options;
    }
  }


  /**
   * Simple document type using CodeMirrorEditor, usable as a default type for text files.
   */
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

    /**
     * Registering PlainTextEditorType.
     */
    export var PlainText: EditorType = new PlainTextEditorType();
  }
}