module noapi {

  export function createModule(
    id: string,
    filename: string,
    parent: any,
    requireForModule: (moduleName: string) => any): Module {

    var module: Module = {
      exports: {},
      id,
      filename,
      loaded: false,
      parent,
      children: [],
      require
    };

    return module;

    var _moduleCache: any;
    var _resolveCache: any;

    function require(moduleName: string): any {
      var key = '*' + moduleName;
      if (_moduleCache && key in _moduleCache)
        return _moduleCache[key];

      var mod = requireForModule(moduleName);
      (_moduleCache || (_moduleCache = {}))[key] = mod;
      return mod;
    }

  }

}