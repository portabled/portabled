/// <reference path='typings/codemirror.d.ts' />

/// <reference path='persistence.ts' />
/// <reference path='editor.ts' />
/// <reference path='editor-std.ts' />

/// <reference path='TypeScriptService.ts'  />

// anchor-3

module teapo {

  /**
   * Handling detection of .ts files and creation of TypeScriptEditor,
   * as well as storing the shared instance of TypeScriptService.
   */
  class TypeScriptEditorType implements EditorType {

    private _shared: CodeMirrorEditor.SharedState = TypeScriptEditorType.createShared();

    /** Optional argument can be used to mock TypeScriptService in testing scenarios. */
    constructor(private _typescript: TypeScriptService = null) {
    }

    static createShared() {
      var options = CodeMirrorEditor.standardEditorConfiguration();
      var shared: CodeMirrorEditor.SharedState = { options: options };

      options.mode = "text/typescript";
      options.gutters = [ 'teapo-errors' ];

      var debugClosure = () => {
        var editor = <TypeScriptEditor>shared.editor;
        if (!editor) return;

        editor.debug();
      };

      var extraKeys = options.extraKeys || (options.extraKeys = {});
      var shortcuts = ['Ctrl-K','Alt-K','Cmd-K','Shift-Ctrl-K','Ctrl-Alt-K','Shift-Alt-K','Shift-Cmd-K','Cmd-Alt-K'];
      for (var i = 0; i<shortcuts.length; i++) {
        var k = shortcuts[i];
        if (k in extraKeys)
          continue;

        extraKeys[k] = debugClosure;
      }

      return shared;
    }

    canEdit(fullPath: string): boolean {
      return fullPath && fullPath.length > 3 &&
        fullPath.slice(fullPath.length-3).toLowerCase()==='.ts';
    }

    editDocument(docState: DocumentState): Editor {

      if (!this._typescript)
        this._initTypescript();

      var editor = new TypeScriptEditor(this._typescript, this._shared, docState);

      setTimeout(() => {
          this._typescript.scripts[docState.fullPath()] = editor;
          this._typescript.service.getSyntacticDiagnostics(docState.fullPath());
          setTimeout(() => {
            this._typescript.service.getSignatureAtPosition(docState.fullPath(), 0);
          },1);
        },
        1);

      return editor;
    }

    private _initTypescript() {
      this._typescript = new TypeScriptService();
      this._typescript.compilationSettings.outFileOption = '/out.ts';
    }
  }

  /**
   * Implements rich code-aware editing for TypeScript files.
   */
  class TypeScriptEditor extends CompletionCodeMirrorEditor {

    /** Required as part of interface to TypeScriptService. */
    changes: TypeScript.TextChangeRange[] = [];

    /** Required as part of interface to TypeScriptService. */
    _cachedSnapshot: TypeScript.IScriptSnapshot = null; // needed for TypeScriptService optimization

    static updateDiagnosticsDelay = 2000;
    static maxCompletions = 20;

    private _syntacticDiagnostics: TypeScript.Diagnostic[] = [];
    private _semanticDiagnostics: TypeScript.Diagnostic[] = [];
    private _updateDiagnosticsTimeout = -1;
    private _updateDiagnosticsClosure = () => this._updateDiagnostics();
    private _teapoErrorsGutterElement: HTMLElement = null;
    private _docErrorMarks: CodeMirror.TextMarker[] = [];

    private _completionActive = false;

    constructor(
      private _typescript: TypeScriptService,
      shared: CodeMirrorEditor.SharedState,
      docState: DocumentState) {
      super(shared, docState);
    }

    /**
     * Overriding opening of the file, refreshing error marks.
     */
    handleOpen() {

      this._updateGutter();

      // handling situation where an error refresh was queued,
      // but did not finish when the document was closed last time
      if (this._updateDiagnosticsTimeout) {
        this._updateDiagnosticsTimeout = 0;
        this._triggerDiagnosticsUpdate();
      }
    }

    /**
     * Overringin closing of the file, stopping queued requests.
     */
    handleClose() {
      super.handleClose();

      // if error refresh is queued, cancel it, but keep a special value as a flag
      if (this._updateDiagnosticsTimeout) {
        if (this._updateDiagnosticsTimeout!==-1)
          clearTimeout(this._updateDiagnosticsTimeout);

        this._updateDiagnosticsTimeout = -1;
      }
    }

