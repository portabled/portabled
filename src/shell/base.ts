function getText(obj: Element | Function): string {

  if (typeof obj === 'function') {
    var result = /\/\*(\*(?!\/)|[^*])*\*\//m.exec(obj + '')[0];
    if (result) result = result.slice(2, result.length - 2);
    return result;
  }
  else if (/^SCRIPT$/i.test((<any>obj).tagName)) {
    if ('text' in obj)
      return (<any>obj).text;
    else
      return (<any>obj).innerHTML;
  }
  else if (/^STYLE$/i.test((<any>obj).tagName)) {
    if ('text' in obj)
      return (<any>obj).text;
    else if ((<any>obj).styleSheet)
      return (<any>obj).styleSheet.cssText;
    else
      return (<any>obj).innerHTML;
  }
  else if ('textContent' in obj) {
    return (<any>obj).textContent;
  }
  else if (/^INPUT$/i.test((<any>obj).tagName)) {
    return (<any>obj).value;
  }
  else {
    var result: string = (<any>obj).innerText;
    if (result) {
      // IE fixes
      result = result.replace(/\<BR\s*\>/gi, '\n').replace(/\r\n/g, '\n');
    }
    return result || '';
  }
}

function setText(obj: Element, text: string): void {

  if (/^SCRIPT$/i.test((<any>obj).tagName)) {
    if ('text' in obj)
      (<any>obj).text = text;
    else
      (<any>obj).innerHTML = text;
  }
  else if (/^STYLE$/i.test((<any>obj).tagName)) {
    if ('text' in obj) {
      (<any>obj).text = text;
    }
    else if ('styleSheet' in obj) {
      if (!(<any>obj).styleSheet && !(<any>obj).type) (<any>obj).type = 'text/css';
      (<any>obj).styleSheet.cssText = text;
    }
    else if ('textContent' in (<any>obj)) {
      (<any>obj).textContent = text;
    }
    else {
      (<any>obj).innerHTML = text;
    }
  }
  else if ('textContent' in obj) {
    if ('type' in obj && !(<any>obj).type) (<any>obj).type = 'text/css';
    (<any>obj).textContent = text;
  }
  else if (/^INPUT$/i.test((<any>obj).tagName)) {
    (<any>obj).value = text;
  }
  else {
    (<any>obj).innerText = text;
  }
}

function on(obj: Node | Window, eventName: string, handler: (evt: Event) => void): void {
  if ((<any>obj).addEventListener) {
    try {
      (<any>obj).addEventListener(eventName, handler, false);
      return;
    }
    catch (e) { }
  }
  else if ((<any>obj).attachEvent) {
    try {
      (<any>obj).attachEvent('on' + eventName, handler);
      return;
    }
    catch (e) { }
  }

  obj['on' + eventName] = function(e) { return handler(e || window.event); };
};

function off(obj, eventName, handler) {
  if (obj.removeEventListener) {
    obj.removeEventListener(eventName, handler, false);
  }
  else if (obj.detachEvent) {
    obj.detachEvent('on' + eventName, handler);
  }
  else {
    if (obj['on' + eventName])
      obj['on' + eventName] = null;
  }
};

function elem(tag: Element | string, style?: any, parent?: Element): HTMLElement {
  var e = (<any>tag).tagName ? tag : window.document.createElement(tag);

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
        else if (k === 'background') {
          e.style.background = style[k];
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
                  console.error(e.tagName + '.style.' + k + '=' + style[k] + ': ' + err.message);
              }
              catch (whatevs) {
                alert(e.tagName + '.style.' + k + '=' + style[k] + ': ' + err.message);
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
      throw new Error(error.message + ' adding ' + e.tagName + ' to ' + parent.tagName);
    }
  }

  return e;
}

function createFrame() {

  var ifr = <HTMLIFrameElement>elem(
    'iframe',
    {
      position: 'absolute',
      left: 0, top: 0,
      width: '100%', height: '100%',
      border: 'none',
      src: 'about:blank'
    });
  ifr.frameBorder = '0';
  window.document.body.appendChild(ifr);

  var ifrwin: Window = ifr.contentWindow || (<any>ifr).window;
  var ifrdoc = ifrwin.document;

  if (ifrdoc.open) ifrdoc.open();
  ifrdoc.write(
    '<!' + 'doctype html' + '>' +
    '<' + 'html' + '>' +
    '<' + 'head' + '><' + 'style' + '>' +
    'html{margin:0;padding:0;border:none;height:100%;border:none;overflow:hidden;}' +
    'body{margin:0;padding:0;border:none;height:100%;border:none;overflow:hidden;}' +
    '*,*:before,*:after{box-sizing:inherit;}' +
    'html{box-sizing:border-box;}' +
    '</' + 'style' + '>\n' +

    '<' + 'body' + '>' +

    '<' + 'script' + '>window.__eval_export_=function(code) { return eval(code); }</' + 'script' + '>' +

    // it's important to have body before any long scripts (especialy external),
    // so IFRAME is immediately ready
    '<' + 'body' + '>' +

    '</' + 'html' + '>');
  if (ifrdoc.close) ifrdoc.close();

  var ifrwin_eval = (<any>ifrwin).__eval_export_;

  try { (<any>ifrwin).__eval_export_ = null; }
  catch (ingoreWeirdIEFailure) { }
  try { delete (<any>ifrwin).__eval_export_; }
  catch (ingoreWeirdIEFailure) { }

  ifrdoc.body.innerHTML = '';

  if (window.onerror) {
    ifrwin.onerror = delegate_onerror;
  }

  return {
    document: ifrdoc,
    global: ifrwin,
    iframe: ifr,
    evalFN: ifrwin_eval
  };

  function delegate_onerror() {
    window.onerror.apply(window, arguments);
  }

}

