module noapi {

  export class HostedProcess {

    process: Process;
    mainModule: Module;
    global: Global;
    coreModules: { fs: FS; path: Path; os: OS; events: any; http: any; child_process: any; };

    exitCode: number = null;
    finished = false;

  	cwd: string;
    argv: string[] = [];
    env: any = {};
    console: any = {};

    private _context: isolation.Context;
    private _waitFor = 0;
  	private _fs_onfilesChanged: (files: string[]) => void;

  	private _moduleCache: { [path: string]: any; } = {};

    constructor(
      private _scriptPath: string,
      private _drive: persistence.Drive,
      window: Window) {

      this.global = <any>{};

      this.coreModules = {
        fs: <FS>null,
        os: <OS>null,
        path: <Path>null,
        events: null,
        http: null,
        child_process: null
      };

      this.argv = ['/node', this._scriptPath];

      this.cwd = dirname(this._scriptPath);

      this.global.process = this.process = createProcess(this.coreModules, this);
      this.global.module = this.mainModule = createModule({}, 'repl' /*id*/, null /*filename*/, null /*parent*/, require);

      var noapicontext = this;

      function require(moduleName: string) {
        return noapicontext.requireModule(moduleName, dirname(noapicontext._scriptPath), null);
      }

      this.global.require = <any>(moduleName => require(moduleName));
      this.global.require.resolve = id => this.resolve(id, this.cwd);
      this.global.require.main = this.mainModule;
      this.global.__filename = this._scriptPath;
      this.global.__dirname = dirname(this._scriptPath);
      this.global.console = this.console;

      var fsTuple = createFS(this._drive, this.coreModules);
      this._fs_onfilesChanged = fsTuple.filesChanged;
      this.coreModules.fs = fsTuple.fs;
      this.coreModules.os = createOS(this.global);
      this.coreModules.path = createPath(this.process);
      this.coreModules.http = createHTTP();
      this.coreModules.events = createEvents();
      this.coreModules.child_process = createChildProcess(this._drive, window);

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

  	private _tryResolveModuleFromDir(resolveDir: string) {
      var packageFile = this.coreModules.path.join(resolveDir, 'package.json');
      if (this.coreModules.fs.existsSync(packageFile) && this.coreModules.fs.statSync(packageFile).isFile()) {
        var packageJson = this.coreModules.fs.readFileSync(packageFile)+'';
        try {
          var packageObj = JSON.parse(packageJson);
          var mainFile = this.coreModules.path.resolve(resolveDir, packageObj.main);
          if (this.coreModules.fs.existsSync(mainFile) && this.coreModules.fs.statSync(mainFile).isFile()) return mainFile;
          else return null;
        }
        catch (packageJsonError) { }
      }

      var indexFile = this.coreModules.path.join(resolveDir, 'index.js');
      if (this.coreModules.fs.existsSync(indexFile) && this.coreModules.fs.statSync(indexFile).isFile()) return indexFile;
      else return null;
    }

    resolve(id: string, modulePath: string) {
      var tryPath = id.charAt(0)==='/' ? this.coreModules.path.resolve(id) : this.coreModules.path.resolve(modulePath, id);

      if (id.charAt(0) === '/' || id.charAt(0) === '.') {
        if (!this.coreModules.fs.existsSync(tryPath)) return null;
        else if (this.coreModules.fs.statSync(tryPath).isFile()) return tryPath;
        else return this._tryResolveModuleFromDir(tryPath);
      }
      else {
        var firstSlash = id.indexOf('/', 1); // definitely not pick on leading character

        var moduleDir = firstSlash>=0 ? id.slice(0, firstSlash) : id;
        var moduleFileExact = firstSlash>=0 ? id.slice(firstSlash+1) : null;

        tryPath = this.coreModules.path.resolve(modulePath);

        while (true) {
          var resolveDir = this.coreModules.path.join(tryPath, 'node_modules', moduleDir);

          if (this.coreModules.fs.existsSync(resolveDir)) {
            if (moduleFileExact) {
              var resolvedFile = this.coreModules.path.join(resolveDir, moduleFileExact);
              if (this.coreModules.fs.existsSync(resolvedFile) && this.coreModules.fs.statSync(resolvedFile).isFile())
                return resolvedFile;
            }
            else {
              var resolved = this._tryResolveModuleFromDir(resolveDir);
              if (resolved) return resolved;
            }
          }

          if (!tryPath || tryPath === '/') break;
          var newTryPath = this.coreModules.path.dirname(tryPath);
          if (newTryPath===tryPath || !newTryPath) break;
          tryPath = newTryPath;
        }
      }
    }

    requireModule(moduleName: string, parentModulePath: string, parentModule: Module) {

      if (this.coreModules.hasOwnProperty(moduleName))
        return this.coreModules[moduleName];

      var resolvedPath = this.resolve(moduleName, parentModulePath);
      if (resolvedPath) {

        var existingLoaded = this._moduleCache[resolvedPath];
        if (resolvedPath in this._moduleCache) return existingLoaded;

        existingLoaded = {};
        this._moduleCache[resolvedPath] = existingLoaded;

        var content = this.coreModules.fs.readFileSync(resolvedPath);

        if (content) {

          var moduleDir = dirname(resolvedPath);
          var loadedModule = createModule(
            existingLoaded,
            moduleName,
            resolvedPath,
            parentModule,
            moduleName => this.requireModule(moduleName, moduleDir, loadedModule));

          var moduleScope = (() => {

            var ModuleContext = () => { };
            ModuleContext.prototype = this.global;

            var moduleScope = new ModuleContext();

            moduleScope.global = moduleScope;
            moduleScope.require = function(moduleName) { return loadedModule.require(moduleName); };
            moduleScope.require.resolve = id => this.resolve(id, moduleDir);
            moduleScope.require.main = this.mainModule;
            moduleScope.exports = loadedModule.exports;

            moduleScope.global.__filename = resolvedPath;
            moduleScope.global.__dirname = dirname(resolvedPath);
            if (this.console) {
              this.global.console = this.console;
              moduleScope.console = this.console;
            }

            moduleScope.module = loadedModule;

            return moduleScope;
          })();

          var contentScript = String(content);
          if (contentScript.charAt(0)==='#') {
            var posLineEnd = contentScript.indexOf('\n');
            if (posLineEnd>0) {
              var firstLine = contentScript.slice(0,posLineEnd);
              if (firstLine.length>2)
                firstLine = '//'+firstLine.slice(0, firstLine.length-2);
              contentScript = firstLine+contentScript.slice(posLineEnd);
            }
          }

          this._context.runWrapped(contentScript, resolvedPath, moduleScope);

          if (loadedModule.exports!==existingLoaded && loadedModule.exports) {
            for (var k in loadedModule.exports) if (typeof loadedModule.exports.hasOwnProperty==='function' && loadedModule.exports.hasOwnProperty(k)) {
              existingLoaded[k] = loadedModule.exports[k];
            }
          }

        	this._moduleCache[resolvedPath] = loadedModule.exports;
          return loadedModule.exports;
        }
      }

      throw new Error('Cannot find module \''+moduleName+'\'');
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