    /**
     * Storing changes for TypeScript incremental compilation/parsing,
     * queueing refresh of errors and code completion.
     */
    handleChange(change: CodeMirror.EditorChange) {
      super.handleChange(change);

      // convert change from CodeMirror to TypeScript format
      var doc = this.doc();
      var offset = doc.indexFromPos(change.from);

      var oldLength = this._totalLengthOfLines(<string[]><any>change.removed); // it's an array not a string
      var newLength = this._totalLengthOfLines(change.text);
  
      var ch = new TypeScript.TextChangeRange(
          TypeScript.TextSpan.fromBounds(offset, offset+oldLength),
          newLength);

      // store the change in an array
      this.changes.push(ch);

      if (change.text.length===1 && change.text[0]==='.')
        this.triggerCompletion(true);

      // trigger error refresh and completion
      this._triggerDiagnosticsUpdate();
    }

    handleRemove() {
      delete this._typescript.scripts[this.docState.fullPath()];
    }

    handlePerformCompletion(forced: boolean, acceptSingle: boolean) {

      (<any>CodeMirror).showHint(
        this.editor(),
        () => this._continueCompletion(forced),
        { completeSingle: acceptSingle });
    }


    debug() {
      var emits = this._typescript.service.getEmitOutput(this.docState.fullPath());
      for (var i = 0; i < emits.outputFiles.length; i++) {
        var e = emits.outputFiles[i];
        alert(
          e.name+'\n\n'+
          e.text);
      }
    }

    build() {

      var emits = this._typescript.service.getEmitOutput(this.docState.fullPath());

      var errors: string[] = [];
      for (var i = 0; i < emits.diagnostics.length; i++) {
        var e = emits.diagnostics[i];
        var info = e.info();
        if (info.category===TypeScript.DiagnosticCategory.Error) {
          errors.push(
            e.fileName()+' ['+e.line()+':'+e.character+'] '+info.message);
        }
      }

      if (errors.length)
        alert(errors.join('\n')); 

      for (var i = 0; i < emits.outputFiles.length; i++) {
        var ou = emits.outputFiles[i];
        return ou.text;
      }
    }

    /**
     * Invoked from CodeMirror's completion logic
     * either at completion start, or on typing.
     * Expected to return a set of completions plus extra metadata.
     */
    private _continueCompletion(forced: boolean) {
      var editor = this.editor();
      var fullPath = this.docState.fullPath();
      var nh = this.getNeighborhood();

      var completions = this._typescript.service.getCompletionsAtPosition(fullPath, nh.offset, false);

      var from = {
        line: nh.pos.line,
        ch: nh.pos.ch - nh.leadLength
      };
      var to = {
        line: nh.pos.line,
        ch: nh.pos.ch + nh.tailLength
      };

      var lead = nh.line.slice(from.ch, nh.pos.ch);
      var tail = nh.line.slice(nh.pos.ch, to.ch);

      var leadLower = lead.toLowerCase();
      var leadFirstChar = leadLower[0];

      // filter by lead/prefix (case-insensitive)
      var filteredList = (completions ? completions.entries : []).filter((e) => {
        if (leadLower.length===0) return true;
        if (!e.name) return false;
        if (e.name.length<leadLower.length) return false;
        if (e.name[0].toLowerCase() !== leadFirstChar) return false;
        if (e.name.slice(0,leadLower.length).toLowerCase()!==leadLower) return false;
        return true;
      });

      // TODO: consider maxCompletions while filtering, to avoid excessive processing of long lists

      // limit the size of the completion list
      if (filteredList.length>TypeScriptEditor.maxCompletions)
        filteredList.length = TypeScriptEditor.maxCompletions;

      // convert from TypeScript details objects to CodeMirror completion API shape
      var list = filteredList.map((e, index) => {
        var details = this._typescript.service.getCompletionEntryDetails(fullPath, nh.offset, e.name);
        return new CompletionItem(e, details, index, lead, tail);
      });

      if (list.length) {

        if (!this._completionActive) {

          var onendcompletion = () => {
            CodeMirror.off(editor,'endCompletion', onendcompletion);
            setTimeout(() => {
                // clearing _completionActive bit and further completions
                // (left with delay to settle possible race with change handling)
                this._completionActive = false;
                this.cancelCompletion();
            }, 1);
          };

          // first completion result: set _completionActive bit
          CodeMirror.on(editor,'endCompletion', onendcompletion);
          this._completionActive = true;
        }
      }

      return {
        list: list,
        from: from,
        to: to
      };
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

      this._syntacticDiagnostics = this._typescript.service.getSyntacticDiagnostics(this.docState.fullPath());
      this._semanticDiagnostics = this._typescript.service.getSemanticDiagnostics(this.docState.fullPath());

      this._updateGutter();
      this._updateDocDiagnostics();
    }

