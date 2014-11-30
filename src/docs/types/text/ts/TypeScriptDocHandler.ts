module portabled.docs.types.text.ts_ {

  export var expectsFile = /.*\.ts/g;
  export var acceptsFile = /.*\.ts/g;
  
  var _typescriptService: typescript.TypeScriptService;

  function typescriptService() {
    if (!_typescriptService) {
      _typescriptService = new typescript.TypeScriptService();
      build.functions.typescriptBuild.mainTS = _typescriptService;
    }

    return _typescriptService;
  }

  export function loadText(path: string, storage: DocState): CodeMirrorTextDoc {
    return new TypeScriptDocHandler();
  }

  export class TypeScriptDocHandler
    extends base.SimpleCodeMirrorDocHandler
    implements typescript.ExternalDocument {

    private _changes: ts.TextChangeRange[] = [];

    private _diagMarkers: CodeMirror.TextMarker[] = null;
    private _diagsTimer = new Timer();

    private _matchHighlightTimer = new Timer();
    private _matchMarkers: { marker: CodeMirror.TextMarker; offset: number; isCurrent: boolean; }[] = null;
    private _matchMarkersInvalidated = true;

    private _statusUpdateTimer = new Timer();

    private _autoformatInProgress = false;

    constructor() {
      super();

      this.keyMap['Ctrl-,'] = () => this._matchGo(-1);
      this.keyMap['Ctrl-<'] = () => this._matchGo(-1);
      this.keyMap['Alt-,'] = () => this._matchGo(-1);
      this.keyMap['Alt-<'] = () => this._matchGo(-1);
      this.keyMap['Ctrl-.'] = () => this._matchGo(+1);
      this.keyMap['Ctrl->'] = () => this._matchGo(+1);
      this.keyMap['Alt-.'] = () => this._matchGo(+1);
      this.keyMap['Alt->'] = () => this._matchGo(+1);


      this._matchHighlightTimer.interval = 400;
      this._matchHighlightTimer.ontick = () => this._updateMatchHighlight();

      this._diagsTimer.interval = 600;
      this._diagsTimer.ontick = () => this._updateDiags();

      this._statusUpdateTimer.interval = 200;
      this._statusUpdateTimer.ontick = () => this._updateStatus();
    }

    load(text: string) {
      typescriptService().addFile(this.path, this);
    }

    open() {
      this._diagsTimer.reset();
      this._matchHighlightTimer.reset();
      this._statusUpdateTimer.reset();
    }

    close() {
      this._diagsTimer.stop();
      this._matchHighlightTimer.stop();
      this._statusUpdateTimer.stop();
    }

    shouldTriggerCompletion(textBeforeCursor: string) {
      var lastChar = textBeforeCursor.charAt(textBeforeCursor.length - 1);
      if (lastChar === '.')
        return true;
      if (lastChar.toLowerCase() !== lastChar.toUpperCase())
        return true;
    }
    
    getCompletions(): any {
      var cur = this.doc.getCursor();
      var curOffset = this.doc.indexFromPos(cur);
      
      var completions = typescriptService().service().getCompletionsAtPosition(
        this.path,
        curOffset,
        false);
      
      if (!completions || !completions.entries.length)
        return;

      var lineText = this.doc.getLine(cur.line);
      var prefixLength = 0;
      while (prefixLength < cur.ch) {
        var ch = lineText.charAt(cur.ch - prefixLength-1);
        if (!isalphanumeric(ch))
          break;
        prefixLength++;
      }
      var suffixLength = 0;
      while (cur.ch + suffixLength < lineText.length) {
        var ch = lineText.charAt(cur.ch + suffixLength);
        if (!isalphanumeric(ch))
          break;
        suffixLength++;
      }
      var lead = lineText.slice(0, cur.ch - prefixLength);
      var prefix = lineText.slice (cur.ch - prefixLength, cur.ch);
      var suffix = lineText.slice(cur.ch, cur.ch + suffixLength);
      var trail = lineText.slice(cur.ch + suffixLength);
      var matchTextLower = prefix.toLowerCase();
      
      var completionEntries: CodeMirrorCompletion[] = [];
      for (var i = 0; i < completions.entries.length; i++) {
        if (completionEntries.length > 16) break;
        var co = completions.entries[i];
        
        if (prefixLength && co.name.toLowerCase().indexOf(matchTextLower) < 0)
          continue;
        
        var det = typescriptService().service().getCompletionEntryDetails(this.path, curOffset, co.name);

        completionEntries.push(new CodeMirrorCompletion(
          lead, prefix, suffix, trail, cur.line,
          co, det));
      }

      if (!completionEntries.length
       || (completionEntries.length === 1 && completionEntries[completionEntries.length - 1].text === prefix))
        return;

      var result: CodeMirror.showHint.CompletionResult = {
        list: completionEntries,
        from: CodeMirror.Pos(cur.line, cur.ch - prefixLength),
        to: cur
      };

      return result;
    }

    onChanges(docChanges: CodeMirror.EditorChange[], summary: ChangeSummary) {

      this._changes.push(new ts.TextChangeRange(
        new ts.TextSpan(summary.lead, summary.mid),
        summary.mid));

      this._diagsTimer.reset();
      this._matchHighlightTimer.reset();
      this._matchMarkersInvalidated = true;

      this._statusUpdateTimer.reset();

      super.onChanges(docChanges, summary);

      this._autoformatAsNeeded(docChanges);
    }

    onCursorMoved(cursorPos: CodeMirror.Pos) {
      this._matchHighlightTimer.reset();
      this._statusUpdateTimer.reset();
    }

    changes(): ts.TextChangeRange[] {
      return this._changes;
    }

    private _autoformatAsNeeded(docChanges: CodeMirror.EditorChange[]) {

      if (this._autoformatInProgress)
        return;

      var ch = docChanges[docChanges.length-1];
      var chText = ch.text.length ? ch.text[ch.text.length-1] : null;
      if (!chText && ch.text.length > 1)
        chText = '\n';
      
      var lastch = chText.charAt(chText.length-1);
      switch (lastch) {
        case '}':
        case ';':
        case '\n':
          break;

        default:
          return;
      }

      var cursor = this.doc.getCursor();
      var cursorOffset = this.doc.indexFromPos(cursor);

      var fmtOps: ts.FormatCodeOptions = {
        IndentSize: 2,
        TabSize: 2,
        NewLineCharacter: '\n',
        ConvertTabsToSpaces: true,

        InsertSpaceAfterCommaDelimiter: true,
        InsertSpaceAfterSemicolonInForStatements: true,
        InsertSpaceBeforeAndAfterBinaryOperators: true,
        InsertSpaceAfterKeywordsInControlFlowStatements: true,
        InsertSpaceAfterFunctionKeywordForAnonymousFunctions: false,
        InsertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis: false,
        PlaceOpenBraceOnNewLineForFunctions: false,
        PlaceOpenBraceOnNewLineForControlBlocks: false,
      };

      var fmtEdits = typescriptService().service().getFormattingEditsAfterKeystroke(
        this.path,
        cursorOffset,
        lastch,
        fmtOps);
      console.log('..'+JSON.stringify(lastch));

      if (fmtEdits && fmtEdits.length) {
        this._autoformatInProgress = true;
        this.editor.operation(() => {
          for (var i = 0; i < fmtEdits.length; i++) {
            var ed = fmtEdits[i];
            var from = this.doc.posFromIndex(ed.span.start());
            var to = this.doc.posFromIndex(ed.span.end());
            this.doc.replaceRange(ed.newText, from, to);
            console.log('change '+i+':: '+from.line+':'+from.ch+'['+ed.span.length()+']='+JSON.stringify(ed.newText));
          }
        });
        this._autoformatInProgress = false;
      }
        
    }

    private _updateDiags() {
      if (this.removed) return;

      this.editor.operation(() => {

        if (this._diagMarkers) {
          for (var i = 0; i <this._diagMarkers.length; i++) {
            var m = this._diagMarkers[i];
            m.clear();
          }
        }
        this._diagMarkers = [];

        var syntacticDiags = typescriptService().service().getSyntacticDiagnostics(this.path);
        var semanticDiags = typescriptService().service().getSemanticDiagnostics(this.path);

        if (syntacticDiags) {
          for (var i = 0; i < syntacticDiags.length; i++) {
            this._addDiag(syntacticDiags[i], 'syntactic');
          }
        }

        if (semanticDiags) {
          for (var i = 0; i < semanticDiags.length; i++) {
            this._addDiag(semanticDiags[i], 'semantic');
          }
        }

        this._updateStatus();
      });

    }
      
    private _addDiag(d: ts.Diagnostic, kind: string) {
      var tsFrom = d.file.getLineAndCharacterFromPosition(d.start);
      var tsTo = d.file.getLineAndCharacterFromPosition(d.start + d.length);
      var marker = this.doc.markText(
        CodeMirror.Pos(tsFrom.line-1, tsFrom.character-1),
        CodeMirror.Pos(tsTo.line-1, tsTo.character-1),
        {
          className: 'portabled-diag portabled-diag-'+kind+' portabled-diag-'+ts.DiagnosticCategory[d.category]
        });
      marker['__error'] = d;
      this._diagMarkers.push(marker);
      // TODO: update rendering
    }

    private _updateMatchHighlight() {
      if (!this.doc && !this.editor)
        return;

      var cursor = this.doc.getCursor();
      var cursorOffset = this.doc.indexFromPos(cursor);
      if (!this._matchMarkersInvalidated && this._matchMarkers) {
        for (var i = 0; i < this._matchMarkers.length; i++) {
          var m = this._matchMarkers[i];
          var pos = m.marker.find();
          if (compareSign(pos.from, cursor)<=0 && compareSign(cursor, pos.to)<=0) {
            if (m.isCurrent) {
              // all is well
              return;
            }
          }
        }
      }

      this.editor.operation(() => {

        if (this._matchMarkers) {
          for (var i = 0; i < this._matchMarkers.length; i++) {
            this._matchMarkers[i].marker.clear();
          }
        }
        this._matchMarkers = [];

        var newMatches = typescriptService().service().getOccurrencesAtPosition(this.path, cursorOffset);
        if (!newMatches)
          return;

        for (var i = 0; i < newMatches.length; i++) {
          var m = newMatches[i];
          if (m.fileName !== this.path)
            continue;

          var from = this.doc.posFromIndex(m.textSpan.start());
          var to = this.doc.posFromIndex(m.textSpan.end());

          var isCurrent = m.textSpan.containsPosition(cursorOffset);

          var marker = this.doc.markText(
            from,
            to,
            {
              className: isCurrent ? 'portabled-match portabled-match-current' : 'portabled-match'
            });
          this._matchMarkers.push({ marker: marker, offset: m.textSpan.start(), isCurrent: isCurrent });

        }

        this._matchMarkers.sort((m1, m2) => m1.offset - m2.offset);

      });

      this._matchMarkersInvalidated = false;
      
    }
      
    private _matchGo(dir: number) {
      if (!this.doc && !this.editor)
        return;

      if (this._matchHighlightTimer.isWaiting())
        this._matchHighlightTimer.endWaiting();
      if (!this._matchMarkers)
        this._updateMatchHighlight();

      var cursor = this.doc.getCursor();
      var cursorOffset = this.doc.indexFromPos(cursor);

      for (var matchIndex = 0; matchIndex < this._matchMarkers.length; matchIndex++) {
        var m = this._matchMarkers[matchIndex];
        if (m.isCurrent)
          break;
      }

      if (matchIndex >= this._matchMarkers.length)
        return;

      var newMatchIndex = matchIndex + dir;
      if (newMatchIndex < 0)
        newMatchIndex = this._matchMarkers.length - 1;
      else if (newMatchIndex >= this._matchMarkers.length)
        newMatchIndex = 0;

      var innerOffset = cursorOffset - this._matchMarkers[matchIndex].offset;
      var newCursorOffset = this._matchMarkers[newMatchIndex].offset + innerOffset;
      var newCursor = this.doc.posFromIndex(newCursorOffset);

      this.doc.setCursor(newCursor);
      this._updateMatchHighlight();
        
    }

    private _updateStatus() {
      if (!this.editor)
        return;

      var cursor = this.doc.getCursor();
      var cursorOffset = this.doc.indexFromPos(cursor);

      if (this._diagMarkers) {
        var anyErrors = false;
        for (var i = 0; i < this._diagMarkers.length; i++) {
          var dm = this._diagMarkers[i];
          var dmPos = dm.find();
          if (dmPos
              && compareSign(dmPos.from, cursor)<=0 
              && compareSign(cursor, dmPos.to)<=0) {
            var d: ts.Diagnostic = dm['__error'];

            var errSpan = document.createElement('span');
            if ('textContent' in errSpan)
              errSpan.textContent = '? '+d.messageText+' ';
            else
              errSpan.innerText = '? '+d.messageText + ' ';
            
            errSpan.className = 'portabled-diag-'+ts.DiagnosticCategory[d.category];

            setTextContent(this.status, '');

            this.status.appendChild(errSpan);
            anyErrors = true;
          }
        }

        if (anyErrors)
          return;
      }

      var signature = typescriptService().service().getSignatureHelpItems(this.path, cursorOffset);
      if (signature && signature.items.length) {
        setTextContent(this.status, '');

        var si = signature.items[signature.selectedItemIndex || 0];
        if (si.prefixDisplayParts)
          renderSyntaxPart(si.prefixDisplayParts, this.status);
        if (si.parameters) {
          for (var i = 0; i < si.parameters.length; i++) {
            if (i > 0)
              renderSyntaxPart(si.separatorDisplayParts, this.status);
            if (i === signature.argumentIndex) {
              var paramHighlight = document.createElement('span');
              paramHighlight.className = 'portabled-syntax-current';
            	renderSyntaxPart(si.parameters[i].displayParts, paramHighlight);
              this.status.appendChild(paramHighlight);
            }
            else {
              renderSyntaxPart(si.parameters[i].displayParts, this.status);
            }
          }
        }
        if (si.suffixDisplayParts)
          renderSyntaxPart(si.suffixDisplayParts, this.status);

        if (si.documentation && si.documentation.length) {
          var docSpan = document.createElement('span');
          docSpan.className = 'portabled-syntax-docs';
          setTextContent(docSpan, ' // ');
          renderSyntaxPart(si.documentation, docSpan);
          this.status.appendChild(docSpan);
        }
        
      }
      else {
        var qi = typescriptService().service().getQuickInfoAtPosition(this.path, cursorOffset);
        if (qi && qi.displayParts) {
          setTextContent(this.status, '');

          var skipUntilCloseBracket = true;
          for (var i = 0; i < qi.displayParts.length; i++) {
            var dip = qi.displayParts[i];
            if (skipUntilCloseBracket) {
              if (dip.text === ')')
                skipUntilCloseBracket = false;
              continue;
            }
            if (!dip.text)
              continue; // TS really does inject empty tokens

            var sp = document.createElement('span');
            if ('textContent' in sp)
              sp.textContent = dip.text;
            else
              sp.innerText = dip.text;
            sp.className = 'portabled-syntax-'+dip.kind;
            
            this.status.appendChild(sp);
          }

          if (qi.documentation && qi.documentation.length) {
            var sp = document.createElement('span');
            var sp = document.createElement('span');
            if ('textContent' in sp)
              sp.textContent = ' // ';
            else
              sp.innerText = ' // ';
            sp.className = 'portabled-syntax-comment';
            this.status.appendChild(sp);

            for (var i = 0; i < qi.documentation.length; i++) {
              var dip = qi.documentation[i];

              if (!dip.text)
                continue; // TS really does inject empty tokens

              var sp = document.createElement('span');
              if ('textContent' in sp)
                sp.textContent = dip.text;
              else
                sp.innerText = dip.text;
              sp.className = 'portabled-syntax-'+dip.kind;

              this.status.appendChild(sp);
            }
          }
        }
        else {
          if ('textContent' in this.status)
            this.status.textContent = this.path;
          else
            this.status.innerText = this.path;
        }
      }
    }

  }

  export function createCodeMirrorDoc(text: string): CodeMirror.Doc {
    return new CodeMirror.Doc(text || '', 'text/typescript');
  }

  function compareSign(p1: CodeMirror.Pos, p2: CodeMirror.Pos) {
    if (p1.line > p2.line)
      return 1;
    else if (p1.line < p2.line)
      return -1;
    else if (p1.ch > p2.ch)
      return 1;
    else if (p1.ch < p2.ch)
      return -1;
    else
      return 0;      
  }

  function isalphanumeric(ch: string) {
    if (ch >= '0' && ch <= '9') return true;
    if (ch >= 'A' && ch <= 'Z') return true;
    if (ch >= 'a' && ch <= 'z') return true;
    if (ch === '_' || ch ==='$') return true;
    if (ch.charCodeAt(0) < 128) return false;
    // slow Unicode path
    return ch.toLowerCase() !== ch.toUpperCase();
  }

}