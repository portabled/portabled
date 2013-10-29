/// <reference path='typings/typescriptServices.d.ts' />

/// <reference path='DocumentState.ts' />

class TypeScriptService {
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

  service: Services.ILanguageService;

  private _scriptCache: any = {};
  private _staticScripts: any = {};

  constructor(staticScripts: any) {

    if (staticScripts) {
      for (var s in staticScripts) if (staticScripts.hasOwnProperty(s)) {
        var script = TypeScript.ScriptSnapshot.fromString(staticScripts[s]+'');
        this._staticScripts[s] = script;
      }
    }

    var factory = new Services.TypeScriptServicesFactory();
    this.service = factory.createPullLanguageService(this._createLanguageServiceHost());
  }

  addDocument(fileName: string, doc: CodeMirror.Doc) {
    var script = new DocumentState(doc);
    this._scriptCache[fileName] = script;
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
        console.log('...getScriptFileNames():',result);
        return result;
      },
      getScriptVersion: (fileName: string) => {
        var script = this._scriptCache[fileName];
        if (script && script.version)
          return script.version;
        return -1;
      },
      getScriptIsOpen: (fileName: string) => {
        return true;
      },
      getScriptByteOrderMark: (fileName: string) => ByteOrderMark.None,
      getScriptSnapshot: (fileName: string) => {
        var script = this._scriptCache[fileName] || this._staticScripts[fileName];
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
        console.log('...resolveRelativePath('+path+'):', result);
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
    console.log(text);
  }
}