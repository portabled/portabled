/// <reference path='typings/codemirror.d.ts' />

/// <reference path='persistence.ts' />
/// <reference path='editor.ts' />
/// <reference path='editor-std.ts' />

/// <reference path='TypeScriptService.ts' />

module teapo {

  class TypeScriptEditorType implements EditorType {

    private _shared: CodeMirrorEditor.SharedState = {
      options: TypeScriptEditorType.editorConfiguration()
    };

    constructor(private _typescript = new TypeScriptService()) {
    }

    static editorConfiguration() {
      var options = CodeMirrorEditor.standardEditorConfiguration();
      options.mode = "text/typescript";
      options.gutters = [ 'teapo-errors' ];
      return options;
    }

    canEdit(fullPath: string): boolean {
      return fullPath && fullPath.length > 3 &&
        fullPath.slice(fullPath.length-3).toLowerCase()==='.ts';
    }

    editDocument(docState: DocumentState): Editor {
      var editor = new TypeScriptEditor(this._typescript.service, this._shared, docState);

      this._typescript.scripts[docState.fullPath()] = editor;

      return editor;
    }
  }

  class TypeScriptEditor extends CodeMirrorEditor {

    changes: TypeScript.TextChangeRange[] = [];
    cachedSnapshot: TypeScript.IScriptSnapshot = null; // needed for TypeScriptService optimization

    static updateDiagnosticsDelay = 1000;

    private _syntacticDiagnostics: TypeScript.Diagnostic[] = [];
    private _semanticDiagnostics: TypeScript.Diagnostic[] = [];
    private _updateDiagnosticsTimeout = -1;
    private _updateDiagnosticsClosure = () => this._updateDiagnostics();
    private _teapoErrorsGutterElement: HTMLElement = null;

    constructor(private _typescript: TypeScript.Services.ILanguageService, shared: CodeMirrorEditor.SharedState, docState: DocumentState) {
      super(shared, docState);
    }

    handleOpen() {

      this._updateGutter();

      if (this._updateDiagnosticsTimeout) {
        this._updateDiagnosticsTimeout = 0;
        this._triggerDiagnosticsUpdate();
      }
    }

    handleClose() {
      if (this._updateDiagnosticsTimeout) {
        if (this._updateDiagnosticsTimeout!==-1)
          clearTimeout(this._updateDiagnosticsTimeout);

        this._updateDiagnosticsTimeout = -1;
      }
    }

    handleChange(change: CodeMirror.EditorChange) {
      var doc = this.doc();
      var offset = doc.indexFromPos(change.from);
      var oldLength = this._totalLengthOfLines(<string[]><any>change.removed); // it's an array not a string
      var newLength = this._totalLengthOfLines(change.text);
  
      var ch = new TypeScript.TextChangeRange(
          TypeScript.TextSpan.fromBounds(offset, offset+oldLength),
          newLength);

      this.changes.push(ch);

      this._triggerDiagnosticsUpdate();
    }

    private _triggerDiagnosticsUpdate() {
      if (this._updateDiagnosticsTimeout)
        clearTimeout(this._updateDiagnosticsTimeout);
      this._updateDiagnosticsTimeout = setTimeout(
        this._updateDiagnosticsClosure,
        TypeScriptEditor.updateDiagnosticsDelay);
    }

    private _updateDiagnostics() {
      this._updateDiagnosticsTimeout = 0;

      this._syntacticDiagnostics = this._typescript.getSyntacticDiagnostics(this.docState.fullPath());
      this._semanticDiagnostics = this._typescript.getSemanticDiagnostics(this.docState.fullPath());

      console.log(this._syntacticDiagnostics, this._semanticDiagnostics);
      this._updateGutter();
    }

    private _updateGutter() {
      var editor = this.editor();

      editor.clearGutter('teapo-errors');

      var gutterElement = this._getTeapoErrorsGutterElement();
      var gutterClassName = 'teapo-errors';
      if (this._syntacticDiagnostics && this._syntacticDiagnostics.length) {
        gutterClassName += ' teapo-errors-syntactic';

        for (var i = 0; i < this._syntacticDiagnostics.length; i++) {
          this._markError(i, this._syntacticDiagnostics[i], 'teapo-syntax-error', editor);
        }

        for (var i = 0; i < this._semanticDiagnostics.length; i++) {
          this._markError(i, this._semanticDiagnostics[i], 'teapo-semantic-error', editor);
        }
      }
      if (this._semanticDiagnostics && this._semanticDiagnostics.length) {
        gutterClassName += ' teapo-errors-semantic';
      }
      gutterElement.className = gutterClassName;
    }

    private _markError(line: number, error: TypeScript.Diagnostic, className: string, editor: CodeMirror.Editor) {
      var errorElement = document.createElement('div');
      errorElement.className = className;
      errorElement.title = error.text();
      errorElement.onclick = () => alert(error.text() + '\nat '+error.line());

      editor.setGutterMarker(line, 'teapo-errors', errorElement);

      //doc.markText(from: { error.line
    }

    private _getTeapoErrorsGutterElement() {
      if (!this._teapoErrorsGutterElement)
        this._teapoErrorsGutterElement = this._findGutterElement('teapo-errors');

      return this._teapoErrorsGutterElement;
    }

    private _findGutterElement(className: string) {
      var gutterElement = this.editor().getGutterElement();

      for (var i = 0; i < gutterElement.children.length; i++) {
        var candidate = <HTMLElement>gutterElement.children[i];
        if (candidate.className && candidate.className.indexOf(className)>=0)
          return candidate;
      }

      return null;
    }

    private _totalLengthOfLines(lines: string[]): number {
      var length = 0;
      for (var i = 0; i < lines.length; i++) {
        if (i>0)
          length++; // '\n'
    
        length += lines[i].length;
      }
      return length;
    }
  }

  export module EditorType {
    export var TypeScript: EditorType = new TypeScriptEditorType();
  }
}