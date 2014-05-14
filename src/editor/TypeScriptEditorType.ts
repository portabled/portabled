module teapo {

  /**
   * Handling detection of .ts files and creation of TypeScriptEditor,
   * as well as storing the shared instance of TypeScriptService.
   */
  class TypeScriptEditorType implements EditorType {

    private _shared: CodeMirrorEditor.SharedState = TypeScriptEditorType.createShared();
    private _initDocQueue: DocumentState[] = [];

    /** Optional argument can be used to mock TypeScriptService in testing scenarios. */
    constructor(private _typescript: TypeScriptService = null) {
    }

    static createShared() {
      var options = CodeMirrorEditor.standardEditorConfiguration();
      var shared: CodeMirrorEditor.SharedState = { options: options };

      options.mode = "text/typescript";
      if (options.gutters) {
        options.gutters = options.gutters.concat(['teapo-errors']);
      }
      else {
        options.gutters = ['teapo-errors'];
      }

      function addShortcuts(shortcuts: string[], handler: (editor: TypeScriptEditor) => void) {
        var debugClosure = () => {
          var editor = <TypeScriptEditor>shared.editor;
          if (!editor) return;

          handler(editor);
        };

        var extraKeys = options.extraKeys || (options.extraKeys = {});
        for (var i = 0; i < shortcuts.length; i++) {
          var k = shortcuts[i];
          if (k in extraKeys)
            continue;

          extraKeys[k] = debugClosure;
        }
      }

      addShortcuts(['Ctrl-K', 'Alt-K', 'Cmd-K', 'Shift-Ctrl-K', 'Ctrl-Alt-K', 'Shift-Alt-K', 'Shift-Cmd-K', 'Cmd-Alt-K'], editor => editor.debug());
      addShortcuts(['Ctrl-,', 'Alt-,', 'Cmd-,', 'Shift-Ctrl-Up', 'Ctrl-Alt-Up', 'Shift-Alt-Up', 'Shift-Cmd-Up', 'Cmd-Alt-Up'], editor => editor.jumpSymbol(-1));
      addShortcuts(['Ctrl-.', 'Alt-.', 'Cmd-.', 'Shift-Ctrl-Down', 'Ctrl-Alt-Down', 'Shift-Alt-Down', 'Shift-Cmd-Down', 'Cmd-Alt-Down'], editor => editor.jumpSymbol(+1));

      return shared;
    }

    canEdit(fullPath: string): boolean {
      return fullPath && fullPath.length > 3 &&
        fullPath.slice(fullPath.length - 3).toLowerCase() === '.ts';
    }

    editDocument(docState: DocumentState): Editor {

      if (!this._typescript)
        this._initTypescript();

      var editor = new TypeScriptEditor(this._typescript, this._shared, docState);

      this._initDocStateWithTypeScript(docState);
      this._typescript.scripts[docState.fullPath()] = editor;

      return editor;
    }

    /**
     * Invoke some basic functions on a script, to make TS compiler read the file once.
     * The logic here makes sure the documents are processed in the deterministic sequential order.
     */
    private _initDocStateWithTypeScript(docState: DocumentState) {
      if (this._initDocQueue.length > 0) {
        this._initDocQueue.push(docState);
      }
      else { 
        this._initDocQueue.push(docState);
        setTimeout(() => this._processDocQueue(),5);
      }
    }

    private _processDocQueue() {
      var dequeueDocState: DocumentState = null;
      for (var i = 0; i < this._initDocQueue.length; i++) { 
        dequeueDocState = this._initDocQueue[i];
        if (dequeueDocState)
          break;
      }

      if (dequeueDocState) { 
        this._initDocQueue = [];
        return;
      }
      
      this._typescript.service.getSyntacticDiagnostics(dequeueDocState.fullPath());
      setTimeout(() => {
        this._typescript.service.getSignatureAtPosition(dequeueDocState.fullPath(), 0);

        this._initDocQueue[i] = null;

        setTimeout(() => this._processDocQueue(), 5);
      }, 5);
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

    private _changes: TypeScript.TextChangeRange[] = [];
    private _bufferChanges: TypeScript.TextChangeRange[] = [];

    /** Required as part of interface to TypeScriptService. */
    _cachedSnapshot: TypeScript.IScriptSnapshot = null; // needed for TypeScriptService optimization

    static updateDiagnosticsDelay = 2000;
    static maxCompletions = 20;
    static symbolUpdateDelay = 3000;

    private _syntacticDiagnostics: TypeScript.Diagnostic[] = [];
    private _semanticDiagnostics: TypeScript.Diagnostic[] = [];
    private _updateDiagnosticsTimeout = -1;
    private _updateDiagnosticsClosure = () => this._updateDiagnostics();
    private _teapoErrorsGutterElement: HTMLElement = null;
    private _docErrorMarks: CodeMirror.TextMarker[] = [];
    private _docSymbolMarks: CodeMirror.TextMarker[] = [];
    private _currentSymbolMarkIndex: number = -1;
    private _updateSymbolMarksTimeout = 0;
    private _updateSymbolMarksClosure = () => this._updateSymbolMarks();

    private _applyingEdits = false;
    private _completionActive = false;

    private _delayedHandleChangeClosure = () => this._delayedHandleChanges();
    private _delayedHandleChangeTimeout = 0;
    private _delayedHandleChangeArg: CodeMirror.EditorChange = null;
    
    private _delayedHandleCursorActivityClosure = () => this._delayedHandleCursorActivity();
    private _delayedHandleCursorActivityTimeout = 0;

    constructor(
      private _typescript: TypeScriptService,
      shared: CodeMirrorEditor.SharedState,
      docState: DocumentState) {
      super(shared, docState);
    }

    changes() {
      if (this._bufferChanges.length) {
        var collapsedBuffer = TypeScript.TextChangeRange.collapseChangesAcrossMultipleVersions(this._bufferChanges);
        this._changes.push(collapsedBuffer);
        //console.log('collapse ',this._bufferChanges,' into ',this._changes);

        this._bufferChanges = [];
      }
      return this._changes;
    }

    /**
     * Overriding opening of the file, refreshing error marks.
     */
    handleOpen() {

      this._updateGutter();
      this._triggerStatusUpdate();

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
        if (this._updateDiagnosticsTimeout !== -1)
          clearTimeout(this._updateDiagnosticsTimeout);

        this._updateDiagnosticsTimeout = -1;
      }
      
      if (this._delayedHandleCursorActivityTimeout) {
        clearTimeout(this._delayedHandleCursorActivityTimeout);
        this._delayedHandleCursorActivityTimeout = 0;
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

      var oldLength = this._totalLengthOfLines(change.removed); // it's an array not a string
      var newLength = this._totalLengthOfLines(change.text);

      var ch = new TypeScript.TextChangeRange(
        TypeScript.TextSpan.fromBounds(offset, offset + oldLength),
        newLength);

      // store the change for TypeScript
      this._bufferChanges.push(ch);

      this._delayedHandleChangeArg = change;
      if (this._delayedHandleChangeTimeout)
        clearTimeout(this._delayedHandleChangeTimeout);
      this._delayedHandleChangeTimeout = setTimeout(this._delayedHandleChangeClosure, 1);
    }

    private _delayedHandleChanges() {
      this._delayedHandleChangeTimeout = 0;
      var change = this._delayedHandleChangeArg;
      this._delayedHandleChangeArg = null;

      var doc = this.doc();
      var offset = doc.indexFromPos(change.from);

      this._clearSymbolMarks();

      var removedText = change.removed.join('\n');
      var addedText = change.text.join('\n');
      //console.log('[' + removedText.replace(/\n/g, '\\n') + '] -> [' + addedText.replace(/\n/g, '\\n') + '] - TextChangeRange:', this._bufferChanges[this._bufferChanges.length-1]);
      if (addedText === '.') {
        var codbg = this._typescript.service.getCompletionsAtPosition(this.docState.fullPath(), offset + addedText.length, true);
        this.triggerCompletion(true);
      }
      else if (addedText === ';' || addedText === '}' || addedText === '{}') {
        var codbg = this._typescript.service.getCompletionsAtPosition(this.docState.fullPath(), offset + addedText.length, true);
        //console.log('_formatOnKey');
        this._formatOnKey(addedText, removedText, change);
      }
      else if (addedText.length > 3 || addedText === '\n') {
        var codbg = this._typescript.service.getCompletionsAtPosition(this.docState.fullPath(), offset, true);
        //console.log('_formatOnPaste');
        this._formatOnPaste(addedText, removedText, change);
      }

      // trigger error refresh and completion
      this._triggerDiagnosticsUpdate();
      
      // trigger status update -- do it after normal reaction, so it settles a bit
      this._triggerStatusUpdate();
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

    handleCursorActivity() {
      if (this._docSymbolMarks.length) {
        var doc = this.doc();
        var cursorPos = doc.getCursor();

        this._triggerStatusUpdate();

        for (var i = 0; i < this._docSymbolMarks.length; i++) {
          var mpos = this._docSymbolMarks[i].find();
          if (!mpos) continue;

          if ((mpos.from.line < cursorPos.line
            || (mpos.from.line == cursorPos.line && mpos.from.ch <= cursorPos.ch))
            && (mpos.to.line > cursorPos.line
            || (mpos.to.line == cursorPos.line && mpos.to.ch >= cursorPos.ch)))
            return; // moving within a symbol - no update needed
        }

        this._clearSymbolMarks();
      }

      if (this._updateSymbolMarksTimeout)
        clearTimeout(this._updateDiagnosticsTimeout);

      this._updateDiagnosticsTimeout = setTimeout(
        this._updateSymbolMarksClosure,
        TypeScriptEditor.symbolUpdateDelay);
    }

    private _triggerStatusUpdate() {
      if (this._delayedHandleCursorActivityTimeout)
        clearTimeout(this._delayedHandleCursorActivityTimeout);
      this._delayedHandleCursorActivityTimeout = setTimeout(this._delayedHandleCursorActivityClosure, 200);
    }


    private _delayedHandleCursorActivity() {
      this._delayedHandleCursorActivityTimeout = 0;

      this._updateStatusText();
    }

    private _updateStatusText() {
      var doc = this.doc();
      var cur = doc.getCursor();
      var offset = doc.indexFromPos(cur);

      var statusText = cur.line + ':' + cur.ch;
      var def = this._typescript.service.getTypeAtPosition(this.docState.fullPath(), offset);
      if (def)
        statusText += ' ' + def.kind + ' ' + def.memberName;

      var sig = this._typescript.service.getSignatureAtPosition(this.docState.fullPath(), offset);
      if (sig && sig.formal && sig.formal[sig.activeFormal]) {
        var sigg = sig.formal[sig.activeFormal];
        statusText += ' ' + sigg.signatureInfo + (sigg.docComment ? '\n/** ' + sigg.docComment + ' */' : '');
      }
      else if (def && def.docComment) {
        statusText += '\n/**' + def.docComment + '*/';
      }
        
      this.statusText(statusText);
    }


    debug() {
      var emits = this._typescript.service.getEmitOutput(this.docState.fullPath());
      for (var i = 0; i < emits.outputFiles.length; i++) {
        var e = emits.outputFiles[i];
        alert(
          e.name + '\n\n' +
          e.text);
      }
    }

    build() {

      this._typescript.log = [];

      var emits = this._typescript.service.getEmitOutput(this.docState.fullPath());

      if (this._typescript.log.length || emits.emitOutputResult !== TypeScript.EmitOutputResult.Succeeded) {
        var msg = 
          'Building ' + this.docState.fullPath() + ' ' + TypeScript.EmitOutputResult[emits.emitOutputResult] + '\n' +
          this._typescript.log.map(msg => msg.logLevel + ' ' + msg.text).join('\n');

        if (typeof (<any>this._typescript.service).getAllSyntacticDiagnostics === 'function') {
          // a hack
          try {
            var diag: TypeScript.Diagnostic[] = (<any>this._typescript.service).getAllSyntacticDiagnostics();
            if (diag && diag.length) {
              msg = 'Building ' + this.docState.fullPath() + ' ' + TypeScript.EmitOutputResult[emits.emitOutputResult] + '\n' +
                diag.map(d => d.fileName() + ' ' + d.line() + ':' + d.character() + ' ' + d.message()).join('\n');
            }
          }
          catch (error) {  }
        }
        
        alert(msg);
      }
      
      this._typescript.log = null;

      for (var i = 0; i < emits.outputFiles.length; i++) {
        var ou = emits.outputFiles[i];
        return ou.text;
      }
      
      return null;
    }

    private _formatOnKey(addedText: string, removedText: string, change: CodeMirror.EditorChange) {
      if (this._applyingEdits) return;
      var doc = this.doc();
      var offset = doc.indexFromPos(change.from);
      offset += addedText.length;

      var fullPath = this.docState.fullPath();
      var key = addedText.charAt(addedText.length - 1);

      var options = new TypeScript.Services.FormatCodeOptions();
      options.IndentSize = 2;
      options.TabSize = 2;
      options.ConvertTabsToSpaces = true;
      options.NewLineCharacter = '\n';

      var edits = this._typescript.service.getFormattingEditsAfterKeystroke(
        fullPath,
        offset,
        key,
        options);


      this._applyEdits(edits);
    }

    private _formatOnPaste(addedText: string, removedText: string, change: CodeMirror.EditorChange) {
      if (this._applyingEdits) return;
      var doc = this.doc();
      var offset = doc.indexFromPos(change.from);

      var fullPath = this.docState.fullPath();
      var key = addedText.charAt(addedText.length - 1);

      var options = new TypeScript.Services.FormatCodeOptions();
      options.IndentSize = 2;
      options.TabSize = 2;
      options.ConvertTabsToSpaces = true;
      options.NewLineCharacter = '\n';

      var edits = this._typescript.service.getFormattingEditsOnPaste(
        fullPath,
        offset, offset + addedText.length,
        options);


      this._applyEdits(edits);
    }

    private _applyEdits(edits: TypeScript.Services.TextEdit[]) {
      if (!edits.length) return;

      //console.log('_applyEdits('+edits.length+')...');
      this._applyingEdits = true;
      var doc = this.doc();
      var orderedEdits = edits.sort((e1, e2) => e1.minChar < e2.minChar ? +1 : e1.minChar == e2.minChar ? 0 : -1);
      for (var i = 0; i < orderedEdits.length; i++) {
        var e = orderedEdits[i];
        doc.replaceRange(
          e.text,
          doc.posFromIndex(e.minChar),
          doc.posFromIndex(e.limChar));
      }
      this._applyingEdits = false;
      //console.log('_applyEdits('+edits.length+') - complete.');
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
        if (leadLower.length === 0) return true;
        if (!e.name) return false;
        if (e.name.length < leadLower.length) return false;
        if (e.name[0].toLowerCase() !== leadFirstChar) return false;
        if (e.name.slice(0, leadLower.length).toLowerCase() !== leadLower) return false;
        return true;
      });

      // TODO: consider maxCompletions while filtering, to avoid excessive processing of long lists

      // limit the size of the completion list
      if (filteredList.length > TypeScriptEditor.maxCompletions)
        filteredList.length = TypeScriptEditor.maxCompletions;

      // convert from TypeScript details objects to CodeMirror completion API shape
      var list = filteredList.map((e, index) => {
        var details = this._typescript.service.getCompletionEntryDetails(fullPath, nh.offset, e.name);
        return new CompletionItem(e, details, index, lead, tail);
      });

      if (list.length === 1
        && list[0].text === lead
        && !forced
        && nh.tailLength == 0)
        list.length = 0; // no need to complete stuff that's already done

      if (list.length) {

        if (!this._completionActive) {

          var onendcompletion = () => {
            CodeMirror.off(editor, 'endCompletion', onendcompletion);
            setTimeout(() => {
              // clearing _completionActive bit and further completions
              // (left with delay to settle possible race with change handling)
              this._completionActive = false;
              this.cancelCompletion();
            }, 1);
          };

          // first completion result: set _completionActive bit
          CodeMirror.on(editor, 'endCompletion', onendcompletion);
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

      setTimeout(() => {
        if (this._updateDiagnosticsTimeout) return;

        this._semanticDiagnostics = this._typescript.service.getSemanticDiagnostics(this.docState.fullPath());
        setTimeout(() => {
          if (this._updateDiagnosticsTimeout) return;

          this._updateGutter();
          this._updateDocDiagnostics();
        }, 10);
      }, 10);
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

    private _clearSymbolMarks() {
      for (var i = 0; i < this._docSymbolMarks.length; i++) {
        this._docSymbolMarks[i].clear();
      }
      this._docSymbolMarks = [];
      this._currentSymbolMarkIndex = -1;
    }

    private _updateSymbolMarks() {
      this._updateSymbolMarksTimeout = 0;

      var doc = this.doc();
      var cursorPos = doc.getCursor();
      var cursorOffset = doc.indexFromPos(cursorPos);

      var fullPath = this.docState.fullPath();
      var symbols = this._typescript.service.getOccurrencesAtPosition(
        fullPath,
        cursorOffset);

      if (!symbols) return;
      var existingMarks: boolean[] = [];
      var orderedSymbols = symbols.sort((s1, s2) => s1.minChar < s2.minChar ? -1 : s1.minChar > s2.minChar ? 1 : 0);
      for (var i = 0; i < orderedSymbols.length; i++) {
        var s = symbols[i];
        if (fullPath !== s.fileName) continue;

        if (existingMarks[s.minChar])
          continue;
        existingMarks[s.minChar] = true;

        var from = doc.posFromIndex(s.minChar);
        var to = doc.posFromIndex(s.limChar);

        var cls = 'teapo-symbol teapo-symbol-nocursor';
        if (s.minChar <= cursorOffset && s.limChar >= cursorOffset) {
          cls = 'teapo-symbol teapo-symbol-cursor';
          this._currentSymbolMarkIndex = i;
        }

        var m = doc.markText(
          from, to,
          {
            className: cls
          });

        this._docSymbolMarks.push(m);
      }
    }

    jumpSymbol(direction: number) {

      if (this._updateSymbolMarksTimeout) {
        clearTimeout(this._updateSymbolMarksTimeout);
        this._updateSymbolMarksTimeout = 0;

        this._updateSymbolMarks();
      }

      if (!this._docSymbolMarks.length
        || this._currentSymbolMarkIndex < 0) return;

      var doc = this.doc();
      var cursorPos = doc.getCursor();
      var currentMark = this._docSymbolMarks[this._currentSymbolMarkIndex];
      var currentMarkPos = currentMark.find();
      var innerOffset = doc.indexFromPos(cursorPos) - doc.indexFromPos(currentMarkPos.from);

      var newMarkIndex = this._currentSymbolMarkIndex + direction;
      if (newMarkIndex >= this._docSymbolMarks.length)
        newMarkIndex = 0;
      else if (newMarkIndex < 0)
        newMarkIndex = this._docSymbolMarks.length - 1;

      var newMark = this._docSymbolMarks[newMarkIndex];
      var newMarkPos = newMark.find();

      var newCursorPos = doc.posFromIndex(
        doc.indexFromPos(newMarkPos.from) + innerOffset);

      currentMark.clear();
      newMark.clear();

      var updatedCurrentMark = doc.markText(currentMarkPos.from, currentMarkPos.to, { className: 'teapo-symbol teapo-symbol-nocursor' });
      var updatedNewMark = doc.markText(newMarkPos.from, newMarkPos.to, { className: 'teapo-symbol teapo-symbol-cursor' });

      this._docSymbolMarks[this._currentSymbolMarkIndex] = updatedCurrentMark;
      this._docSymbolMarks[newMarkIndex] = updatedNewMark;

      this._currentSymbolMarkIndex = newMarkIndex;

      doc.setCursor(newCursorPos);
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
        { kind: 'syntax', errors: this._syntacticDiagnostics },
        { kind: 'semantic', errors: this._semanticDiagnostics }
      ];

      for (var iSrc = 0; iSrc < sources.length; iSrc++) {
        var src = sources[iSrc];

        if (src.errors.length)
          gutterClassName += ' teapo-errors-' + src.kind;

        for (var i = 0; i < src.errors.length; i++) {
          var err = src.errors[i];
          var info = err.info();

          var lnerr = lineErrors[err.line()];
          var text = '[' + TypeScript.DiagnosticCategory[info.category] + '] ' + err.text();
          if (lnerr) {
            lnerr.text += '\n' + text;
          }
          else {
            lnerr = { text: text, classNames: {} };
            lineErrors[err.line()] = lnerr;
          }

          lnerr.classNames['teapo-gutter-' + src.kind + '-error'] = '';
        }
      }

      function createClickHandler(text: string) {
        return () => alert(text);
      }

      for (var i = 0; i < lineErrors.length; i++) {
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
        if (candidate.className && candidate.className.indexOf(className) >= 0)
          return candidate;
      }

      return null;
    }

    private _totalLengthOfLines(lines: string[]): number {
      var length = 0;
      for (var i = 0; i < lines.length; i++) {
        if (i > 0)
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
      kindSpan.textContent = this._completionEntry.kind + ' ';
      kindSpan.style.opacity = '0.6';
      element.appendChild(kindSpan);

      var nameSpan = document.createElement('span');
      nameSpan.textContent = this.text;
      element.appendChild(nameSpan);

      if (this._completionEntryDetails && this._completionEntryDetails.type) {
        var typeSpan = document.createElement('span');
        typeSpan.textContent = ' : ' + this._completionEntryDetails.type;
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

  function comparePos(a: CodeMirror.Pos, b: CodeMirror.Pos): number {
    if (a.line < b.line) return -1;
    if (a.line === b.line && a.ch < b.ch) return -1;
    if (a.line === b.line && a.ch === b.ch) return 0;
    return 1;
  }

  function rangeContains(range: { from: CodeMirror.Pos; to: CodeMirror.Pos; }, pos: CodeMirror.Pos): boolean {
    return comparePos(pos, range.from) <= 0 && comparePos(pos, range.to) >= 0;
  }

  export module EditorType {
    export var TypeScript: EditorType = new TypeScriptEditorType();
  }
}