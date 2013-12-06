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
      var dotParts = fullPath.split('.');
      return dotParts.length>1 &&
        (dotParts[dotParts.length-1].toLowerCase()==='html' || dotParts[dotParts.length-1].toLowerCase()==='htm');
    }

    editDocument(docState: DocumentState): Editor {
      return new HtmlEditor(this._shared, docState);
    }
  }

  class HtmlEditor extends CompletionCodeMirrorEditor {
    constructor(
      shared: CodeMirrorEditor.SharedState,
      docState: DocumentState) {
      super(shared, docState);
    }

    handlePerformCompletion() {
      (<any>CodeMirror).showHint(this.editor(), (<any>CodeMirror).hint.html);
    }
  }

  export module EditorType {

    /**
     * Registering HtmlEditorType.
     */
    export var Html: EditorType = new HtmlEditorType();
  }
}