var fitresize: {
  windowWidth: number;
  windowHeight: number;
  scrollX: number;
  scrollY: number;
  onresize: () => void;
  fitframe(frame): void;
} = (function(){

  var needResize = false;
  var fitFrameList = [];
  var newSize = {
    windowWidth: 0,
    windowHeight: 0,
    scrollX: 0,
    scrollY: 0
  };

  on(window, 'scroll', global_resize_detect);
  on(window, 'resize', global_resize_detect);

  if (window.document) {
    var body = window.document.body;
    var docElem;
    if (docElem = window.document.documentElement || (body? body.parentElement || body.parentNode:null)) {
      on(docElem, 'resize', global_resize_detect)
      on(docElem, 'scroll', global_resize_detect)
    }
    if (body) {
      on(body, 'resize', global_resize_detect)
      on(body, 'scroll', global_resize_detect)
    }
  }

  var state = {
    fitframe,
    windowWidth: 0,
    windowHeight: 0,
    scrollX: 0,
    scrollY: 0,
    onresize: null
  };
  getMetrics(state);

  return state;

  function fitframe(frame) {
    var frdoc = frame.document || frame.contentDocument || (frame.contentWindow ? frame.contentWindow.document : null);
    var frbody = frdoc ? frdoc.body: null;
    var frwindow = frame.contentWindow || frame.contentWindow;
    var docs = [frdoc, frbody, frwindow];
    var events = ['touchstart', 'touchmove', 'touchend', 'pointerdown', 'pointerup','pointerout','keydown','keyup'];
    for (var i = 0; i < docs.length; i++) {
      if (!docs[i]) continue;
      for (var j = 0; j < events.length; j++) {
        on(docs[i], events[j], global_resize_detect);
      }
    }
    fitFrameList.push(frame);
    global_resize_detect();
  }

  function global_resize_detect() {
    if (needResize) return;
    needResize = true;

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(check_resize_now);
    }
    else {
      setTimeout(check_resize_now, 5);
    }
  }

  function getMetrics(metrics) {
    metrics.windowWidth = window.innerWidth || (document.body ? (document.body.parentElement ? document.body.parentElement.clientWidth : 0) || document.body.clientWidth : null);
    metrics.windowHeight = window.innerHeight || (document.body ? (document.body.parentElement ? document.body.parentElement.clientHeight : 0) || document.body.clientHeight : null);
    metrics.scrollX = window.scrollX || window.pageXOffset || (document.body ? document.body.scrollLeft || (document.body.parentElement ? document.body.parentElement.scrollLeft : 0) || 0 : null);
    metrics.scrollY = window.scrollY || window.pageYOffset || (document.body ? document.body.scrollTop || (document.body.parentElement ? document.body.parentElement.scrollTop : 0) || 0 : null);
  }

  function check_resize_now() {
    getMetrics(newSize);
    if (newSize.windowWidth === state.windowWidth
        && newSize.windowHeight === state.windowHeight
        && newSize.scrollX === state.scrollX
        && newSize.scrollY === state.scrollY) {
      needResize = false;
      return;
    }

    apply_new_size_now();
    needResize = false;
  }

  function apply_new_size_now() {

    state.windowWidth = newSize.windowWidth;
    state.windowHeight = newSize.windowHeight;
    state.scrollX = newSize.scrollX;
    state.scrollY = newSize.scrollY;

    var wpx = state.windowWidth + 'px';
    var hpx = state.windowHeight + 'px';
    var xpx = state.scrollX + 'px';
    var ypx = state.scrollY + 'px';

    for (var i = 0; i < fitFrameList.length; i++) {
      var fr = fitFrameList[i];
      if (!fr.parentElement && !fr.parentNode) continue;

      fr.style.left = xpx;
      fr.style.top = ypx;
      fr.style.width = wpx;
      fr.style.height = hpx;
    }

    if (state.onresize)
      state.onresize();

  }

})(); // fitresize
