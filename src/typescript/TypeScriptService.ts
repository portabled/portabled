module portabled.typescript {

  export class TypeScriptService {

    private _service: ts.LanguageService;

    compilerOptions: ts.CompilerOptions;
    cancellation: ts.CancellationToken = null;
    currentDirectory = '/';
    defaultLibFilenames = ['#core.d.ts', '#extensions.d.ts', '#dom.generated.d.ts'];

    log: (text: string) => void = null;

    host: ts.LanguageServiceHost;

    private _scriptFileNames: string[] = null;
    private _scripts: { [fullPath: string]: ScriptDocumentState; } = {};
    private _defaultLibSnapshots: { [file: string]: ts.IScriptSnapshot; } = {};

    private _preloadScriptFileNames: string[] = [];
    private _preloadPendingScriptFileNames: string[] = [];
    private _preloadTimeout = 0;

    constructor() {
      this.compilerOptions = ts.getDefaultCompilerOptions();
      this.compilerOptions.target = ts.ScriptTarget.ES5;
      this.host = this._createHost();
      this._service = ts.createLanguageService(
        this.host,
        this._createRegistry());
    }
  
    stopPreloading() {
      if (this._preloadScriptFileNames) {

        // from now on stop pretending only a subset of files exists, report all of them in host.getScriptFileNames()
        this._preloadScriptFileNames = null;
        this._preloadPendingScriptFileNames = null;
      }
    }

    service() {
      this.stopPreloading();

      return this._service;
    }

    addFile(file: string, doc: ExternalDocument) {
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
        }, 2000);
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

      var reportErrors: (errors: ts.Diagnostic[]) => void;
      if (this._preloadScriptFileNames.length < this.defaultLibFilenames.length) {
        // first work through the default libs
        var nextFile = this._preloadScriptFileNames[this._preloadScriptFileNames.length] = this.defaultLibFilenames[this._preloadScriptFileNames.length];
        reportErrors = errors => {
          if (console && typeof console.error == 'function') {
            console.error(nextFile + ' ' + errors.length + ' errors:');
            for (var i = 0; i < errors.length; i++) {
              var err = errors[i];
              console.error(err.file.getLineAndCharacterOfPosition(err.start), ' ', err.messageText);
            }
          }
          else {
            var all = [];
            for (var i = 0; i < errors.length; i++) {
              var err = errors[i];
              var pos = err.file.getLineAndCharacterOfPosition(err.start); 
              all.push(pos.line + ':' + pos.character + ' ' + err.messageText);
              alert(nextFile + ' ' + errors.length + ' errors:\n' + all.join('\n'));
            }
          }
        };
      }
      else {
        if (!this._preloadPendingScriptFileNames.length) {

          // finished preloading, from now on report all files instead of a subset
          this._preloadScriptFileNames = null;
          this._preloadPendingScriptFileNames = null;
          return; // TODO: call some event to notify it's all clear now
        }

        // after default libs are preloaded, get the other ordinary files
        var nextFile = this._preloadPendingScriptFileNames.shift();
        this._preloadScriptFileNames.push(nextFile);
      }

      var startPreload = dateNow();
      var errors= this._service.getSyntacticDiagnostics(nextFile);
      var preloadTimeSpent = dateNow() - startPreload;

      if (errors && errors.length && reportErrors)
        reportErrors(errors);

      var idleQuantum = Math.max(10, Math.min(300, preloadTimeSpent * 2));

      this._preloadTimeout = setTimeout(() => {

        if (!this._preloadScriptFileNames) return; // preloading stopped in the meantime

        var startPreload2 = dateNow();
        var errors = this._service.getSemanticDiagnostics(nextFile);
        var preloadTimeSpent2 = dateNow() - startPreload2;

        if (errors && errors.length && reportErrors)
          reportErrors(errors);

        var idleQuantum = Math.max(10, Math.min(200, preloadTimeSpent2 * 2));

        this._preloadTimeout = setTimeout(() => {

          if (!this._preloadScriptFileNames) return; // preloading stopped in the meantime

          var startPreload3 = dateNow();
          this._service.getEmitOutput(nextFile);
          var preloadTimeSpent3 = dateNow() - startPreload3;

          var idleQuantum = Math.max(10, Math.min(200, preloadTimeSpent3 * 2));

          this._preloadTimeout = setTimeout(() => {

            if (!this._preloadScriptFileNames) return; // preloading stopped in the meantime

            if (typeof console !== 'undefined' && typeof console.log === 'function')
              console.log(
                'TS preloaded ' + nextFile + ' ' +
                (preloadTimeSpent + preloadTimeSpent2 + preloadTimeSpent3) / 1000 + ' sec. ' +
                Math.floor(preloadTimeSpent * 100 / (preloadTimeSpent + preloadTimeSpent2 + preloadTimeSpent3)) + ':' +
                Math.floor(preloadTimeSpent2 * 100 / (preloadTimeSpent + preloadTimeSpent2 + preloadTimeSpent3)) + '%' +
                (this._preloadPendingScriptFileNames && this._preloadPendingScriptFileNames.length ? ' (' + this._preloadPendingScriptFileNames.length + ' to go)' : ''));

            this._continuePreload();

          }, idleQuantum);
        }, idleQuantum);
      }, idleQuantum);
    }

    private _createRegistry() {
      return ts.createDocumentRegistry();
    }

    private _createHost(): ts.LanguageServiceHost {
      var result: ts.LanguageServiceHost = {
        getCompilationSettings: () => this.compilerOptions,
        getScriptFileNames: () => {
          if (this._preloadScriptFileNames) {
            return this._preloadScriptFileNames;
          }

          if (!this._scriptFileNames) {
            this._scriptFileNames = [];
            for (var k in this._scripts) if (this._scripts.hasOwnProperty(k) && this._scripts[k])
              this._scriptFileNames.push(k);
            for (var i = 0; i < this.defaultLibFilenames.length; i++) {
              this._scriptFileNames.push(this.defaultLibFilenames[i]);
            }
            this._scriptFileNames.sort();
          }
          return this._scriptFileNames;
        },
        getScriptVersion: (file) => {
          if (this.defaultLibFilenames.indexOf(file) >= 0)
            return 'base';

          var script = this._scripts[file];
          return 'v' + script.getScriptVersion();
        },
        getScriptSnapshot: (file) => {
          if (this.defaultLibFilenames.indexOf(file) >= 0) {
            if (!this._defaultLibSnapshots[file]) {
              var elementId = file.charAt(0) === '#' ? file.slice(1) : file;
              var scriptElement = <HTMLScriptElement>document.getElementById(elementId);
              if (scriptElement == null)
                return null;
              this._defaultLibSnapshots[file] = ts.ScriptSnapshot.fromString(scriptElement.text || scriptElement.textContent || scriptElement.innerText);
            }
            return this._defaultLibSnapshots[file];
          }

          return this._scripts[file].getScriptSnapshot();
        },
        getLocalizedDiagnosticMessages: () => null,
        getCancellationToken: () => this.cancellation,
        getCurrentDirectory: () => this.currentDirectory,
        getNewLine: () => '\n',
        getDefaultLibFileName: () => this.defaultLibFilenames[0],
        log: (text) => {
          if (this.log) {
            this.log(text);
          }
          else {
            if (typeof console != 'indefined') {
              if (typeof console.groupCollapsed === 'function' && typeof console.groupEnd === 'function') {
                console.groupCollapsed('TS');
                if (typeof console.log === 'function')
                  console.log(text);
                console.groupEnd();
              }
              else if (typeof console.info === 'function') {
                console.info('*** TS ' + text);
              }
              else if (typeof console.log === 'function') {
                console.log('*** TS ' + text);
              }
            }
          }
        }
      };
      return result;

    }

  }

}