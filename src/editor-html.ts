/// <reference path='typings/codemirror.d.ts' />

/// <reference path='persistence.ts' />
/// <reference path='editor.ts' />
/// <reference path='editor-std.ts' />

module teapo {

  /**
   * Handling detection of .html and .htm files.
   */
  class HtmlEditorType implements EditorType {
    private _shared: CodeMirrorEditor.SharedState = HtmlEditorType.createShared();

    /** Optional argument can be used to mock TypeScriptService in testing scenarios. */
    constructor(private _typescript = new TypeScriptService()) {
      this._typescript.compilationSettings.outFileOption = '/out.ts';
    }

    static createShared() {
      var options = CodeMirrorEditor.standardEditorConfiguration();
      var shared: CodeMirrorEditor.SharedState = { options: options };

      options.mode = "text/typescript";
      options.gutters = [ 'teapo-errors' ];

      var debugClosure = () => {
        var editor = <HtmlEditor>shared.editor;
        if (!editor) return;

        editor.build();
      };

      var extraKeys = options.extraKeys || (options.extraKeys = {});
      var shortcuts = ['Ctrl-B','Alt-B','Cmd-B','Shift-Ctrl-B','Ctrl-Alt-B','Shift-Alt-B','Shift-Cmd-B','Cmd-Alt-B'];
      for (var i = 0; i<shortcuts.length; i++) {
        var k = shortcuts[i];
        if (k in extraKeys)
          continue;

        extraKeys[k] = debugClosure;
      }

      return shared;
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

    build() {
      alert('build');
    }
  }

  export module EditorType {

    /**
     * Registering HtmlEditorType.
     */
    export var Html: EditorType = new HtmlEditorType();
  }
}