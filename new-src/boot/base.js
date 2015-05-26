function getText(obj) {

  if (typeof obj === 'function') {
    var result = /\/\*(\*(?!\/)|[^*])*\*\//m.exec(obj+'')[0];
    if (result) result = result.slice(2, result.length-2);
    return result;
  }
  else if (/^SCRIPT$/i.test(obj.tagName)) {
    if ('text' in obj)
      return obj.text;
    else
      return obj.innerHTML;
  }
  else if (/^STYLE$/i.test(obj.tagName)) {
    if ('text' in obj)
      return obj.text;
    else if (obj.styleSheet)
      return obj.styleSheet.cssText;
    else
      return obj.innerHTML;
  }
  else if ('textContent' in obj) {
    return obj.textContent;
  }
  else if (/^INPUT$/i.test(obj.tagName)) {
    return obj.value;
  }
  else {
    var result = obj.innerText;
    if (result) {
      // IE fixes
      result = result.replace(/\<BR\s*\>/g, '\n').replace(/\r\n/g, '\n');
    }
    return result || '';
  }
}

function setText(obj, text) {

  if (/^SCRIPT$/i.test(obj.tagName)) {
    if ('text' in obj)
      obj.text = text;
    else
      obj.innerHTML = text;
  }
  else if (/^STYLE$/i.test(obj.tagName)) {
    if ('text' in obj) {
      obj.text = text;
    }
    else if ('styleSheet' in obj) {
      if (!obj.styleSheet && !obj.type) obj.type = 'text/css';
      obj.styleSheet.cssText = text;
    }
    else if ('textContent' in obj) {
      obj.textContent = text;
    }
    else {
      obj.innerHTML = text;
    }
  }
  else if ('textContent' in obj) {
    if ('type' in obj && !obj.type) obj.type = 'text/css';
    obj.textContent = text;
  }
  else if (/^INPUT$/i.test(obj.tagName)) {
    obj.value = text;
  }
  else {
    obj.innerText = text;
  }
}

elem.on = function (obj, eventName, handler) {
  if (obj.addEventListener) {
    obj.addEventListener(eventName, handler, false);
  }
  else if (obj.attachEvent) {
    obj.attachEvent('on'+eventName, handler);
  }
  else {
    obj['on'+eventName] = function (e) { return handler(e || this.event); };
  }
};

elem.off = function (obj, eventName, handler) {
  if (obj.removeEventListener) {
    obj.removeEventListener(eventName, handler, false);
  }
  else if (obj.detachEvent) {
    obj.detachEvent('on'+eventName, handler);
  }
  else {
    if (obj['on'+eventName])
      obj['on' + eventName] = null;
  }
};

function elem(tag, style, parent) {
  var e = tag.tagName ? tag : this.document.createElement(tag);

  if (!parent && style && style.tagName) {
    parent = style;
    style = null;
  }

  if (style) {
    if (typeof style === 'string') {
      setText(e, style);
    }
    else {
      for (var k in style) if (style.hasOwnProperty(k)) {
        if (k === 'text') {
          setText(e, style[k]);
        }
        else if (k === 'className') {
          e.className = style[k];
        }
        else if (!(e.style && k in e.style) && k in e) {
          e[k] = style[k];
        }
        else {

          if (style[k] && typeof style[k] === 'object' && typeof style[k].length === 'number') {
            // array: iterate and apply values
            var applyValues = style[k];
						for (var i = 0; i < applyValues.length; i++) {
              try { e.style[k] = applyValues[i]; }
              catch (errApplyValues) { }
            }
          }
          else {
            // not array
            try {
              e.style[k] = style[k];
            }
            catch (err) {
              try {
                if (typeof console !== 'undefined' && typeof console.error === 'function')
                  console.error(e.tagName+'.style.'+k+'='+style[k]+': '+err.message);
              }
              catch (whatevs) {
                alert(e.tagName+'.style.'+k+'='+style[k]+': '+err.message);
              }
            }
          }
        }
      }
    }
  }

  if (parent) {
    try {
      parent.appendChild(e);
    }
    catch (error) {
      throw new Error(error.message+' adding '+e.tagName+' to '+parent.tagName);
    }
  }

  return e;
}

