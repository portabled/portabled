/// <reference path='typings/codemirror.d.ts' />

/// <reference path='persistence.ts' />
/// <reference path='editor.ts' />
/// <reference path='editor-std.ts' />

module teapo {

  /**
   * Handling detection of .js files.
   */
  class CSSEditorType implements EditorType {
    private _shared: CodeMirrorEditor.SharedState = {
      options: CSSEditorType.editorConfiguration()
    };

    constructor() {
    }

    static editorConfiguration() {
      var options = CodeMirrorEditor.standardEditorConfiguration();
      options.mode = "text/css";
      return options;
    }

    canEdit(fullPath: string): boolean {
      var dotParts = fullPath.split('.');
      return dotParts.length>1 &&
        dotParts[dotParts.length-1].toLowerCase()==='css';
    }

    editDocument(docState: DocumentState): Editor {
      return new CodeMirrorEditor(this._shared, docState);
    }
  }

  export module EditorType {

    /**
     * Registering HtmlEditorType.
     */
    export var CodeMirror: EditorType = new CSSEditorType();
  }
}