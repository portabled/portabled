window.__boot_times = window.__boot_times || {};
window.__boot_times.onerror_start = +new Date();

window.onerror = function onerror() {

  var msg = [];
  for (var i = 0; i < arguments.length; i++) {
    var a = arguments[i];
    if (a && (typeof a === 'object')) {

      if (a.stack) {
        msg.push(a.stack);
      }
      else {
        var msg1 = [];
        for (var k in a) {
          var r = a[k];
          if (typeof r === 'function' || (typeof r === 'object' && !r)) continue;
          msg1.push(k+':'+r);
        }
        msg.push(msg1.join(', '));
      }
    }
    else {
      msg.push(a===null ? 'null' : a);
    }

  }

  alert(msg.join('\n'));

}