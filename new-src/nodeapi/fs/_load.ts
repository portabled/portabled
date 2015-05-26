var _nofs_module_: nofs;

function nofs_load() {

  if (!_nofs_module_)
    _nofs_module_ = <nofs>{

      renameSync: nofs_renameSync,
      rename: no_wrapAsync(nofs_renameSync),

      readFileSync: nofs_readFileSync,
      readFile: no_wrapAsync(nofs_readFileSync),

      writeFileSync: nofs_writeFileSync,
      writeFile: no_wrapAsync(nofs_writeFileSync)
    };

  return _nofs_module_;
}