/// <reference path='typings/codemirror.d.ts' />

/// <reference path='persistence.ts' />
/// <reference path='editor.ts' />
/// <reference path='editor-std.ts' />

module teapo {

  /**
   * Handling detection of .js files.
   */
  class JavaScriptEditorType implements EditorType {
    private _shared: CodeMirrorEditor.SharedState = {
      options: JavaScriptEditorType.editorConfiguration()
    };

    constructor() {
    }

    static editorConfiguration() {
      var options = CodeMirrorEditor.standardEditorConfiguration();
      options.mode = "text/javascript";
      return options;
    }

    canEdit(fullPath: string): boolean {
      var dotParts = fullPath.split('.');
      return dotParts.length>1 &&
        dotParts[dotParts.length-1].toLowerCase()==='js';
    }

    editDocument(docState: DocumentState): Editor {
      return new JavaScriptEditor(this._shared, docState);
    }
  }

  class JavaScriptEditor extends CompletionCodeMirrorEditor {
    constructor(
      shared: CodeMirrorEditor.SharedState,
      docState: DocumentState) {
      super(shared, docState);
    }

    handlePerformCompletion() {
      (<any>CodeMirror).showHint(this.editor(), (<any>CodeMirror).hint.javascript);
    }
  }

  export module EditorType {

    /**
     * Registering HtmlEditorType.
     */
    export var JavaScript: EditorType = new JavaScriptEditorType();
  }
}