/// <reference path='typings/codemirror.d.ts' />

/// <reference path='persistence.ts' />
/// <reference path='editor.ts' />
/// <reference path='editor-std.ts' />

/// <reference path='TypeScriptService.ts' />

module teapo {

  class TypeScriptDocumentEditorType implements DocumentEditorType {

    private _shared: CodeMirrorEditorSharedState = {
      options: TypeScriptDocumentEditorType.editorConfiguration()
    };

    constructor(private _typescript: TypeScriptService) {
    }

    static editorConfiguration() {
      var options = CodeMirrorEditor.standardEditorConfiguration();
      options.mode = "text/typescript";
      return options;
    }

    canEdit(fullPath: string): boolean {
      return fullPath && fullPath.length > 3 &&
        fullPath.slice(fullPath.length-3).toLowerCase()==='.ts';
    }

    editDocument(docState: DocumentState): Editor {
      return new CodeMirrorEditor(this._shared, docState);
    }
  }

  class TypeScriptEditor extends CodeMirrorEditor {
    constructor(private _typescript: TypeScriptService, shared: CodeMirrorEditorSharedState, docState: DocumentState) {
      super(shared, docState);
    }

    handleChange(change: CodeMirror.EditorChange) {
      
    }
  }

  // DocumentEditorType['TypeScript'] = new TypeScriptDocumentEditorType();
}