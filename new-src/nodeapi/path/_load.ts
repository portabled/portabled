var _nopath_module_: nopath;

function nopath_load() {

  if (!_nopath_module_)
    _nopath_module_ = <nopath>{
      normalize: nopath_normalize,
      join: nopath_join,
      resolve: nopath_resolve,
      isAbsolute: nopath_isAbsolute,
      dirname: nopath_dirname,
      basename: nopath_basename,
      extname: nopath_extname,
      sep: '/',
      delimiter: '/'
    };

  return _nopath_module_;
}