function createFrame(style) {

  if (!style)
    style = {
      position: 'absolute',
      left: 0, top: 0,
      width: '100%', height: '100%',
      border: 'none',
      src: 'about:blank'
    };

  var ifr = this.elem('iframe', style, this.document.body);

  var ifrwin = ifr.contentWindow || ifr.window;
  var ifrdoc = ifrwin.document;

  if (ifrdoc.open) ifrdoc.open();
  ifrdoc.write(
    '<!'+'doctype html'+'>'+
    '<'+'html'+'>'+
    '<'+'head'+'><'+'style'+'>'+
    'body,html{margin:0;padding:0;border:none;height:100%;border:none;}'+
    '*,*:before,*:after{box-sizing:inherit;}'+
    'html{box-sizing:border-box;}'+
    '</'+'style'+'>\n'+

    // IE6/7/8 bug: global scope and window are not identical
    (ifrwin.Function?'':'<'+'script'+'>window.Function=Function</'+'script'+'>')+

    // it's important to have body before any long scripts (especialy external),
    // so IFRAME is immediately ready
    '<'+'body'+'><'+'body'+'>'+

  	'</'+'html'+'>');
  if (ifrdoc.close) ifrdoc.close();

  ifrwin.elem = elem;

  if (window.onerror) {
    ifrwin.onerror = delegate_onerror;
  }

  return {
    document: ifrdoc,
    global: ifrwin,
    iframe: ifr
  };

  function delegate_onerror() {
    window.onerror.apply(window, arguments);
  }

}

function loadMod(options) {

  var style = options.style;
  if (!options.ui) {
    style = { display: 'none' };
  }
  else if (typeof style === 'string') {
    style = { className: style, display: 'none' };
  }

  var frame = this.createFrame(style);
  var frameFunction = frame.global.Function;

  if (options.scope) {
    var scope = typeof options.scope === 'function' ? (options.scope)(frame.global) : options.scope;
    for (var k in scope) if (scope.hasOwnProperty(k)) {
      try { frame.global[k] = scope[k]; } catch (err) { }
    }
  }

  if (options.eval) {

    var exportsInScope = scope && 'exports' in scope;
    var evalArgNames = exportsInScope ? [] : ['exports'];
    var evalArgs = exportsInScope ? [] : [{}];
    if (scope) {
      for (var k in scope) if (scope.hasOwnProperty(k)) {
        evalArgNames.push(k);
        evalArgs.push(scope[k]);
      }
    }

    if (!options.ui) {
      var allowedGlobals = {
        setTimeout: 1, setInterval: 1, clearTimeout: 1, clearInterval: 1,
        eval: 1,
        console: 1,
        undefined: 1,
        Array: 1, Date: 1, Function: 1, String: 1, Boolean: 1, Number: 1,
        Infinity: 1, NaN: 1, isNaN: 1, isFinite: 1, parseInt: 1, parseFloat: 1,
        escape: 1, unescape: 1,

        Int32Array: 1, Int8Array: 1, Int16Array: 1,
        UInt32Array: 1, UInt8Array: 1, UInt8ClampedArray: 1, UInt16Array: 1,
        Float32Array: 1, Float64Array: 1, ArrayBuffer: 1,

        Math: 1, JSON: 1, RegExp: 1,
        Error: 1, SyntaxError: 1, EvalError: 1, RangeError: 1, ReferenceError: 1,

        toString: 1, toJSON: 1, toValue: 1,

        Map: 1
      };

      var hiddenKeys = {};

      // normal properties
      for (var k in frame.global) {
        if (scope && scope.hasOwnProperty(k)) continue;
        if (allowedGlobals.hasOwnProperty(k)) continue;
        evalArgNames.push(k);
        hiddenKeys[k] = 1;
      }

      // non-enumerable properties directly on global
      if (Object.getOwnPropertyNames) {
        var props = Object.getOwnPropertyNames(frame.global);
        for (var i = 0; i < props.length; i++) {
          if (scope && scope.hasOwnProperty(props[i])) continue;
          if (allowedGlobals.hasOwnProperty(props[i])) continue;
          if (hiddenKeys.hasOwnProperty(props[i])) continue;
          evalArgNames.push(props[i]);
        }

        // non-enumerable properties on global's prototype
        if (frame.global.constructor
          && frame.global.constructor.prototype
          && frame.global.constructor.prototype != Object
          && frame.global.constructor.prototype != Object.prototype) {
          props = Object.getOwnPropertyNames(frame.global.constructor.prototype);
          for (var i = 0; i < props.length; i++) {
            if (scope && scope.hasOwnProperty(props[i])) continue;
            if (allowedGlobals.hasOwnProperty(props[i])) continue;
            if (hiddenKeys.hasOwnProperty(props[i])) continue;
            evalArgNames.push(props[i]);
          }
        }
      }
    }

    var innerEval = frameFunction.apply(frame.global, ['return function(txt) { return eval(txt); }'])();

    var wrappedText = '(function() { return function('+evalArgNames.join(',')+'){'+
      options.eval + '\nreturn exports; }; })()'+
      (options.path ? ' //# sourceURL=' + options.path : '');

    //evalArgNames.push(
    //  options.path ? options.eval + '\nreturn exports; //# sourceURL=' + options.path : options.eval + '\nreturn exports;');

    var evalFn = innerEval(wrappedText);
    //var evalFn = frameFunction.apply(frame.global, evalArgNames);

    var modExports = evalFn.apply(frame.global, evalArgs);

    return {
      document: frame.document,
      global: frame.global,
      iframe: frame.iframe,
      exports: modExports
    };
  }

  return frame;

}