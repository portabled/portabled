var _noprocess_umask_;

function noprocess_umask(mask?: number): number {
  if (typeof _noprocess_umask_ !== 'number') {
    _noprocess_umask_ = 2;
  }

  if (typeof mask === 'number') {
    var res = _noprocess_umask_;
    _noprocess_umask_ = mask;
    return res;
  }

  return _noprocess_umask_;
}