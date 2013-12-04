/// <reference path='typings/codemirror.d.ts' />

/// <reference path='persistence.ts' />
/// <reference path='editor.ts' />
/// <reference path='editor-std.ts' />

/// <reference path='TypeScriptService.ts'  />

module teapo {

  /**
   * Handling detection of .ts files and creation of TypeScriptEditor,
   * as well as storing the shared instance of TypeScriptService.
   */
  class TypeScriptEditorType implements EditorType {

    private _shared: CodeMirrorEditor.SharedState = {
      options: TypeScriptEditorType.editorConfiguration()
    };

    /** Optional argument can be used to mock TypeScriptService in testing scenarios. */
    constructor(private _typescript = new TypeScriptService()) {
      this._shared.options.extraKeys['Ctrl-Space'] = () => {
        var editor = <TypeScriptEditor>this._shared.editor;
        if (!editor) return;
        editor._triggerCompletion();
      };
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

      // TODO: think how it will be removed.
      this._typescript.scripts[docState.fullPath()] = editor;

      return editor;
    }
  }

  /**
   * Implements rich code-aware editing for TypeScript files.
   */
  class TypeScriptEditor extends CodeMirrorEditor {

    /** Required as part of interface to TypeScriptService. */
    changes: TypeScript.TextChangeRange[] = [];
    /** Required as part of interface to TypeScriptService. */
    cachedSnapshot: TypeScript.IScriptSnapshot = null; // needed for TypeScriptService optimization

    static updateDiagnosticsDelay = 1000;
    static completionDelay = 200;
    static maxCompletions = 20;

    private _syntacticDiagnostics: TypeScript.Diagnostic[] = [];
    private _semanticDiagnostics: TypeScript.Diagnostic[] = [];
    private _updateDiagnosticsTimeout = -1;
    private _updateDiagnosticsClosure = () => this._updateDiagnostics();
    private _teapoErrorsGutterElement: HTMLElement = null;
    private _docErrorMarks: CodeMirror.TextMarker[] = [];

    private _completionTimeout = 0;
    private _completionClosure = () => this._performCompletion();
    private _forcedCompletion = false;
    private _completionActive = false;

    constructor(private _typescript: TypeScript.Services.ILanguageService, shared: CodeMirrorEditor.SharedState, docState: DocumentState) {
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

      // if error refresh is queued, cancel it, but keep a special value as a flag
      if (this._updateDiagnosticsTimeout) {
        if (this._updateDiagnosticsTimeout!==-1)
          clearTimeout(this._updateDiagnosticsTimeout);

        this._updateDiagnosticsTimeout = -1;
      }

      // completion should be cancelled outright
      if (this._completionTimeout) {
        clearTimeout(this._completionTimeout);

        this._completionTimeout = 0;
      }
    }

    /**
     * Storing changes for TypeScript incremental compilation/parsing,
     * queueing refresh of errors and code completion.
     */
    handleChange(change: CodeMirror.EditorChange) {

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

      // trigger error refresh and completion
      this._triggerDiagnosticsUpdate();
      this._triggerCompletion();
    }

    /**
     * Subscribing to cursor activity.
     */
    handleLoad() {
      super.handleLoad(); // fetches the text from docState

      CodeMirror.on(
        this.doc(),
        'cursorActivity', (instance) => this._handleCursorActivity());

      // TODO: when file icons introduced, populate errors here early
    }

    private _handleCursorActivity() {
      // TODO: display syntactic information about the current cursor position in the status bar
    }

    _triggerCompletion() {
      if (this._completionTimeout)
        clearTimeout(this._completionTimeout);

      this._completionTimeout = setTimeout(this._completionClosure, TypeScriptEditor.completionDelay);
    }

    private _performCompletion() {
      this._completionTimeout = 0;

      if (this._completionActive)
        return;

      if (!this._forcedCompletion) {
        // if user didn't ask for completion, only do it within an identifier
        // or after dot
        var nh = this._getNeighborhood();
        if (nh.leadLength===0 && nh.tailLength===0
          && nh.prefixChar!=='.')
          return;
      }

      (<any>CodeMirror).showHint(
        this.editor(),
        () => this._continueCompletion(),
        { completeSingle: false });
    }

    /**
     * Invoked from CodeMirror's completion logic
     * either at completion start, or on typing.
     * Expected to return a set of completions plus extra metadata.
     */
    private _continueCompletion() {
      var editor = this.editor();
      var fullPath = this.docState.fullPath();
      var nh = this._getNeighborhood();

      var completions = this._typescript.getCompletionsAtPosition(fullPath, nh.offset, false);

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
        var details = this._typescript.getCompletionEntryDetails(fullPath, nh.offset, e.name);
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
                if (this._completionTimeout) {
                  clearTimeout(this._completionTimeout);
                  this._completionTimeout = 0;
                }
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

    /**
     * Retrieves parts of the line before and after current cursor,
     * looking for indentifier and whitespace boundaries.
     * Needed for correct handling of completion context.
     */
    private _getNeighborhood() {
      var doc = this.doc();
      var pos = doc.getCursor();
      var offset = doc.indexFromPos(pos);
      var line = doc.getLine(pos.line);

      var leadLength = 0;
      var prefixChar = '';
      var whitespace = false;
      for (var i = pos.ch-1; i >=0; i--) {
        var ch = line[i];
        if (!whitespace && this._isIdentifierChar(ch)) {
          leadLength++;
          continue;
        }

        whitespace = /\s/.test(ch);
        if (!whitespace) {
          prefixChar = ch;
          break;
        }
      }

      var tailLength = 0;
      var suffixChar = '';
      whitespace = false;
      for (var i = pos.ch; i <line.length; i++) {
        var ch = line[i];
        if (!whitespace && this._isIdentifierChar(ch)) {
          tailLength++;
          continue;
        }

        whitespace = /\s/.test(ch);
        if (!whitespace) {
          suffixChar = ch;
          break;
        }
      }

      return {
        pos: pos,
        offset: offset,
        line: line,
        leadLength: leadLength,
        prefixChar: prefixChar,
        tailLength: tailLength,
        suffixChar: suffixChar
      };
    }

    private _isIdentifierChar(ch: string): boolean {
      if (ch.toLowerCase()!==ch.toUpperCase())
        return true;
      else if (ch==='_' || ch==='$')
        return true;
      else if (ch>='0' && ch<='9')
        return true;
      else
        return false;
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
      if (this._syntacticDiagnostics && this._syntacticDiagnostics.length) {
        gutterClassName += ' teapo-errors-syntactic';

        for (var i = 0; i < this._syntacticDiagnostics.length; i++) {
          this._markError(this._syntacticDiagnostics[i], 'teapo-gutter-syntax-error', editor);
        }
      }

      if (this._semanticDiagnostics && this._semanticDiagnostics.length) {
        gutterClassName += ' teapo-errors-semantic';

        for (var i = 0; i < this._semanticDiagnostics.length; i++) {
          this._markError(this._semanticDiagnostics[i], 'teapo-gutter-semantic-error', editor);
        }
      }

      gutterElement.className = gutterClassName;
    }

    private _markError(error: TypeScript.Diagnostic, className: string, editor: CodeMirror) {
      var lineNumber = error.line();
      var errorElement = document.createElement('div');
      errorElement.className = className;
      errorElement.title = error.text();
      errorElement.onclick = () => alert(error.text() + '\nat '+(lineNumber+1)+':'+(error.character()+1)+'.');

      editor.setGutterMarker(lineNumber, 'teapo-errors', errorElement);
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