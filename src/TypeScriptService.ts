/// <reference path='typings/typescriptServices.d.ts' />
/// <reference path='typings/codemirror.d.ts' />

module teapo {

  export class TypeScriptService {
    private static _emptySnapshot = {
      getText: (start, end) => '',
      getLength: () => 0,
      getLineStartPositions: () => [],
      getTextChangeRangeSinceVersion: (scriptVersion) => TypeScript.TextChangeRange.unchanged
    };
  
    logLevels = {
      information: true,
      debug: true,
      warning: true,
      error: true,
      fatal: true
    };
    
    compilationSettings = new TypeScript.CompilationSettings();
  
    service: TypeScript.Services.ILanguageService;
  
    private _scriptCache: any = {};
    private _staticScripts: any = {};
  
    constructor(staticScripts: any = {}) {
  
      if (staticScripts) {
        for (var s in staticScripts) if (staticScripts.hasOwnProperty(s)) {
          var script = TypeScript.ScriptSnapshot.fromString(staticScripts[s]+'');
          this._staticScripts[s] = script;
        }
      }
  
      var factory = new TypeScript.Services.TypeScriptServicesFactory();
      this.service = factory.createPullLanguageService(this._createLanguageServiceHost());
    }
  
    addDocument(d: { fullPath: string; getDoc(): CodeMirror.Doc; }) {
      var script = new DocumentState(d);
      this._scriptCache[d.fullPath] = script;
    }
  
    removeDocument(fileName) {
      delete this._scriptCache[fileName];
    }
  
    private _createLanguageServiceHost() {
      return {
        getCompilationSettings: () => this.compilationSettings,
        getScriptFileNames: () => {
          var result = Object.keys(this._scriptCache);
          for (var s in this._staticScripts) if (this._staticScripts.hasOwnProperty(s)) {
            if (!this._scriptCache.hasOwnProperty(s))
              result.push(s);
          }
          //console.log('...getScriptFileNames():',result);
          return result;
        },
        getScriptVersion: (fileName: string) => {
          var script: DocumentState = this._scriptCache[fileName];
          if (script)
            return script.getVersion();
          return -1;
        },
        getScriptIsOpen: (fileName: string) => {
          return true;
        },
        getScriptByteOrderMark: (fileName: string) => TypeScript.ByteOrderMark.None,
        getScriptSnapshot: (fileName: string) => {
          var script: DocumentState = this._scriptCache[fileName] || this._staticScripts[fileName];
          return script;
        },
        getDiagnosticsObject: () => {
          return { log: (text:string) => this._log(text) };
        },
        getLocalizedDiagnosticMessages: () => null,
        information: () => this.logLevels.information,
        debug: () => this.logLevels.debug,
        warning: () => this.logLevels.warning,
        error: () => this.logLevels.error,
        fatal: () => this.logLevels.fatal,
        log: (text: string) => this._log(text),
        resolveRelativePath: (path: string) => {
          var result = path;
          //console.log('...resolveRelativePath('+path+'):', result);
          return result;
        },
        fileExists: (path: string) => {
          // don't issue a full resolve,
          // this might be a mere probe for a file
          return this._scriptCache[path] || this._staticScripts[path] ? true : false;
        },
        directoryExists: (path: string) => true,
        getParentDirectory: (path: string) => {
          path = TypeScript.switchToForwardSlashes(path);
          var slashPos = path.lastIndexOf('/');
          if (slashPos===path.length-1)
            slashPos = path.lastIndexOf('/', path.length-2);
          if (slashPos>0)
            return path.slice(0,slashPos);
          else
            return '/';
        }
      }
    }
  
    private _log(text) {
      // console.log(text);
    }
  }
          
  class DocumentState implements TypeScript.IScriptSnapshot {
  
    private _version = 0;
    private _changes: TypeScript.TextChangeRange[] = [];
    private _simpleText: string = null;
  
    constructor(private _d: { fullPath: string; getDoc(): CodeMirror.Doc; }) {
      CodeMirror.on(this._d.getDoc(), 'change', (e,change) => this._onChange(change));
    }
  
    /**
     * Not a part of IScriptSnapshot, unlike other public methods here.
     * Need to find out who's calling into this (and kill them, naturally).
     */
    getVersion(): number {
      // console.log('DocumentState.getVersion() // ',this._version);
      return this._version;
    }
  
    getText(start: number, end: number): string {
      var text = this._getTextCore(start, end);
//      var doc = this._d.getDoc();
//      var startPos = doc.posFromIndex(start);
//      var lead = start ? this._getTextCore(start-startPos.ch,start) : '';
//      var endPos = doc.posFromIndex(end);
//      var line = doc.getLine(endPos.line);
//      var trail = endPos.ch < line.length ? this._getTextCore(end, end + line.length - endPos.ch) : '';
//      var textSmall = text;
//      if (textSmall.length > 40)
//        textSmall = textSmall.slice(0, 17)+'...'+(text.length)+'...'+textSmall.slice(textSmall.length-17);
//      if (textSmall.indexOf('\n')>=0)
//        textSmall = textSmall.replace(/\n/g, '\\n');
//      console.log('DocumentState.getText(',start,',',end,') // ['+startPos.line+'] "'+lead+'['+textSmall+']'+trail+'"');
      return text;
    }

    private _getTextCore(start: number, end: number): string {
      if (this._simpleText===null)
        this._simpleText = this._d.getDoc().getValue();

      return this._simpleText.slice(start,end);
    }
  
    getLength(): number {
      var length = this._getLengthCore();
      // console.log('DocumentState.getLength() // ',length);
      return length;
    }

    private _getLengthCore(): number {
      var doc = this._d.getDoc();
      var lineCount = doc.lineCount();
      if (lineCount===0)
        return 0;
  
      var lastLineStart = doc.indexFromPos({line:lineCount-1,ch:0});
      var lastLine = doc.getLine(lineCount-1);
      var length = lastLineStart + lastLine.length;
      return length;
    }
  
    getLineStartPositions(): number[] {
      var result: number[] = [];
      var current = 0;
      var doc = this._d.getDoc();
      doc.eachLine((lineHandle) => {
        result.push(current);
        current += lineHandle.text.length+1; // plus EOL character
      });
      return result;
    }
  
    getTextChangeRangeSinceVersion(scriptVersion: number): TypeScript.TextChangeRange {
      var startVersion = this._version - this._changes.length;

      var doc = this._d.getDoc();
  
      if (scriptVersion < startVersion) {
        var wholeText = doc.getValue();
        return new TypeScript.TextChangeRange(
          TypeScript.TextSpan.fromBounds(0,0),
          wholeText.length);
      }
  
      var chunk: TypeScript.TextChangeRange[];
  
       if (scriptVersion = startVersion)
        chunk = this._changes;
      else
        chunk = this._changes.slice(scriptVersion - startVersion);
      //this._changes.length = 0;
      var result = TypeScript.TextChangeRange.collapseChangesAcrossMultipleVersions(this._changes);
      return result;
    }
  
  
    private _onChange(change): void {
      var doc = this._d.getDoc();
      var offset = doc.indexFromPos(change.from);
      var oldLength = this._totalLengthOfLines(change.removed);
      var newLength = this._totalLengthOfLines(change.text);
  
      var ch = new TypeScript.TextChangeRange(
          TypeScript.TextSpan.fromBounds(offset, offset+oldLength),
          newLength);
  
      this._changes.push(ch) ;
  
      this._version++;
      this._simpleText = null;
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
}