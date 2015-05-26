function no_wrapAsync(fn: Function): Function {
  return function() {
    var args = [];
    for (var i = 0; i < arguments.length-1; i++) {
      args.push(arguments[i]);
    }
    var callback = arguments[arguments.length - 1];

    noprocess_nextTick(function() {
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

function no_wrapAsyncNoError(fn: Function): Function {
  return function() {
    var args = [];
    for (var i = 0; i < arguments.length-1; i++) {
      args.push(arguments[i]);
    }
    var callback = arguments[arguments.length - 1];

    noprocess_nextTick(function() {
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