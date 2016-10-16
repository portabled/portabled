declare var attachEvent;

function RUN_IFRAME_CHANNEL(drive: persistence.Drive) {

  var _eval = eval;
  var cmpSer = createComplexSerializer();

  if (typeof addEventListener==='function') {
    addEventListener('error', iframeGlobal_onerror, true);
  }
  else if (typeof attachEvent==='function') {
    attachEvent('onerror', iframeGlobal_onerror);
  }
  else {
    window.onerror = iframeGlobal_onerror;
  }

  var hstCalls = {
    remoteEval: remoteEval_iframe,
    pushMessage: pushMessage_iframe,
    onerror: null,
    onmessage: null,
    onconsole: null
  };

  var registeredPushMessageCallbacks: {(msg: any);}[] = [];
  var registeredPushMessageCallbacks_length = 0;

  installConsoleRedirect();

	connection_to_parent = {
    drive: drive,
    invokeAsync: invokeAsync_toParent,
    invokeSync: invokeSync_toParent,
    onPushMessage: onPushMessage
	};

  return hstCalls;

  function installConsoleRedirect() {
    if (typeof console!=='undefined' && console) {
      ConsoleRedirect.prototype = console;
    }

    var console_redirect = new ConsoleRedirect();
    console_redirect.log = log_redirect;
    console_redirect.warn = warn_redirect;
    console_redirect.debug = debug_redirect;
    console_redirect.trace = trace_redirect;
    console_redirect.error = error_redirect;
    console = console_redirect;

    function ConsoleRedirect() { }

    function log_redirect() {
      var args = [];
      for (var i = 0; i < arguments.length; i++) { args.push(arguments[i]); }
      console_level_redirect('log', args);
    }

    function warn_redirect() {
      var args = [];
      for (var i = 0; i < arguments.length; i++) { args.push(arguments[i]); }
      console_level_redirect('warn', args);
    }

    function debug_redirect() {
      var args = [];
      for (var i = 0; i < arguments.length; i++) { args.push(arguments[i]); }
      console_level_redirect('debug', args);
    }

    function trace_redirect() {
      var args = [];
      for (var i = 0; i < arguments.length; i++) { args.push(arguments[i]); }
      console_level_redirect('trace', args);
    }

    function error_redirect() {
      var args = [];
      for (var i = 0; i < arguments.length; i++) { args.push(arguments[i]); }
      console_level_redirect('error', args);
    }

    function console_level_redirect(level: string, args: any[]) {
      var args_ser = cmpSer.serialize(args);
      if (hstCalls.onconsole) {
        hstCalls.onconsole(level, args_ser);
      }
      else {
        if (ConsoleRedirect.prototype) {
          var levelFn = ConsoleRedirect.prototype[level] || ConsoleRedirect.prototype.log;
          if(levelFn)
          	levelFn.apply(console, args_ser);
        }
      }
    }

  }

	function invokeAsync_toParent(msg: any, callback: (error: Error, result: any) => void) {
    try {
      var msg_ser = cmpSer.serialize(msg);
      hstCalls.onmessage(msg_ser, /*syncReply*/true, callback);
    }
    catch (error) {
      var error_ser = cmpSer.serialize(error);
      callback(error_ser, null);
    }
  }

  function invokeSync_toParent(msg: any) {
    var msg_ser = cmpSer.serialize(msg);
    var reply: any;
    hstCalls.onmessage(msg_ser, /*syncReply*/true, reply_passed => reply = reply_passed);
    return reply;
  }

  function iframeGlobal_onerror(e: any) {
    var err = e.error || e;
    hstCalls.onerror(cmpSer.serialize(err));
  }

  function remoteEval_iframe(
  	fnScript: string,
   	arg: any,
   	path: string,
   	callback: (error: Error, result?) => any) {
    try {
      // keep that double-function enclosure, as IE treats a function inside round brackets as a declaration rather than a value
      var fn = (0, _eval)('(function(){ return function(){'+fnScript+'\n}})()'+(path ? '//# '+'sourceURL='+path : ''));
      var result = fn(arg);
    }
    catch (error) {
      var error_ser = cmpSer.serialize(error);
       callback(error_ser);
      return;
    }
    var result_ser = cmpSer.serialize(result);
    callback(null, result_ser);
  }

  function pushMessage_iframe(msg: any) {
    for (var i = 0; i < registeredPushMessageCallbacks_length; i++) {
      var cb = registeredPushMessageCallbacks[i];
      if (cb)
        cb(msg);
    }
  }

  function onPushMessage(registerCallback: (msg: any) => void) : ()=>void {
    var index = registeredPushMessageCallbacks_length;
    registeredPushMessageCallbacks.push(registerCallback);
    registeredPushMessageCallbacks_length++;

    return unregister_pushMessageCallback;
    function unregister_pushMessageCallback() {
      if (index<0) return;
      delete registeredPushMessageCallbacks[index];
      index = -1;

      // adjust the tail (removal of callbacks may run out of order)
      var newLength = registeredPushMessageCallbacks_length;
      while(!registeredPushMessageCallbacks[newLength] && newLength>=0) {
        newLength--;
      }

      if (newLength!==registeredPushMessageCallbacks_length)
        registeredPushMessageCallbacks_length = newLength;
    }
  }

}