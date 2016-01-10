module isolation {

  export class Context {

    private _frame;
    private _obscureScope: any = {};
  	private _natives = null;
    private _disposed = false;

    constructor(private _window: Window) {
      this._frame = createFrame(this._window);
      defineObscureScope(this._obscureScope, this._frame.global);
      defineObscureScope(this._obscureScope, this._frame.window);
      this._obscureScope.global = void 0;
      this._frame.global = this._obscureScope;
    }

    runWrapped(code: string, path: string, scope: any) {
      path = path || typeof path === 'string' ? path : createTimebasedPath();
      var argNames: string[] = [];
      var args = [];
      var emptyDefault = {};
      if (scope) {
        for (var k in scope) {
          if (k in emptyDefault) continue;
          argNames.push(k);
          args.push(scope[k]);
        }
      }

    	var natives = this._natives ? this._natives : (this._natives = defineAllowedNatives());
      for (var k in this._obscureScope) {
        if (k in scope || k in emptyDefault || k in natives) continue;
        argNames.push(k);
      }

      var fnText: string[] = ['(function() { return function('];
      fnText.push(argNames.join(','));
      fnText.push(') {    ');
      fnText.push(code);
      fnText.push('\n } })() //# '+'sourceURL=');
      fnText.push(path);
      var fnTextStr = fnText.join('');
      var fn = this._frame.evalFN(fnTextStr);
      //this._frame.window.global = null;
      var result = fn.apply(this._frame.global, args);
      return result;
    }

    runWith(code: string, path: string, scope: any) {
      path = path || typeof path === 'string' ? path : createTimebasedPath();
      this._obscureScope.global = scope || {};
      var decoratedCode =
        'with(window.global){with(global){   ' + code +
        '\n }}  //# sourceURL=' + path;
      this._frame.window.global = this._obscureScope;
      var result = this._frame.evalFN(decoratedCode);
      //this._obscureScope.global = null;
      return result;
    }

    dispose() {
      if (!this._disposed) {

        var parent = this._frame.iframe.parentElement || this._frame.iframe.parentNode;
        if (parent)
        	parent.removeChild(this._frame.iframe);

        this._disposed = true;
      }
    }

  }

  function createTimebasedPath() {
    var now = new Date();
    var path = now.getFullYear() +
      (now.getMonth() + 1 > 9 ? '' : '0') + now.getMonth() +
      (now.getDate() > 9 ? '' : '0') + now.getDate() + '-' +
      (now.getHours() > 9 ? '' : '0') + now.getHours() +
      (now.getMinutes() > 9 ? '' : '0') + now.getMinutes() + '-' +
      (now.getSeconds() > 9 ? '' : '0') + now.getSeconds() +
      '.' + ((now.getMilliseconds() | 0) + 1000).toString().slice(1) +
      '.js';
    return path;
  }

  function createFrame(window: Window) {
    var ifr = window.document.createElement('iframe');
    ifr.src = 'about:blank';
    ifr.style.display = 'none';
    ifr.style.width = ifr.style.height = <any>0;
    window.document.body.appendChild(ifr);

    var ifrwin: Window = ifr.contentWindow || (<any>ifr).window;
    var ifrdoc = ifrwin.document;

    var ifrwin_eval: typeof eval = (<any>ifrwin).eval;

    ifrdoc.body.innerHTML = '';

    return {
      document: ifrdoc,
      window: ifrwin,
      global: ifrwin_eval('this'),
      iframe: ifr,
      evalFN: ifrwin_eval
    };
  }

  function defineObscureScope(scope: any, pollutedGlobal: any) {
    var validIdentifier = /^[_$a-zA-Z][_$0-9a-zA-Z]*$/;

    var natives = this._natives ? this._natives : (this._natives = defineAllowedNatives());

    var dummy;

    // normal properties
    for (var k in pollutedGlobal) {
      if (scope[k] || natives[k] || !validIdentifier.test(k)) continue;
      scope[k] = dummy;
    }

    // non-enumerable properties directly on global
    if (Object.getOwnPropertyNames) {
      var props = Object.getOwnPropertyNames(pollutedGlobal);
      for (var i = 0; i < props.length; i++) {
        if (scope[props[i]] || natives[props[i]] || !validIdentifier.test(props[i])) continue;
        scope[props[i]] = dummy;
      }

      // non-enumerable properties on global's prototype
      if (pollutedGlobal.constructor
        && pollutedGlobal.constructor.prototype
        && pollutedGlobal.constructor.prototype !== Object.prototype) {
        props = Object.getOwnPropertyNames(pollutedGlobal.constructor.prototype);
        for (var i = 0; i < props.length; i++) {
          if (scope[props[i]] || natives[props[i]] || !validIdentifier.test(props[i])) continue;
          scope[props[i]] = dummy;
        }
      }
    }
  }

  function defineAllowedNatives() {
    return {
      setTimeout: 1, setInterval: 1, clearTimeout: 1, clearInterval: 1,
      eval: 1,
      console: 1,
      undefined: 1,
      Object: 1, Array: 1, Date: 1, Function: 1, String: 1, Boolean: 1, Number: 1,
      Infinity: 1, NaN: 1, isNaN: 1, isFinite: 1, parseInt: 1, parseFloat: 1,
      escape: 1, unescape: 1,

      Int32Array: 1, Int8Array: 1, Int16Array: 1,
      Uint32Array: 1, Uint8Array: 1, Uint8ClampedArray: 1, Uint16Array: 1,
      Float32Array: 1, Float64Array: 1, ArrayBuffer: 1, DataView: 1,

      Math: 1, JSON: 1, RegExp: 1,
      Error: 1, SyntaxError: 1, EvalError: 1, RangeError: 1, ReferenceError: 1,

      toString: 1, toJSON: 1, toValue: 1,

      Map: 1, Promise: 1
    };
  }
}