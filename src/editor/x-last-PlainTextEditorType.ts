module teapo {

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