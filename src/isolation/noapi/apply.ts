namespace noapi {

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