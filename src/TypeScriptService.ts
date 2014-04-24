/// <reference path='typings/typescriptServices.d.ts' />
/// <reference path='typings/codemirror.d.ts' />

module teapo {

  /**
   * Pubic API exposing access to TypeScript language  services
   * (see its service property)
   * and handling the interfaces TypeScript requires
   * to access to the source code and the changes.
   */
  export class TypeScriptService {

    /** Set of booleans for each log severity level. */
    logLevels = {
      information: false,
      debug: false,
      warning: true,
      error: true,
      fatal: true
    };

    /** TypeScript custom settings. */
    compilationSettings = new TypeScript.CompilationSettings();

    /** Main public API of TypeScript compiler/parser engine. */
    service: TypeScript.Services.ILanguageService;

    /** Files added to the compiler/parser scope, by full path. */
    scripts: { [fullPath: string]: TypeScriptService.Script; } = {};

    log: { logLevel: string; text: string; }[] = null;
  
    private _logLevel: string = null;


    constructor() {

      var factory = new TypeScript.Services.TypeScriptServicesFactory();
      this.service = factory.createPullLanguageService(this._createLanguageServiceHost());
    }

    /**
     * The main API required by TypeScript for talking to the host environment. */
    private _createLanguageServiceHost() {
      return {
        getCompilationSettings: () => this.compilationSettings,
        getScriptFileNames: () => {
          var result = Object.keys(this.scripts).filter(k => this.scripts.hasOwnProperty(k)).sort();
          //console.log('...getScriptFileNames():',result);
          return result;
        },
        getScriptVersion: (fileName: string) => {
          var script = this.scripts[fileName];
          if (script.changes)
            return script.changes().length;
          return 0;
        },
        getScriptIsOpen: (fileName: string) => {
          return true;
        },
        getScriptByteOrderMark: (fileName: string) => TypeScript.ByteOrderMark.None,
        getScriptSnapshot: (fileName: string) => {
          var script = this.scripts[fileName];
          var snapshot = <TypeScriptDocumentSnapshot>script._cachedSnapshot;

          // checking if snapshot is out of date
          if (!snapshot || (script.changes && snapshot.version < script.changes().length)) {
            script._cachedSnapshot =
            snapshot = new TypeScriptDocumentSnapshot(script);
          }

          return snapshot;
        },
        getDiagnosticsObject: () => {
          return { log: (text: string) => this._log(text) };
        },
        getLocalizedDiagnosticMessages: () => null,
        information: () => {
          this._logLevel = 'information';
          return this.logLevels.information;
        },
        debug: () => {
          this._logLevel = 'debug';
          return this.logLevels.debug;
        },
        warning: () => {
          this._logLevel = 'warning';
          return this.logLevels.warning;
        },
        error: () => {
          this._logLevel = 'error';
          return this.logLevels.error;
        },
        fatal: () => {
          this._logLevel = 'fatal';
          return this.logLevels.fatal;
        },
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
          if (slashPos === path.length - 1)
            slashPos = path.lastIndexOf('/', path.length - 2);
          if (slashPos > 0)
            return path.slice(0, slashPos);
          else
            return '/';
        }
      }
    }

    private _log(text) {
      if (this.logLevels[this._logLevel]) {
        console.log(this._logLevel, text);
        if (this.log) {
          var msg = {
            logLevel: this._logLevel,
            text: text
          };
          this.log.push(msg);
        }
      }
    }
  }

  export module TypeScriptService {

    /**
     * Shape of an object that must represent a file for TypeScript service.
     */
    export interface Script {

      /**
       * Whole text of the file as a single string.
       */
      text(): string;

      /**
       * History of changes to the file, in a form of objects expected by TypeScript
       * (basically, offset, old length, new length).
       */
      changes(): TypeScript.TextChangeRange[];

      /**
       * Used internally, don't ever change.
       */
      _cachedSnapshot: TypeScript.IScriptSnapshot;
    }
  }

  class TypeScriptDocumentSnapshot implements TypeScript.IScriptSnapshot {
    version = 0;
    private _text: string = null;

    constructor(public scriptData: TypeScriptService.Script) {
      if (this.scriptData.changes)
        this.version = this.scriptData.changes().length;
    }

    getText(start: number, end: number): string {
      var text = this._getText();
      var result = text.slice(start, end);
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

      // TODO: check that we are not called for changes on old snapshots

      var chunk = this.scriptData.changes().slice(scriptVersion);

      var result = TypeScript.TextChangeRange.collapseChangesAcrossMultipleVersions(chunk);
      return result;
    }

    private _getText() {
      if (!this._text)
        this._text = this.scriptData.text ? this.scriptData.text() : <string><any>this.scriptData;
      return this._text;
    }
  }
}