    private _updateDocDiagnostics() {
      var doc = this.doc();
      for (var i = 0; i < this._docErrorMarks.length; i++) {
        this._docErrorMarks[i].clear();
      }
      this._docErrorMarks = [];

      if (this._syntacticDiagnostics) {
        for (var i = 0; i < this._syntacticDiagnostics.length; i++) {
          this._markDocError(this._syntacticDiagnostics[i], 'teapo-syntax-error', doc);
        }
      }

      if (this._semanticDiagnostics) {
        for (var i = 0; i < this._semanticDiagnostics.length; i++) {
          this._markDocError(this._semanticDiagnostics[i], 'teapo-semantic-error', doc);
        }
      }
    }

    private _markDocError(error: TypeScript.Diagnostic, className: string, doc: CodeMirror.Doc) {
      var from = { line: error.line(), ch: error.character() };
      var to = { line: error.line(), ch: from.ch + error.length() };

      var m = doc.markText(
        from, to,
        {
          className: className,
          title: error.text()
        });
      this._docErrorMarks.push(m);
    }

    private _updateGutter() {
      var editor = this.editor();

      editor.clearGutter('teapo-errors');

      var gutterElement = this._getTeapoErrorsGutterElement();

      var gutterClassName = 'teapo-errors';
      var lineErrors: { text: string; classNames: any; }[] = [];

      var sources = [
        {kind: 'syntax', errors: this._syntacticDiagnostics},
        {kind: 'semantic', errors: this._semanticDiagnostics}
      ];

      for (var iSrc=0; iSrc<sources.length; iSrc++) {
        var src = sources[iSrc];

        if (src.errors.length)
          gutterClassName += ' teapo-errors-'+src.kind;

        for (var i = 0; i < src.errors.length; i++) {
          var err = src.errors[i];
          var info = err.info();
  
          var lnerr = lineErrors[err.line()];
          var text = '['+TypeScript.DiagnosticCategory[info.category]+'] '+err.text();
          if (lnerr) {
            lnerr.text += '\n'+text;
          }
          else {
            lnerr = { text: text, classNames: {}};
            lineErrors[err.line()] = lnerr;
          }

          lnerr.classNames['teapo-gutter-'+src.kind+'-error'] = '';
        }
      }

      function createClickHandler(text: string) {
        return () => alert(text);
      }

      for (var i=0; i<lineErrors.length; i++) {
        var lnerr = lineErrors[i];
        if (!lnerr) continue;

        var errorElement = document.createElement('div');
        errorElement.className = Object.keys(lnerr.classNames).join(' ');
        errorElement.title = lnerr.text;

        errorElement.onclick = createClickHandler(lnerr.text);
  
        editor.setGutterMarker(i, 'teapo-errors', errorElement);
      }

      gutterElement.className = gutterClassName;
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

  class CompletionItem {
    text: string;
  
    constructor(
      private _completionEntry: TypeScript.Services.CompletionEntry,
      private _completionEntryDetails: TypeScript.Services.CompletionEntryDetails,
      private _index: number,
      private _lead: string, private _tail: string) {
      this.text = this._completionEntry.name;
    }
  
    render(element: HTMLElement) {
      var kindSpan = document.createElement('span');
      kindSpan.textContent = this._completionEntry.kind+' ';
      kindSpan.style.opacity = '0.6';
      element.appendChild(kindSpan);
  
      var nameSpan = document.createElement('span');
      nameSpan.textContent = this.text;
      element.appendChild(nameSpan);
  
      if (this._completionEntryDetails && this._completionEntryDetails.type) {
        var typeSpan = document.createElement('span');
        typeSpan.textContent = ' : '+this._completionEntryDetails.type;
        typeSpan.style.opacity = '0.7';
        element.appendChild(typeSpan);
      }
  
      if (this._completionEntryDetails && this._completionEntryDetails.docComment) {
        var commentDiv = document.createElement('div');
        commentDiv.textContent = this._completionEntryDetails.docComment;
        commentDiv.style.opacity = '0.7';
        commentDiv.style.fontStyle = 'italic';
        commentDiv.style.marginLeft = '2em';
        element.appendChild(commentDiv);
      }
    }
  }

  export module EditorType {
    export var TypeScript: EditorType = new TypeScriptEditorType();
  }
}