function on(eventName, callback, _more) {

  if (typeof eventName === 'string') {
    if (typeof callback !== 'function') return;
    switch (eventName) {

      case 'progress':
        progressCallbacks.push(callback);
        break;

      case 'domnode':
        domNodeCallbacks.push(callback);
        for (var i = 0; i < keepDomNodesUntilBootComplete.length; i++) {
          var n = keepDomNodesUntilBootComplete[i];
          callback(n.node, n.recognizedKind, n.recognizedEntity);
        }
        break;

      case 'load':
        if (loadedCallbacks) loadedCallbacks.push(callback);
        else setTimeout(function() { callback(drive); }, 1);
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


// TODO: figure out when obj argument is skipped
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
