/// <reference path='typings/codemirror.d.ts' />

/// <reference path='persistence.ts' />
/// <reference path='editor.ts' />
/// <reference path='editor-std.ts' />

/// <reference path='TypeScriptService.ts'  />

module teapo {

  /**
   * Handling detection of .html and .htm files.
   */
  class HtmlEditorType implements EditorType {
    private _shared: CodeMirrorEditor.SharedState = {
      options: HtmlEditorType.editorConfiguration()
    };

    constructor() {
    }

    static editorConfiguration() {
      var options = CodeMirrorEditor.standardEditorConfiguration();
      options.mode = "text/html";
      return options;
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
     * Registering HtmlEditorType.
     */
    export var Html: EditorType = new HtmlEditorType();
  }
}