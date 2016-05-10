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
