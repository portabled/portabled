declare var requestFileSystem;
declare var webkitRequestFileSystem;
declare var mozRequestFileSystem;
declare var oRequestFileSystem;
declare var msRequestFileSystem;


(function(module) {

	var errorSer = createErrorSerializer();

  module.createIsolateHost = createIsolateHost;
  module.createIsolateHost.worker = createWebWorkerHost;
  module.createIsolateHost.iframe = createIFrameHost;
  module.createApiHost = createApiHost;

  return createIsolateHost;

  function createIsolateHost(drive: persistence.Drive, callback: (hst: isolation.IsolatedProcess) => void) {

    var tryUseWebWorker = detectWebWorkerHint();
    if (tryUseWebWorker) {
      try {
        createWebWorkerHost(drive, callback);
      }
      catch (webWorkerBarredError) {
        createIFrameHost(drive, callback);
      }
    }
    else {
      createIFrameHost(drive, callback);
    }

  }


  function detectWebWorkerHint(): boolean {
    try {
    	return typeof Worker==='function';
    }
    catch (webWorkerBarredError) {
      return false;
    }
  }

  function createWebWorkerHost(drive: persistence.Drive, callback: (hst: isolation.IsolatedProcess) => void) {
    var webWorker = createWebWorker();

    var diagTimeStart = +new Date();
    var requests = {count: 0};

    webWorker.onmessage = webworker_onmessage;

    webWorker.postMessage({init_worker_connect: true});

    var hst: isolation.IsolatedProcess = {
        type: null,
        remoteEval: remoteEval_webworker,
      	pushMessage: pushMessage_webworker,
        terminate: terminate_webworker,
        onerror: null,
        onmessage: null,
      	onconsole: null,
      	serializeError: errorSer.serialize
      };

    var fs: any;

  	var cmpSer = createComplexSerializer();

    function completeIsolatedProcess(type: string) {
      hst.type = <any>type;
      callback(hst);
    }

    function webworker_onmessage(e) {
      if (e.data.requestInitSync) {
        handleRequestInitSync(e.data.requestInitSync);
      }
      else if (e.data.requestInitSync_completed) {
        handleRequestInitSync_completed(e.data.requestInitSync_completed);
      }
      else if (e.data.requestInitAsync) {
        handleRequestInitAsync(e.data.requestInitAsync);
      }
      else if (e.data.invokeSync) {
        handleInvokeSync(e.data.invokeSync);
      }
      else if (e.data.invokeAsync) {
        handleInvokeAsync(e.data.invokeAsync);
      }
      else if (e.data.remoteResponse) {
        handleRemoteResponse(e.data.remoteResponse);
      }
      else if (e.data.remoteErrorResponse) {
        handleRemoteErrorResponse(e.data.remoteErrorResponse);
      }
      else if (e.data.driveUpdates) {
        handleDriveUpdates(e.data);
      }
      else if (e.data.driveRequest_files) {
        handleDriveRequest_files(e.data.driveRequest_files);
      }
      else if (e.data.driveRequest_read) {
        handleDriveRequest_read(e.data.driveRequest_read);
      }
      else if (e.data.driveRequest_storedSize) {
        handleDriveRequest_storedSize(e.data.driveRequest_storedSize);
      }
      else if (e.data.console_echo) {
        handleConsoleEcho(e.data.console_echo);
      }
      else if (e.data.key) {
        var req = requests[e.data.key];
        if (!req) return;

        delete requests[e.data.key];
        req(e.data.error, e.data.result);
      }
      else {
        if (typeof console!=='undefined' && console && typeof console.log==='function') {
          console.log('host: unknown message from webworker: ', e.data);
        }
      }
    }

    function handleRequestInitAsync(requestInitAsync) {
      var driveSnapshot = createDriveSnapshot();
      webWorker.postMessage({ driveSnapshot: driveSnapshot });
      completeIsolatedProcess('worker-async');
    }

    function handleRequestInitSync(requestInitSync) {
      createFS(tryReplyOK_waitForInitSyncOK);

      function tryReplyOK_waitForInitSyncOK(error, createdFS) {
        fs = createdFS;
        try {
          writeFS(requestInitSync, '{ "driveTimestamp": '+(drive.timestamp|0)+' }', function(error) {
            if (error){
      				var driveSnapshot = createDriveSnapshot();
          		webWorker.postMessage({requestInitSync_reject: driveSnapshot});
            }
            // if succeeds, they see the file and know already
          });
        }
        catch (error) {
      		var driveSnapshot = createDriveSnapshot();
          webWorker.postMessage({requestInitSync_reject: driveSnapshot});
        }
      }
    }

    function handleInvokeSync(invokeSync) {
      if (!hst.onmessage) return;
      hst.onmessage(invokeSync.msg, /*syncReply*/ true, (error, response) => {
        if (invokeSync.key) {
          var responseMsg = {
            error: error,
            response: response
          };

          var responseStr = JSON.stringify(responseMsg);
          writeFS(invokeSync.key, responseStr);
        }
      });
    }

    function handleInvokeAsync(invokeAsync) {
      if (!hst.onmessage) return;
      hst.onmessage(invokeAsync.msg, /*syncReply*/ false, (error, response) => {
        var error_serialized = errorSer.serialize(error);
        webWorker.postMessage({asyncResponse: {key:invokeAsync.key, error: error_serialized, response:response}});
      });
    }

    function handleRemoteResponse(remoteResponse) {
      var req = requests[remoteResponse.key];
      if (!req) return;

      delete requests[remoteResponse.key];
      req(null, remoteResponse.result);
    }

    function handleRemoteErrorResponse(remoteErrorResponse) {
      var req = requests[remoteErrorResponse.key];
      if (!req) return;

      delete requests[remoteErrorResponse.key];

      var error_deserialized = errorSer.deserialize(remoteErrorResponse.error);
      req(error_deserialized);
    }

    function handleDriveUpdates(driveUpdates) {
      driveApplyUpdates(drive, driveUpdates);
    }

    function handleDriveRequest_files(cookie) {
      writeFS(cookie, JSON.stringify(drive.files()));
    }

    function handleDriveRequest_read(msg) {
      writeFS(msg.key, JSON.stringify(drive.read(msg.file)));
    }

    function handleDriveRequest_storedSize(msg) {
      var size: number;
      if (drive.storedSize)
        size = drive.storedSize(msg.file);
      else
        size = (drive.read(msg.file)||'').length;

      writeFS(msg.key, ''+size);
    }

    function handleConsoleEcho(console_echo) {
      var deser = cmpSer.deserialize(console_echo.args);
      if (hst.onconsole) {
        var onconsole = hst.onconsole;
        onconsole(console_echo.level, deser);
      }
      else {
        var levelFn = console[console_echo.level];
        levelFn.apply(console, deser);
      }
    }

    function createDriveSnapshot(){
      var driveSnapshot: any = { timestamp: drive.timestamp };
      var driveFiles: string[] = drive.files();
      for (var i = 0; i < driveFiles.length; i++) {
        driveSnapshot[driveFiles[i]] = drive.read(driveFiles[i]);
      }
      return driveSnapshot;
    }

    function handleRequestInitSync_completed(requestInitSync_completed) {
      completeIsolatedProcess('worker-sync');
    }

    function createFS(callback: (error: Error, fs?: any) => void) {
      try {
				if (typeof requestFileSystem==='function') {
          var reqFS = requestFileSystem;
          var reqFS_name = 'requestFileSystem';
        }
        else if (typeof webkitRequestFileSystem==='function') {
          var reqFS = webkitRequestFileSystem;
          var reqFS_name = 'webkitRequestFileSystem';
        }
        else if (typeof mozRequestFileSystem==='function') {
          var reqFS = mozRequestFileSystem;
          var reqFS_name = 'mozRequestFileSystem';
        }
        else if (typeof oRequestFileSystem==='function') {
          var reqFS = oRequestFileSystem;
          var reqFS_name = 'oRequestFileSystem';
        }
        else if (typeof msRequestFileSystem==='function') {
          var reqFS = msRequestFileSystem;
          var reqFS_name = 'msRequestFileSystem';
        }
        else {
          callback(new Error('filesystem cannot be found'));
          return;
        }

        var timeoutReqFS = setTimeout(function() {
          clearTimeout(timeoutReqFS);
          timeoutReqFS = 0;
          callback(new Error('Waiting for '+reqFS_name+' timed out.'));
        }, 1000);

        reqFS('TEMPORARY', 1024, (fs) => {
          if (timeoutReqFS) {
            clearTimeout(timeoutReqFS);
          }
          else {
            return; // timeout already fired, it's too late
          }

          callback(null, fs);
        });

      }
      catch (error) {
        callback(error);
      }
    }

    function writeFS(name: string, content: string, callback?: (error?: Error) => void) {
      try { fs.root.getFile('/isolation-syncfs-aided--'+name, {create:true}, getFile_handler, callback); }
      catch (error) { if (callback) callback(error); }

      function getFile_handler(fileEntry) {
        try { fileEntry.createWriter(createWriter_handler, callback); }
        catch (error) { if (callback) callback(error); }
      }

      function createWriter_handler(fileWriter) {
        try {
          if (callback) {
            fileWriter.onwriteend = fileWriter_onwriteend;
            fileWriter.onerror = callback;
          }

          var bb = new Blob([content]);
          fileWriter.write(bb);
        }
        catch (error) { if (callback) callback(error); }
      }

      function fileWriter_onwriteend(e) { callback(); }
    }

    function remoteEval_webworker(fnScript: string, arg: any, path: string, callback: (error: Error, result) => any) {
      var key = (requests.count++).toString();

      // generate a bit of timestamp for the benefit of easier debugging
      if (Date.now) key += '-'+(Date.now()-diagTimeStart)+'ms';
      else key += '-'+(+ new Date()-diagTimeStart)+'ms';

      requests[key] = (error, result) => {
        callback(error, result);
      };

      webWorker.postMessage({ remoteEval: {script:fnScript, arg: arg, path: path, key: key} });
    }

    function pushMessage_webworker(msg: any) {
      webWorker.postMessage({pushMessage: msg});
    }

    function terminate_webworker() {
      webWorker.terminate();
    }

    function createWebWorker() {
      var worker_body = getWorkerAgentScript();

      if (typeof Blob==='function') {
        try {
          return webWorkerFromBlob();
        }
        catch (errWebWorkerBlob){
          return webWorkerFromDataURI();
        }
      }
      else {
        try {
          return webWorkerFromDataURI();
        }
      	catch (errWorkerDataURI) {
          return webWorkerFromBlob();
        }
      }

      function webWorkerFromDataURI() {
        var	worker = new Worker('data:application/javascript,'+encodeURIComponent(worker_body));
        return worker;
      }

      function webWorkerFromBlob() {
        var blob = new Blob([worker_body], { type: 'text/javascript' });
        var url = URL.createObjectURL(blob);
        var worker = new Worker(url);
        return worker;
      }
    }
  }


  function createIFrameHost(drive: persistence.Drive, callback: (hst: isolation.IsolatedProcess) => void) {

    var frm = createIFrame();
    var hst: isolation.IsolatedProcess = {
      type: 'iframe',
  		remoteEval: remoteEval_iframe,
      pushMessage: pushMessage_iframe,
  		terminate: terminate_iframe,
  		onerror: null,
      onmessage: null,
      onconsole: null,
      serializeError: errorSer.serialize
    };

    var registeredPushMessageCallbacks: {(msg: any);}[] = [];
    var registeredPushMessageCallbacks_length = 0;

    callback(hst);

    function remoteEval_iframe(fnScript: string, arg: any, path: string, callback: (error: Error, result?) => any) {
      var fn = (0,frm.evalFN)('(function(){'+fnScript+'\n})'+(path ? '//# '+'sourceURL='+path : ''));
      try {
      	var result = fn(arg);
      }
      catch (error) {
        callback(error);
        return;
      }

      callback(null, result);
    }

    function pushMessage_iframe(msg: any) {
      for (var i = 0; i < registeredPushMessageCallbacks_length; i++) {
        var cb = registeredPushMessageCallbacks[i];
        if (cb)
        	cb(msg);
      }
    }

    function terminate_iframe() {
      if (frm && frm.ifr.parentElement){
        frm.ifr.parentElement.removeChild(frm.ifr);
        frm = null;
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

    function createIFrame() {

      var cmpSer = createComplexSerializer();

      var ifr = document.createElement('iframe');
      ifr.src = 'about:blank'; // TODO: explore loading from Blob/data URI directly
      ifr.style.cssText = 'display: none; position: absolute; left: -50px; top: -50px; width: 0px; height: 0px;';
      document.body.appendChild(ifr);
      var ifrwin: any = ifr.contentWindow||(<any>ifr).window;
      ifrwin.document.write('<'+'script>window[" "] = (function(ev){ return function(){ return ev(arguments[0]); }; })(eval);</'+'script>');
      var evalFN = ifrwin[" "];
      evalFN('window[" "]=void 0; (function(){arguments[0][0].parentElement.removeChild(arguments[0][0]);})(document.getElementsByTagName("script"));');
      var connection_to_parent = {
        drive: drive,
        invokeAsync(msg: any, callback: (error: Error, result: any) => void) {
        	try {
            hst.onmessage(msg, /*syncReply*/true, callback);
      		}
      		catch (error) {
            callback(error, null);
          }
      	},
        invokeSync(msg: any) {
          var reply: any;
          hst.onmessage(msg, /*syncReply*/true, reply_passed => reply = reply_passed);
          return reply;
        },
        onPushMessage: onPushMessage
      };


 	 		if (ifrwin.console) {
  			ConsoleRedirect.prototype = ifrwin.console;
      }

  		var console_redirect = new ConsoleRedirect();
  		console_redirect.log = log_redirect;
  		console_redirect.warn = warn_redirect;
  		console_redirect.debug = debug_redirect;
  		console_redirect.trace = trace_redirect;
  		console_redirect.error = error_redirect;
  		ifrwin.console = console_redirect;

  		ifrwin.connection_to_parent = connection_to_parent;
      return { ifr, evalFN, connection_to_parent };

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
        var serdeser = cmpSer.deserialize(cmpSer.serialize(args));
        if (hst.onconsole) {
          hst.onconsole(level, serdeser);
        }
        else {
          if (typeof console!=='undefined') {
            var levelFn = console[level] || console.log;
            levelFn.apply(console, serdeser);
          }
        }
      }

    };

  }



  function createApiHost(drive: persistence.Drive, options: any, callback: (api?: isolation.LoadedApiProcess) => void) {
    isolation.createIsolateHost(drive, (host) => {
      var noapiSetupScript =
          getApiScript() + '\n\n\n\n'+
          'arguments[0].drive = connection_to_parent.drive;\n'+
          'initApiContext(arguments[0]);';

      host.remoteEval(noapiSetupScript, options, '/isolation_noapi.js', (error) => {
        if (error) {
          // TODO: console.log??
          callback(null);
          return;
        }

        var api_host = <isolation.LoadedApiProcess>host;
        api_host.runGlobal = api_remote_runGlobal;
        api_host.onmessage = api_remote_onmessage;
        api_host.ondispose = null;
        api_host.exitCode = null;
        api_host.keepAlive = api_keepAlive;

        var reqResDispatcher = createRequestResponseDispatcher();
        var keepAliveReqResDispatcher = createRequestResponseDispatcher();

        callback(api_host);

        function api_remote_runGlobal(script: string, path: string, callback: (error: Error, result: any) => void) {
          var key = reqResDispatcher.pushCallback(callback);
          api_host.pushMessage({noapi_runGlobal: { script: script, path: path, key: key }});
        }

        function api_remote_onmessage(msg: any) {
          if (msg.noapi_ondispose) {
            api_host.exitCode = msg.noapi_ondispose.exitCode;
            var api_host_ondispose = api_host.ondispose;
            if (api_host_ondispose) api_host_ondispose();
          }
          else if (msg.noapi_runGlobal_error) {
            var key = msg.noapi_runGlobal_error.key;
            if (!key) {
              // TODO: console.log??
              return;
            }
            var callback = reqResDispatcher.popCallback(key);
            if (!callback) {
              // TODO: console.log??
              return;
            }
            var err = errorSer.deserialize(msg.noapi_runGlobal_error.error);
            callback(err);
          }
          else if (msg.noapi_runGlobal_response) {
            var key = msg.noapi_runGlobal_response.key;
            if (!key) {
              // TODO: console.log??
              return;
            }
            var callback = reqResDispatcher.popCallback(key);
            if (!callback) {
              // TODO: console.log??
              return;
            }
            callback(null, msg.noapi_runGlobal_response.response);
          }
          else if (msg.keepAlive_addRef_response) {
            var keepAlive_onToken = keepAliveReqResDispatcher.popCallback(msg.keepAlive_addRef_response.key);
            keepAlive_onToken(msg.keepAlive_addRef_response.token);
          }
          else if (msg.keepAlive_release_response) {
            // ignore, who cares
          }
        }

        function api_keepAlive() {
          var key = keepAliveReqResDispatcher.pushCallback(api_keepAlive_onToken);
          var token = null;
          var releaseCalled = false;

          api_host.pushMessage({noapi_keepAlive_addRef: { key: key }});

          return api_keepAlive_release;

          function api_keepAlive_release() {
            if (token) {
              api_host.pushMessage({noapi_keepAlive_release: { token: token }});
            }
            else {
              releaseCalled = true;
            }
          }

          function api_keepAlive_onToken(token) {
            if (releaseCalled) {
              api_host.pushMessage({noapi_keepAlive_release: { token: token }});
            }
            else {
              token = token;
            }
          }

        }

      });
    });
	}

  function getWorkerAgentScript() {
    var worker_body = "#workeragent#";
  	worker_body = '(function() {    ' + worker_body + '\n\n\n})() //# '+'sourceURL=/isolation_worker_body.js';
  	return worker_body;
  }

  function getApiScript() {
    var script = "#noapi#";
    script +='\n\nconnection_to_parent.initApiContext = initApiContext;';
    return script;
  }

})(isolation);