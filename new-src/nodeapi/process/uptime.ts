var _noprocess_uptime_start_ = +(new Date());

function noprocess_uptime() {

  if (typeof _noprocess_uptime_start_ !== 'number') {
    _noprocess_uptime_start_ = +(new Date());
  }

  var now = typeof Date.now === 'function' ? Date.now() : +(new Date());

  return now - _noprocess_uptime_start_;
}