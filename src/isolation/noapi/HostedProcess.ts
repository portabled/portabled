module noapi {

  export class HostedProcess {

    process: Process;
    mainModule: Module;
    global: Global;
    coreModules: { fs: FS; path: Path, os: OS; };

    exitCode: number = null;
    finished = false;

  	cwd: string;
    argv: string[] = [];
    env: any = {};
    console: any = {};

    private _context: isolation.Context;
    private _waitFor = 0;
  	private _fs_onfilesChanged: (files: string[]) => void;

    constructor(
      private _scriptPath: string,
      private _drive: persistence.Drive,
      window: Window) {

      this.global = <any>{};

      this.coreModules = {
        fs: <FS>null,
        os: <OS>null,
        path: <Path>null
      };

      this.argv = ['/node', this._scriptPath];

      this.cwd = dirname(this._scriptPath);

      this.global.process = this.process = createProcess(this.coreModules, this);
      this.global.module = this.mainModule = createModule('repl' /*id*/, null /*filename*/, null /*parent*/, require);

      var noapicontext = this;

      function require(moduleName: string) {
        return noapicontext.requireModule(moduleName, dirname(noapicontext._scriptPath), null);
      }

      this.global.require = <any>(moduleName => require(moduleName));
      this.global.require.resolve = id => this.resolve(id, this.cwd);
      this.global.__filename = this._scriptPath;
      this.global.__dirname = dirname(this._scriptPath);
      this.global.console = this.console;

      var fsTuple = createFS(this._drive, this.coreModules);
      this._fs_onfilesChanged = fsTuple.filesChanged;
      this.coreModules.fs = fsTuple.fs;
      this.coreModules.os = createOS(this.global);
      this.coreModules.path = createPath(this.process);

      this._context = new isolation.Context(window);

      this.process.exit = code => {
        this.finished = true;
        this.exitCode = code || 0;
        this.dispose();
      };

      this.process.abort = () => {
        this.finished = true;
        this.dispose();
      };

      var timeouts: Function[] = [];
      (<any>this.global).setTimeout = (fun: Function, time: number, ...args: any[]) => {
        if (this.finished) return 0;
        var wait = this.keepAlive();
        var complete = () => {
          delete timeouts[result];
          wait();
          fun();
        };

        var passArgs = [];
        passArgs.push(complete);
        passArgs.push(time);
        for (var i = 0; i < args.length; i++) {
          passArgs.push(args[i]);
        }
        var result = window.setTimeout.apply(window, passArgs);

        timeouts[result] = wait;
        return result;
      };

      (<any>this.global).clearTimeout = (tout: number) => {
        var wait = timeouts[tout];
        if (wait) wait();
        delete timeouts[tout];
        window.clearTimeout(tout);
      };

      var intervals: Function[] = [];
      (<any>this.global).setInterval = (fun: Function, time: number, ...args: any[]) => {
        if (this.finished) return 0;
        var wait = this.keepAlive();

        var passArgs = [];
        passArgs.push(fun);
        passArgs.push(time);
        for (var i = 0; i < args.length; i++) {
          passArgs.push(args[i]);
        }
        var result = window.setInterval.apply(window, passArgs);

        intervals[result] = wait;
        return result;
      };

      (<any>this.global).clearInterval = (intv: number) => {
        var wait = intervals[intv];
        if (wait) wait();
        delete intervals[intv];
        window.clearTimeout(intv);
      };

      this.process.nextTick = fun => {
        var wait = this.keepAlive();
        window.setTimeout(() => {
          wait();
          fun();
        }, 1);
      };

    }

    eval(code: string, useWith?: boolean) {
      var wait = this.keepAlive();
      try {
        if (this.console)
          this.global.console = this.console;
        var result = useWith ?
            this._context.runWith(code, this._scriptPath, this.global) :
            this._context.runWrapped(code, this._scriptPath, this.global);
        return result;
      }
      finally {
        wait();
      }
    }

    resolve(id: string, modulePath: string) {
      if (id.charAt(0) === '.') {
        return this.coreModules.path.resolve(modulePath, id);
      }
      else if (id.charAt(0) === '/') {
        return id;
      }
      else {
        var tryPath = this.coreModules.path.normalize(modulePath);
        var probePatterns = [
          '../' + i, '../' + id + '.js', '../' + id + '/index.js',
          '../node_modules/' + id + '/index.js'];

        while (true) {
          tryPath = this.coreModules.path.basename(tryPath);
          if (!tryPath || tryPath === '/') return null;
          for (var i = 0; i < probePatterns.length; i++) {
            var p = this.coreModules.path.join(tryPath, probePatterns[i]);
            if (this._drive.read(p)) return p;
          }
        }
      }
    }

    requireModule(moduleName: string, parentModulePath: string, parentModule: Module) {

      if (this.coreModules.hasOwnProperty(moduleName))
        return this.coreModules[moduleName];

      var resolvedPath = this.resolve(moduleName, parentModulePath);
      if (resolvedPath) {
        var content = this._drive.read(resolvedPath);
        if (content) {

          var loadedModule = createModule(
            moduleName,
            resolvedPath,
            parentModule,
            moduleName => this.requireModule(moduleName, resolvedPath, loadedModule));

          var moduleScope = (() => {

            var ModuleContext = () => { };
            ModuleContext.prototype = this.global;

            var moduleScope = new ModuleContext();

            moduleScope.global = moduleScope;
            moduleScope.require = function(moduleName) { return loadedModule.require(moduleName); };
            moduleScope.exports = loadedModule.exports;

            moduleScope.global.__filename = resolvedPath;
            moduleScope.global.__dirname = dirname(resolvedPath);
            if (this.console)
              this.global.console = this.console;


            moduleScope.module = loadedModule;

            return moduleScope;
          })();

          this._context.runWrapped(content, resolvedPath, moduleScope);

          return loadedModule.exports;
        }
      }
    }

    filesChanged(files: string[]) {
      this._fs_onfilesChanged(files);
    }

    dispose() {
      this._context.dispose();
    }

    keepAlive() {
      this._waitFor++;
      return () => {
        this._waitFor--;
        if (this._waitFor <= 0) {
          setTimeout(() => {
            if (this._waitFor <= 0)
              this.dispose();
          }, 1000);
        }
      };
    }
  }
}