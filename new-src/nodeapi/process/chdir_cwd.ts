// TODO: pass it in?
var _noprocess_cwd_: string = '/';

function noprocess_chdir(directory: string) {
  var dirStat = nofs_statSync(directory);

  if (dirStat && dirStat.isDirectory()) {
    if (directory !== noprocess_cwd()) {
      var normDirectory = nopath_normalize(directory);
      if (noprocess_cwd() !== normDirectory) {
        _noprocess_cwd_ = normDirectory;
      }
    }
  }
  else {
    // TODO: throw a node-shaped error instead
    throw new Error('ENOENT, no such file or directory');
  }
}

function noprocess_cwd(): string {
  return _noprocess_cwd_;
}
