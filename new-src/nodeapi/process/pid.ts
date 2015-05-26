var _noprocess_pid_;

function noprocess_pid_load() {
  if (typeof _noprocess_pid_ === 'undefined') {
    _noprocess_pid_ = 32754 + ((Math.random() * 500) | 0);
  }
  return _noprocess_pid_;
}