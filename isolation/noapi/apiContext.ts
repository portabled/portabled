declare var global;

namespace initApiContext {

  export interface Options {

    drive: persistence.Drive;
  	scriptPath?: string;
    argv?: string[];
  	cwd: string;

    dispose?();
    keepAlive?(): () => void;
    resolve(id: string, modulePath: string): any;
    requireModule?(moduleName: string, parentModulePath: string, parentModule: Module): any;

    finished?: boolean;
    exitCode?: number;

    global?: Global;
    coreModules?: any | { fs: FS; os: OS; path: Path; events: any; http: any; child_process: any; };
  	process?: any;
    mainModule;

  	enhanceChildProcess?(proc: any);
    ondispose?: () => void;
    console?: any;

    runGlobal?(script: string, path?: string);
  }

	export type Global = any | {
    process;
    module;

    require;
    // require.resolve;
    // require.main;
    __filename: string;
    __dirname: string;
  };

}



declare var connection_to_parent: ConnectionToParent;

function initApiContext(options: initApiContext.Options) {

  var _connection_to_parent = connection_to_parent;
  var _setTimeout = setTimeout;
  var _setInterval = setInterval;
  var _clearTimeout = clearTimeout;
  var _clearInterval = clearInterval;
  var _eval = eval;
  var _self = typeof self !== 'undefined' ? self : typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : (function(){return this})();
  var _nativeObjects = getNativeObjects();


  var _waitFor = 0;
  var _fs_onfilesChanged: (files: string[]) => void;
  var _moduleCache: { [path: string]: any; } = {};



  options.dispose = dispose;
  options.keepAlive = keepAlive;
  options.runGlobal = runGlobal;

  if (!options.global)
  	options.global = <any>{global: _self};

  if (!options.coreModules) options.coreModules = {
    fs: <FS>null,
    os: <OS>null,
    path: <Path>null,
    events: null,
    http: null,
    child_process: null
  };

  if (!options.scriptPath)
    options.scriptPath = '/repl.js';

  if (!options.argv)
    options.argv = ['/node', options.scriptPath];

  if (!options.cwd)
  	options.cwd = dirname(options.scriptPath);

  var processExtra = {
    exitCode: null,
    shutdown: process_shutdown
  };

  options.global.process = options.process = createProcess(options.coreModules, <any>options, processExtra);
  options.global.module = options.mainModule = createModule({}, 'repl' /*id*/, null /*filename*/, null /*parent*/, require);

  options.requireModule = requireModule;
  function require(moduleName: string) {
    if (options.finished) throw new Error('Process is terminated'); // TODO: check if this is intended behaviour

    return options.requireModule(moduleName, dirname(options.scriptPath), null);
  }

  options.global.require = <any>(moduleName => require(moduleName));
  options.global.require.resolve = id => options.resolve(id, options.cwd);
  options.global.require.main = options.mainModule;
  options.global.__filename = options.scriptPath;
  options.global.__dirname = dirname(options.scriptPath);
  //options.global.console = this.console;

  var fsTuple = createFS(options.drive, options.coreModules);
  var _fs_onfilesChanged = fsTuple.filesChanged;
  options.coreModules.fs = fsTuple.fs;
  options.coreModules.os = createOS(options.global);
  options.coreModules.path = createPath(options.process);
  options.coreModules.http = createHTTP();
  options.coreModules.events = createEvents();

  var enhChild = (proc) => {
    if (options.enhanceChildProcess)
      options.enhanceChildProcess(proc);
    proc.enhanceChildProcess = enhChild;
  };

  options.coreModules.child_process = createChildProcess(
    _connection_to_parent,
    {
      fs: options.coreModules.fs,
      path: options.coreModules.path,
      process: options.global.process,
      enhanceProcess: enhChild
    });


  options.process.exit = code => {
    options.exitCode = code || 0;
    dispose();
  };

  options.process.abort = () => {
    dispose();
  };

  var timeouts: Function[] = [];
  (<any>options.global).setTimeout = (fun: Function, time: number, ...args: any[]) => {
    if (options.finished) return 0;
    var wait = keepAlive();
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
    var result = _setTimeout.apply(_self, passArgs);

    timeouts[result] = wait;
    return result;
  };

  (<any>options.global).clearTimeout = (tout: number) => {
    var wait = timeouts[tout];
    if (wait) wait();
    delete timeouts[tout];
    _clearTimeout(tout);
  };

  var intervals: Function[] = [];
  (<any>options.global).setInterval = (fun: Function, time: number, ...args: any[]) => {
    if (options.finished) return 0;
    var wait = keepAlive();

    var passArgs = [];
    passArgs.push(fun);
    passArgs.push(time);
    for (var i = 0; i < args.length; i++) {
      passArgs.push(args[i]);
    }
    var result = _setInterval.apply(_self, passArgs);

    intervals[result] = wait;
    return result;
  };

  (<any>options.global).clearInterval = (intv: number) => {
    var wait = intervals[intv];
    if (wait) wait();
    delete intervals[intv];
    _clearInterval(intv);
  };

  options.process.nextTick = fun => {
    if (options.finished) return;
    var wait = this.keepAlive();
    _setTimeout(() => {
      wait();
      fun();
    }, 1);
  };

  var _keepAlive_releases: any[] = [];

  _connection_to_parent.onPushMessage(noapi_context_onPushMessage);

  function process_shutdown() {
    dispose();
  }

  function dispose() {
    if (options.finished) return;
    options.finished = true;

    if (typeof options.ondispose === 'function')
      options.ondispose();

    _connection_to_parent.invokeAsync({ noapi_ondispose: {exitCode: options.exitCode} });
  }

  function keepAlive() {
    if (options.finished) return () => {};

    _waitFor++;
    return () => {
      _waitFor--;
      if (_waitFor <= 0) {
        _setTimeout(() => {
          if (_waitFor <= 0)
            dispose();
        }, 150);
      }
    };
  }

  function   resolve(id: string, modulePath: string) {
    var tryPath = id.charAt(0)==='/' ? options.coreModules.path.resolve(id) : options.coreModules.path.resolve(modulePath, id);

    if (id.charAt(0) === '/' || id.charAt(0) === '.') {
      if (!options.coreModules.fs.existsSync(tryPath)) return null;
      else if (options.coreModules.fs.statSync(tryPath).isFile()) return tryPath;
      else return _tryResolveModuleFromDir(tryPath);
    }
    else {
      var firstSlash = id.indexOf('/', 1); // definitely not pick on leading character

      var moduleDir = firstSlash>=0 ? id.slice(0, firstSlash) : id;
      var moduleFileExact = firstSlash>=0 ? id.slice(firstSlash+1) : null;

      tryPath = options.coreModules.path.resolve(modulePath);

      while (true) {
        var resolveDir = options.coreModules.path.join(tryPath, 'node_modules', moduleDir);

        if (options.coreModules.fs.existsSync(resolveDir)) {
          if (moduleFileExact) {
            var resolvedFile = options.coreModules.path.join(resolveDir, moduleFileExact);
            if (options.coreModules.fs.existsSync(resolvedFile) && options.coreModules.fs.statSync(resolvedFile).isFile())
              return resolvedFile;
          }
          else {
            var resolved = _tryResolveModuleFromDir(resolveDir);
            if (resolved) return resolved;
          }
        }

        if (!tryPath || tryPath === '/') break;
        var newTryPath = options.coreModules.path.dirname(tryPath);
        if (newTryPath===tryPath || !newTryPath) break;
        tryPath = newTryPath;
      }
    }
  }


  function requireModule(moduleName: string, parentModulePath: string, parentModule: Module) {

    if (options.coreModules.hasOwnProperty(moduleName))
      return options.coreModules[moduleName];

    var resolvedPath = resolve(moduleName, parentModulePath);
    if (resolvedPath) {

      var existingLoaded = _moduleCache[resolvedPath];
      if (resolvedPath in _moduleCache) return existingLoaded;

      existingLoaded = {};
      _moduleCache[resolvedPath] = existingLoaded;

      var content = options.coreModules.fs.readFileSync(resolvedPath);

      if (content) {

        var moduleDir = dirname(resolvedPath);
        var loadedModule = createModule(
          existingLoaded,
          moduleName,
          resolvedPath,
          parentModule,
          moduleName => requireModule(moduleName, moduleDir, loadedModule));

        var moduleScope = (() => {

          var ModuleContext = () => { };
          ModuleContext.prototype = options.global;

          var moduleScope = new ModuleContext();

          moduleScope.global = moduleScope;
          moduleScope.require = function(moduleName) { return loadedModule.require(moduleName); };
          moduleScope.require.resolve = id => resolve(id, moduleDir);
          moduleScope.require.main = options.mainModule;
          moduleScope.exports = loadedModule.exports;

          moduleScope.global.__filename = resolvedPath;
          moduleScope.global.__dirname = dirname(resolvedPath);
          if (options.console) {
            options.global.console = options.console;
            moduleScope.console = options.console;
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

        runScope(contentScript, resolvedPath, moduleScope, _self, _eval);

        if (loadedModule.exports!==existingLoaded && loadedModule.exports) {
          for (var k in loadedModule.exports) if (typeof loadedModule.exports.hasOwnProperty==='function' && loadedModule.exports.hasOwnProperty(k)) {
            existingLoaded[k] = loadedModule.exports[k];
          }
        }

        _moduleCache[resolvedPath] = loadedModule.exports;
        return loadedModule.exports;
      }
    }

    throw new Error('Cannot find module \''+moduleName+'\'');
  }

  function _tryResolveModuleFromDir(resolveDir: string) {
    var packageFile = options.coreModules.path.join(resolveDir, 'package.json');
    if (options.coreModules.fs.existsSync(packageFile) && options.coreModules.fs.statSync(packageFile).isFile()) {
      var packageJson = options.coreModules.fs.readFileSync(packageFile)+'';
      try {
        var packageObj = JSON.parse(packageJson);
        var mainFile = options.coreModules.path.resolve(resolveDir, packageObj.main);
        if (options.coreModules.fs.existsSync(mainFile) && options.coreModules.fs.statSync(mainFile).isFile()) return mainFile;
        else return null;
      }
      catch (packageJsonError) { }
    }

    var indexFile = options.coreModules.path.join(resolveDir, 'index.js');
    if (options.coreModules.fs.existsSync(indexFile) && options.coreModules.fs.statSync(indexFile).isFile()) return indexFile;
    else return null;
  }




  function getNativeObjects() {
    return {
      setTimeout: 1, setInterval: 1, clearTimeout: 1, clearInterval: 1,
      eval: 1,
      console: 1,
      undefined: 1,
      Object: 1, Array: 1, Date: 1, Function: 1, String: 1, Boolean: 1, Number: 1,
      Infinity: 1, NaN: 1, isNaN: 1, isFinite: 1, parseInt: 1, parseFloat: 1,
      escape: 1, unescape: 1,
      Int32Array: 1, Int8Array: 1, Int16Array: 1,
      Uint32Array: 1, Uint8Array: 1, Uint8ClampedArray: 1, Uint16Array: 1,
      Float32Array: 1, Float64Array: 1, ArrayBuffer: 1, DataView: 1,
      Math: 1, JSON: 1, RegExp: 1,
      Error: 1, SyntaxError: 1, EvalError: 1, RangeError: 1, ReferenceError: 1,
      toString: 1, toJSON: 1, toValue: 1,
      Map: 1, Promise: 1
    };
  }

  function runScope(code: string, path: string, scope: any, globalScope: any, eval: (code: string) => any){

    var argNames: string[] = [];
    var argValues = [];

    for (var k in scope) if (scope.hasOwnProperty(k)) {
      argNames.push(k);
      argValues.push(scope[k]);
    }

    var obscureNameCache = {};

    for (var k in globalScope){
      try {
        if (typeof globalScope[k]==='undefined') continue;
      }
      catch (error) {
        // for failures (probably security-related), obscure such global members
      }

      if (k in scope || _nativeObjects[k] || obscureNameCache[k]) continue;
      argNames.push(k);
      obscureNameCache[k] = true;
    }

    if (typeof Object.getOwnPropertyNames==='function') {
      var allProps = Object.getOwnPropertyNames(globalScope);
      for (var i = 0; i < allProps.length; i++) {
        var k = allProps[i];
        try {
          if (typeof globalScope[k]==='undefined') continue;
        }
        catch (error) {
          // for failures (probably security-related), obscure such global members
        }

        if (k in scope || _nativeObjects[k] || obscureNameCache[k]) continue;
        argNames.push(k);
        obscureNameCache[k] = true;
      }
    }

    var extendedCode = '(function('+argNames.join(',')+'){    '+code+'\n}) //# '+'sourceURL='+path;
    var fn = eval(extendedCode);
    return fn.apply(this, argValues);
  }

  var globalScopeSanitized;
  function runGlobal(script: string, path?: string) {

    if (!globalScopeSanitized){
      globalScopeSanitized = true;
    	sanitizeGlobalScope(_self);
    }


    if (path) {
      options.scriptPath = path;
      options.global.__filename = path;
      options.global.__dirname = dirname(path);
    }

    // impose global
    for (var k in options.global) if (options.global.hasOwnProperty(k)) {
      try {
        _self[k] = options.global[k];
      }
      catch (error) {
      }
    }

    var scriptWrapped = path ?
      script + '\n//# '+'sourceURL='+path :
    	script;

    return (0,_eval)(scriptWrapped);

  }

  function sanitizeGlobalScope(globalScope: any) {
    var obscureNames: string[] = [];
    var obscureNameCache = {};

    for (var k in globalScope){
      try {
        if (typeof globalScope[k]==='undefined') continue;
      }
      catch (error) {
        // for failures (probably security-related), obscure such global members
      }

      if (k in obscureNameCache || _nativeObjects[k]) continue;
      obscureNames.push(k);
      obscureNameCache[k] = true;
    }

    if (typeof Object.getOwnPropertyNames==='function') {
      var allProps = Object.getOwnPropertyNames(globalScope);
      for (var i = 0; i < allProps.length; i++) {
        var k = allProps[i];
        try {
          if (typeof globalScope[k]==='undefined') continue;
        }
        catch (error) {
          // for failures (probably security-related), obscure such global members
        }

        if (k in obscureNameCache || _nativeObjects[k]) continue;
        obscureNames.push(k);
        obscureNameCache[k] = true;
      }
    }

    for (var i = 0; i < obscureNames.length; i++) {
      var _undef;
      var k = obscureNames[i];
      try {
        globalScope[k] = _undef;
      }
      catch (error) {
      }

      try {
        delete globalScope[k];
      }
      catch (error) {
      }

    }
  }


  function noapi_context_onPushMessage(msg) {
    if (msg.noapi_runGlobal) {
      handleRunGlobal(msg.noapi_runGlobal);
    }
    else if (msg.noapi_keepAlive_addRef) {
      handleKeepAliveAddRef(msg.noapi_keepAlive_addRef);
    }
    else if (msg.noapi_keepAlive_release) {
      handleKeepAliveRelease(msg.noapi_keepAlive_release);
    }
  }

  function handleRunGlobal(noapi_runGlobal: any) {
    try {
      var keepa = keepAlive();
      var result = runGlobal(noapi_runGlobal.script, noapi_runGlobal.path);
    }
    catch (error) {
      _connection_to_parent.invokeAsync({noapi_runGlobal_error: { error: _connection_to_parent.serializeError(error), key: noapi_runGlobal.key }});
      keepa();
      return;
    }

    _connection_to_parent.invokeAsync({noapi_runGlobal_response: {response: _connection_to_parent.serialize(result), key: noapi_runGlobal.key} });
    keepa();
  }

  function handleKeepAliveAddRef(addRef) {
    var releaseCall = keepAlive();
    var token = _keepAlive_releases.length;
    _keepAlive_releases.push(releaseCall);
    _connection_to_parent.invokeAsync({keepAlive_addRef_response: { key: addRef.key, token: token }});
  }

  function handleKeepAliveRelease(release) {
    var releaseCall = _keepAlive_releases[release.token];
    if (releaseCall) {
      _keepAlive_releases[release.key] = null;
      releaseCall();
    }

    _connection_to_parent.invokeAsync({keepAlive_release_response: { key: release.key, token: release.token }});
  }
}