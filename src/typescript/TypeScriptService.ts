module teapo.typescript {

  export class TypeScriptService {

    private _service: ts.LanguageService;

    compilerOptions: ts.CompilerOptions;
    cancellation: ts.CancellationToken = null;
    currentDirectory = '/';
    defaultLibFilename = '#lib.d.ts';

    log: (text: string) => void = null;
  
    host: ts.LanguageServiceHost;

    private _scriptFileNames: string[] = null;
    private _scripts: { [fullPath: string]: ScriptDocumentState; } = {};
    private _defaultLibSnapshot: TypeScript.IScriptSnapshot = null;

    private _preloadScriptFileNames: string[] = [this.defaultLibFilename];
    private _preloadPendingScriptFileNames: string[] = [];
    private _preloadTimeout = 0;

    constructor() {
      this.compilerOptions = ts.getDefaultCompilerOptions();
      this.host = this._createHost();
      this._service = ts.createLanguageService(
        this.host,
        this._createRegistry());
    }

    service() {
      if (this._preloadScriptFileNames) {
        this._preloadScriptFileNames = null;
        this._preloadPendingScriptFileNames = null;
      }
      return this._service;
    }

    addFile(file: string, doc: ExternalDocument){
      var script = new ScriptDocumentState(doc);
      this._scripts[file] = script;
      this._scriptFileNames = null;
      if (this._preloadPendingScriptFileNames) {
        this._preloadPendingScriptFileNames.push(file);
        if (this._preloadTimeout)
          clearTimeout(this._preloadTimeout);
        this._preloadTimeout = setTimeout(() => {
          if (this._preloadPendingScriptFileNames)
            this._preloadPendingScriptFileNames.sort();
          this._continuePreload();
        }, 100);
      }
    }

    removeFile(file: string) {
      delete this._scripts[file];
      this._scriptFileNames = null;

      if (this._preloadScriptFileNames) {
        for (var i = 0; i < this._preloadPendingScriptFileNames.length; i++) {
          if (this._preloadPendingScriptFileNames[i] === file) {
            delete this._preloadPendingScriptFileNames[i];
            break;
          }
        }
      }
      if (this._preloadScriptFileNames) {
        for (var i = 0; i < this._preloadScriptFileNames.length; i++) {
          if (this._preloadScriptFileNames[i] === file) {
            delete this._preloadScriptFileNames[i];
            break;
          }
        }
      }
    }

    private _continuePreload() {

      this._preloadTimeout = 0;

      if (!this._preloadScriptFileNames || !this._preloadPendingScriptFileNames)
        return;

      if (!this._preloadPendingScriptFileNames.length) {
        this._preloadScriptFileNames = null;
        this._preloadPendingScriptFileNames = null;
        return; // TODO: call some event to notify it's all clear now
      }

      var nextFile = this._preloadPendingScriptFileNames.shift();
      this._preloadScriptFileNames.push(nextFile);

      // just in case they've changed it at the load time
      this._preloadScriptFileNames[0] = this.defaultLibFilename;

      this._service.getSemanticDiagnostics(nextFile);

      this._preloadTimeout = setTimeout(() => {
        this._continuePreload();
      }, 10);
    }

    private _createRegistry() {
      return ts.createDocumentRegistry();
    }
  
    private _createHost(): /*ts.LanguageServiceHost*/ any {
      return {
        getCompilationSettings: () => this.compilerOptions,
        getScriptFileNames: () => {
          if (this._preloadScriptFileNames)
            return this._preloadScriptFileNames;

          if (!this._scriptFileNames) {
            this._scriptFileNames = objectKeys(this._scripts);
            this._scriptFileNames.push(this.defaultLibFilename);
            this._scriptFileNames.sort();
          }
          return this._scriptFileNames;
        },
        getScriptVersion: (file) => {
          if (file === this.defaultLibFilename)
            return 0;

          var script = this._scripts[file];
          return script.getScriptVersion();
        },
        getScriptIsOpen: () => true,
        getScriptSnapshot: (file) => {
          if (file === this.defaultLibFilename) {
            if (!this._defaultLibSnapshot) {
              var scriptElement = document.getElementById('lib.d.ts');
              if (scriptElement == null)
                return null;
              this._defaultLibSnapshot = TypeScript.ScriptSnapshot.fromString(scriptElement.innerText);
            }
            return this._defaultLibSnapshot;
          }

          return this._scripts[file].getScriptSnapshot();
        },
        getLocalizedDiagnosticMessages: () => null,
        getCancellationToken: () => this.cancellation,
        getCurrentDirectory: () => this.currentDirectory,
        getDefaultLibFilename: () => this.defaultLibFilename,
        log: (text) => {
          if (this.log) {
            this.log(text);
          }
          else {
            if (typeof console !== 'undefined')
              console.log(text);
          }
        }
      };
      
    }
    
  }

}