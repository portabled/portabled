module teapo.docs.types.text.ts_ {

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

    private _changes: TypeScript.TextChangeRange[] = [];
    private _diagMarkers: CodeMirror.TextMarker[] = null;
    private _diagsTimer = new Timer();

    constructor() {
      super();

      this._diagsTimer.interval = 600;
      this._diagsTimer.ontick = () => this._updateDiags();
    }

    load(text: string) {
      typescriptService().addFile(this.path, this);
    }

    open() {
    }

    close() {
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

      this._changes.push(new TypeScript.TextChangeRange(
        new TypeScript.TextSpan(summary.lead, summary.mid),
        summary.mid));

      this._diagsTimer.reset();

      super.onChanges(docChanges, summary);
    }

    changes(): TypeScript.TextChangeRange[] {
      return this._changes;
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
      });

    }
      
    private _addDiag(d: ts.Diagnostic, kind: string) {
      var tsFrom = d.file.getLineAndCharacterFromPosition(d.start);
      var tsTo = d.file.getLineAndCharacterFromPosition(d.start + d.length);
      var marker = this.doc.markText(
        CodeMirror.Pos(tsFrom.line-1, tsFrom.character-1),
        CodeMirror.Pos(tsTo.line-1, tsTo.character-1),
        {
          className: 'teapo-diag teapo-diag-'+kind+' teapo-diag-'+ts.DiagnosticCategory[d.category]
        });
      this._diagMarkers.push(marker);
      // TODO: update rendering
    }

  }

  export function createCodeMirrorDoc(text: string): CodeMirror.Doc {
    return new CodeMirror.Doc(text || '', 'text/typescript');
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