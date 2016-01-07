module noapi {

  export function apply_(
    global: any,
    drive: persistence.Drive,
    options?: {
      argv?: string[];
      cwd?: string;
      env?: any;
      //onchanges?: (changedFiles: string[]) => void;
    }) {

    var apiGlobal = {
      process: <Process>null,
      module: <Module>null
    };

    if (!options) options = {};

    var cleanOptions = {
      argv: options.argv || ['/node'],
      cwd: options.cwd || '/',
      env: options.env || {}
    };

    var coreModules = {
      fs: <FS>null,
      os: <OS>null,
      path: <Path>null
    };

    apiGlobal.process = createProcess(coreModules, cleanOptions);
    apiGlobal.module = createModule('repl' /*id*/, null /*filename*/, null /*parent*/, module_require);

    var fsTuple = createFS(drive, coreModules);
    coreModules.fs = fsTuple.fs;
    coreModules.os = createOS(apiGlobal);
    coreModules.path = createPath(apiGlobal.process);

    global.process = apiGlobal.process;
    global.module = apiGlobal.module;
    global.require = global_require;

    function global_require(moduleName: string) {
      return module_require(moduleName);
    }

    function module_require(moduleName: string): any {
      if (coreModules.hasOwnProperty(moduleName)) return coreModules[moduleName];

      throw new Error('Cannot find module \'' + moduleName + '\'');
    }
  }

  export function nextTick(callback: Function): void {

    function fire() {
      if (fired) return;
      fired = true;
      callback();
    }

    var fired = false;
    setTimeout(fire, 0);
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(fire);
    }
    else if (typeof msRequestAnimationFrame !== 'undefined') {
      msRequestAnimationFrame(fire);
    }

  }

  export function wrapAsync(fn: Function): () => void {
    return function() {
      var args = [];
      for (var i = 0; i < arguments.length - 1; i++) {
        args.push(arguments[i]);
      }
      var callback = arguments[arguments.length - 1];

      nextTick(function() {
        try {
          var result = fn.apply(null, args);
        }
        catch (error) {
          callback(error);
        }
        callback(null, result);
      });
    }
  }

  export function wrapAsyncNoError(fn: Function): () => void {
    return function() {
      var args = [];
      for (var i = 0; i < arguments.length - 1; i++) {
        args.push(arguments[i]);
      }
      var callback = arguments[arguments.length - 1];

      nextTick(function() {
        try {
          var result = fn.apply(null, args);
        }
        catch (error) {
          callback(error);
        }
        callback(result);
      });
    }
  }

}