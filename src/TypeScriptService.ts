/// <reference path='typings/typescriptServices.d.ts' />
/// <reference path='typings/codemirror.d.ts' />

module teapo {

  export class TypeScriptService {

    logLevels = {
      information: true,
      debug: true,
      warning: true,
      error: true,
      fatal: true
    };
    
    compilationSettings = new TypeScript.CompilationSettings();
  
    service: TypeScript.Services.ILanguageService;
  
    scripts: { [fullPath: string]: TypeScriptService.Script; } = {};
  
    constructor() {
      var factory = new TypeScript.Services.TypeScriptServicesFactory();
      this.service = factory.createPullLanguageService(this._createLanguageServiceHost());
    }
  
    private _createLanguageServiceHost() {
      return {
        getCompilationSettings: () => this.compilationSettings,
        getScriptFileNames: () => {
          var result = Object.keys(this.scripts);
          //console.log('...getScriptFileNames():',result);
          return result;
        },
        getScriptVersion: (fileName: string) => {
          var script = this.scripts[fileName];
          if (script.changes)
            return script.changes.length;
          return 0;
        },
        getScriptIsOpen: (fileName: string) => {
          return true;
        },
        getScriptByteOrderMark: (fileName: string) => TypeScript.ByteOrderMark.None,
        getScriptSnapshot: (fileName: string) => {
          var script = this.scripts[fileName];
          if (!script.cachedSnapshot)
            script.cachedSnapshot = new TypeScriptDocumentState(script);
          return script.cachedSnapshot;
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
          return this.scripts[path] ? true : false;
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

  export module TypeScriptService {
    export interface Script {
      text(): string;
      changes: TypeScript.TextChangeRange[];
      cachedSnapshot: TypeScript.IScriptSnapshot;
    }
  }
 
  class TypeScriptDocumentState implements TypeScript.IScriptSnapshot {
  
    constructor(public scriptData: TypeScriptService.Script) {
    }

    getText(start: number, end: number): string {
      var text = this._getText();
      var result = text.slice(start,end);
      return result;
    }
  
    getLength(): number {
      var text = this._getText();
      return text.length;
    }
  
    getLineStartPositions(): number[] {
      var text = this._getText();
      var result = TypeScript.TextUtilities.parseLineStarts(text);
      return result;
    }
  
    getTextChangeRangeSinceVersion(scriptVersion: number): TypeScript.TextChangeRange {
      if (!this.scriptData.changes)
        return TypeScript.TextChangeRange.unchanged;

      var chunk = this.scriptData.changes.slice(scriptVersion+1);

      var result = TypeScript.TextChangeRange.collapseChangesAcrossMultipleVersions(chunk);
      return result;
    }

    private _getText() {
      return this.scriptData.text ? this.scriptData.text() : <string><any>this.scriptData;
    }
  
//      var offset = doc.indexFromPos(change.from);
//      var oldLength = this._totalLengthOfLines(change.removed);
//      var newLength = this._totalLengthOfLines(change.text);
//  
//      var ch = new TypeScript.TextChangeRange(
//          TypeScript.TextSpan.fromBounds(offset, offset+oldLength),
//          newLength);
  }
}