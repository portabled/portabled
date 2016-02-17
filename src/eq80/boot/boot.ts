declare var eq80;

function boot() {
  window.onerror = function(...args: any[]) {
    alert('UNHANDLED\n'+args.join('\n'));
  };

  function onkeeploading() {

    if (document.title==='/:') document.title = '/:.';
    if (!eq80.timings.domStarted
        && (continueMount.loadedSize || continueMount.totalSize))
      eq80.timings.domStarted = +new Date();

    removeSpyElements();

    sz.update();

    var prevLoadedSize = continueMount.loadedSize;
    var prevTotalSize = continueMount.totalSize;

    eq80.continueMount = continueMount = continueMount.continueLoading();

    if (prevLoadedSize !== continueMount.loadedSize || prevTotalSize !== continueMount.totalSize) {
      if (document.title==='/:' || document.title==='/:.') document.title = '//';

      for (var i = 0; i < progressCallbacks.length; i++) {
        var callback = progressCallbacks[i];
        callback(continueMount.loadedSize, continueMount.totalSize);
      }
    }

  }

  function window_onload() {

    function onfinishloading(drive) {
      eq80.timings.driveLoaded = +new Date();
      eq80.drive = drive;
      if (loadedCallbacks && loadedCallbacks.length) {
        if (document.title==='/:' || document.title==='/:.' || document.title==='//') document.title = '//.';
        for (var i = 0; i < loadedCallbacks.length; i++) {
          var callback = loadedCallbacks[i];
          callback(drive);
        }
      }
      else {
        if (document.title==='/:' || document.title==='/:.' || document.title==='//') document.title = '//,';
        fadeToUI();
      }
    }

    if (typeof eq80==='undefined' || eq80.window!==window) return;

    clearInterval(keepLoading);

    removeSpyElements();

    eq80.timings.documentLoaded = +new Date();

    sz.update();

    continueMount.finishLoading(onfinishloading);

  }

  function fadeToUI() {
    sz.update();
    ui.style.opacity = '0';
    ui.style.filter = 'alpha(opacity=0)';
    ui.style.display = 'block';

    var start = +new Date();
    var fadeintTime = Math.min(500, (start-eq80.timings.start)/2);
    var animateFadeIn = setInterval(function() {
      var passed = (+new Date()) - start;
      var opacity = Math.min(passed, fadeintTime) / fadeintTime;
      boot.style.opacity = (1 - opacity).toString();
      boot.style.filter = 'alpha(opacity=' + (((1-opacity) * 100) | 0) + ')';

      ui.style.opacity = <any>opacity;
      ui.style.filter = 'alpha(opacity=' + ((opacity * 100) | 0) + ')';

      if (passed >= fadeintTime) {
        ui.style.opacity = <any>1;
        ui.style.filter = 'alpha(opacity=100)';
        boot.style.opacity = <any>0;
        boot.style.filter = 'alpha(opacity=0)';

        if (animateFadeIn) {
          sz.update();
          clearInterval(animateFadeIn);
          animateFadeIn = 0;
          setTimeout(function() { // slight delay for better opacity smoothness
            sz.update();
            if (boot.parentElement)
              boot.parentElement.removeChild(boot);
            ui.style.opacity = null;
            ui.style.filter = null;

            if (document.title==='//.')
              document.title = '//:';

          }, 1);
        }
      }
    }, 20);
  } // fadeToUI

  function on(eventName, callback, _more) {

    if (typeof eventName === 'string') {
      if (typeof callback !== 'function') return;
      switch (eventName) {

        case 'progress':
          progressCallbacks.push(callback);
          break;

        case 'load':
          if (loadedCallbacks) loadedCallbacks.push(callback);
          else setTimeout(function() { callback(eq80.drive); }, 1);
          break;

        case 'resize':
          resizeCallbacks.push(callback);
          resizeReportCallbacks.push(callback);
          if (resizeReportCallbacks.length===1) {
            setTimeout(() => {
              for (var i = 0; i < resizeReportCallbacks.length; i++) {
                var cb = resizeReportCallbacks[i];
                cb(sz);
              }
              resizeReportCallbacks = [];
            }, 1);
          }
          break;
      }

      return;
    }

    var obj = eventName;
    eventName = callback;
    callback = _more;

    if (obj.addEventListener) {
      try {
        obj.addEventListener(eventName, callback, false);
        return;
      }
      catch (e) { }
    }
    else if (obj.attachEvent) {
      try {
        obj.attachEvent('on' + eventName, callback);
        return;
      }
      catch (e) { }
    }

    obj['on' + eventName] = function(e) { return callback(e || window.event); };
  } // on

  function off(obj, eventName, callback) {
    if (obj.removeEventListener) {
      obj.removeEventListener(eventName, callback, false);
    }
    else if (obj.detachEvent) {
      obj.detachEvent('on' + eventName, callback);
    }
    else {
      if (obj['on' + eventName])
        obj['on' + eventName] = null;
    }
  } // off

  function fitresize() {

    var needResize = false;
    var forceResize = false;
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
      update: update,
      fitframe: fitframe,
      windowWidth: 0,
      windowHeight: 0,
      scrollX: 0,
      scrollY: 0,
      onresize: null
    };
    getMetrics(state);

    return state;

    function update() {
      check_resize_now();
    }

    function fitframe(frame) {
      var frwindow = frame.contentWindow || (<any>frame.window);
      var frdoc = frwindow.document;
      var frbody = frdoc ? frdoc.body: null;
      var docs = [frdoc, frbody, frwindow];
      var events = ['touchstart', 'touchmove', 'touchend', 'pointerdown', 'pointerup','pointerout','keydown','keyup'];
      for (var i = 0; i < docs.length; i++) {
        if (!docs[i]) continue;
        for (var j = 0; j < events.length; j++) {
          on(docs[i], events[j], global_resize_detect);
        }
      }
      fitFrameList.push(frame);
      forceResize = true;
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
      if (!forceResize
          && newSize.windowWidth === state.windowWidth
          && newSize.windowHeight === state.windowHeight
          && newSize.scrollX === state.scrollX
          && newSize.scrollY === state.scrollY) {
        needResize = false;
        return;
      }

      forceResize = false;

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

      if (resizeCallbacks.length) {
        if (resizeReportCallbacks.length) resizeReportCallbacks = [];
        var sz = {
          windowWidth: state.windowWidth,
          windowHeight: state.windowHeight,
          scrollX: state.scrollX,
          scrollY: state.scrollY
        };

        for (var i = 0; i < resizeCallbacks.length; i++) {
          var cb = resizeCallbacks[i];
          cb(sz);
        }
      }
    }

  } // fitresize

  function createFrame() {
    var iframe = document.createElement('iframe');
    (<any>iframe).application='yes';
    (<any>iframe).__knownFrame = true;
    iframe.style.cssText = 'position:absolute; left:0; top:0; width:100%; height:100%; border:none;display:none;';
    iframe.src = 'about:blank';
    iframe.frameBorder = '0';
    window.document.body.appendChild(iframe);

    var ifrwin = iframe.contentWindow || (iframe.contentWindow = (<any>iframe).window);
    var ifrdoc = ifrwin.document;

    if (ifrdoc.open) ifrdoc.open();
    ifrdoc.write(
      '<'+'!doctype html><' + 'html><' + 'head><' + 'style>' +
      'html{margin:0;padding:0;border:none;height:100%;border:none;overflow:hidden;}' +
      'body{margin:0;padding:0;border:none;height:100%;border:none;overflow:hidden;}' +
      '*,*:before,*:after{box-sizing:inherit;}' +
      'html{box-sizing:border-box;}' +
      '</' + 'style><' + 'body>'+
      '<' + 'body></' + 'html>');
    if (ifrdoc.close) ifrdoc.close();

    (<any>ifrwin).eval = 23;

    fitFrameList.push(iframe);

    return iframe;
  } // createFrame


  function deriveUniqueKey(locationSeed) {
    var key = (locationSeed + '').split('?')[0].split('#')[0].toLowerCase();

    var posIndexTrail = key.search(/\/index\.html$/);
    if (posIndexTrail > 0) key = key.slice(0, posIndexTrail);

    if (key.charAt(0) === '/')
      key = key.slice(1);
    if (key.slice(-1) === '/')
      key = key.slice(0, key.length - 1);

    return smallHash(key) + '-' + smallHash(key.slice(1) + 'a');

    function smallHash(key) {
      for (var h = 0, i = 0; i < key.length; i++) {
        h = Math.pow(31, h + 31 / key.charCodeAt(i));
        h -= h | 0;
      }
      return (h * 2000000000) | 0;
    }

  }

  function removeSpyElements() {

    removeElements('iframe');
    removeElements('style');
    removeElements('script');

    function removeElements(tagName) {
      var list = document.getElementsByTagName(tagName);
      for (var i = 0; i < list.length; i++) {
        var elem: HTMLElement = list[i] || list.item(i);
        if ((<any>elem).__knownFrame) continue;
        if (elem && elem.parentElement && elem.getAttribute && elem.getAttribute('data-legit')!=='mi') {
          if ((ui && elem===ui) || (boot && elem===boot)) continue;
          try{ elem.parentElement.removeChild(elem); i--; } catch (error) { }
        }
      }
    }
  }








  var fitFrameList = [];


  eq80.timings = {
    start: +new Date()
  };
  eq80.window = window;
  document.title = '.';

  removeSpyElements();

  document.title = ':';

  // creates both frames invisible
  var boot = eq80.boot = createFrame();
  boot.style.zIndex = <any>100;
  var ui = eq80.ui = createFrame();
  ui.style.zIndex = <any>10;

  document.title = '/';

  var sz = fitresize();
  sz.fitframe(boot);
  sz.fitframe(ui);

  document.title = '/.';


  eq80.on = on; // supported events: progress, load, resize

  eq80.fadeToUI = fadeToUI;

  var progressCallbacks = [];
  var loadedCallbacks = [];
  var resizeCallbacks = [];
  var resizeReportCallbacks = [];


  var uniqueKey = deriveUniqueKey(location);
  var continueMount = eq80.persistence.bootMount(uniqueKey, document); // start persistence detection and loading (both DOM and HTML5)

  document.title = '/:';

  if (window.addEventListener) {
    window.addEventListener('load', window_onload, true);
  }
  else if ((<any>window).attachEvent) {
    (<any>window).attachEvent('onload', window_onload);
  }
  else {
    window.onload = window_onload;
  }

  var keepLoading = setInterval(onkeeploading, 100);

}