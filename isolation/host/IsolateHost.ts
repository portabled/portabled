declare var requestFileSystem;
declare var webkitRequestFileSystem;
declare var mozRequestFileSystem;
declare var oRequestFileSystem;
declare var msRequestFileSystem;


(function(module) {

	var srz = createComplexSerializer();

  module.createIsolateHost = createIsolateHost as any;
  module.createIsolateHost.worker = createWebWorkerHost as any;
  module.createIsolateHost.iframe = createIFrameHost as any;
  module.createApiHost = createApiHost as any;

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

    var initMsg = getInitPlatformMessage();
    webWorker.postMessage({init_worker_connect: initMsg});

    var hst: isolation.IsolatedProcess = {
        type: null,
        remoteEval: remoteEval_webworker,
      	pushMessage: pushMessage_webworker,
        terminate: terminate_webworker,
        onerror: null,
        onmessage: null,
      	onconsole: null
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
      else if (e.data.globalError) {
        handleGlobalError(e.data.globalError);
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
        var error_serialized = srz.serialize(error);
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

      var error_deserialized = srz.deserialize(remoteErrorResponse.error);
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

    function handleGlobalError(globalError) {
      var deser = cmpSer.deserialize(globalError);
      if (hst.onerror) {
        var err = cmpSer.deserialize(globalError);
        var onerror = hst.onerror;
        onerror(err);
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

        var timeoutReqFS: any = setTimeout(function() {
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
      var worker_body = getWorkerAgentScript(false/*doNotRun: false, i.e. do run straight away*/);

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

    var cmpSer = createComplexSerializer();

    var frm = createIFrame();

    callback(<any>frm.hst);

    function terminate_iframe() {
      if (frm && frm.ifr.parentElement) {
        frm.ifr.parentElement.removeChild(frm.ifr);
        frm = null;
      }
    }

    function createIFrame() {

      var ifr = document.createElement('iframe');
      ifr.src = 'about:blank'; // TODO: explore loading from Blob/data URI directly
      ifr.style.cssText = 'display: none; position: absolute; left: -50px; top: -50px; width: 0px; height: 0px;';
      document.body.appendChild(ifr);
      var ifrwin: any = ifr.contentWindow||(<any>ifr).window;

      var ifr_script = getWorkerAgentScript(true /*doNotRun*/);

      ifrwin.document.write('<'+'script>'+ifr_script+'</'+'script>');


      var hstCalls = ifrwin.window.agentFunction_iframe(drive);
      hstCalls.onerror = hst_onerror_iframe;
      hstCalls.onmessage = hst_onmessage_iframe;
      hstCalls.onconsole = hst_onconsole_iframe;

      var hst = {
        type: 'iframe',
        remoteEval: hst_remoteEval,
        pushMessage: hst_pushMessage,
        terminate: terminate_iframe,
        onerror: null,
        onmessage: null,
        onconsole: null
      };

      return { ifr, hst };

      function hst_pushMessage(msg: any) {
        var msg_ser = cmpSer.serialize(msg);
        hstCalls.pushMessage(msg_ser);
      }

      function hst_remoteEval(fnScript: string, arg: any, path: string, callback: (error: Error, result) => any){
        var arg_ser = cmpSer.serialize(arg);
        hstCalls.remoteEval(fnScript, arg_ser, path, callback ? hst_remoteEval_callback : null);

        function hst_remoteEval_callback(error, result) {
          var error_deser = cmpSer.deserialize(error);
          var result_deser = cmpSer.deserialize(result);
          callback(error_deser, result_deser);
        }
      }

    }


    function hst_onerror_iframe(err) {
      if (frm.hst.onerror) {
        var err_deser = cmpSer.deserialize(err);
        frm.hst.onerror(err_deser);
      }
    }

    function hst_onmessage_iframe(msg: any, syncReply: boolean, callback: (error: Error, response?: any) => void) {
      if (frm.hst.onmessage) {
        var msg_deser = cmpSer.deserialize(msg);
        frm.hst.onmessage(msg_deser, syncReply, callback ? hst_onmessage_iframe_callback : null);
      }

      function hst_onmessage_iframe_callback(error, response) {
        var error_deser = cmpSer.deserialize(error);
        var response_deser = cmpSer.deserialize(response);
        callback(error_deser, response_deser);
      }
    }

    function hst_onconsole_iframe(level: string, args: any[]) {
      if (frm.hst.onconsole) {
        var args_deser = cmpSer.deserialize(args);
        frm.hst.onconsole(level, args_deser);
      }
    }


  }

 	function getInitPlatformMessage() {
    var initMsg = {
      versions: { navigator: navigator.userAgent },
      platform: (navigator.platform || 'Win32').toLowerCase(),
      vendor: navigator.vendor|| (String.fromCharCode(0x47)+ 'oo'+String.fromCharCode(0x47).toLowerCase()+'le '+('PCInc').slice(2)+'.'),
      languages: (<any>navigator).languages || (navigator.language?[navigator.language]:['en-us']),
      cpuCount: (<any>navigator).hardwareConcurrency || 1
    };
  	return initMsg;
	}


  function createApiHost(drive: persistence.Drive, options: any, callback: (api?: isolation.LoadedApiProcess) => void) {
    isolation.createIsolateHost(drive, (host) => {
      var noapiSetupScript =
          getApiScript() + '\n\n\n\n'+
          'arguments[0].drive = connection_to_parent.drive;\n'+
          'initApiContext(arguments[0]);';

      if (!options.versions) {
        var pltf = getInitPlatformMessage();
        options.versions = pltf.versions;
      }

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

          var strippedScript = stripHashBang(script);

          var key = reqResDispatcher.pushCallback(callback);
          api_host.pushMessage({noapi_runGlobal: { script: strippedScript, path: path, key: key }});
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
            var err = srz.deserialize(msg.noapi_runGlobal_error.error);
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
            var response = srz.deserialize(msg.noapi_runGlobal_response.response);
            callback(null, response);
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

  function stripHashBang(text: string): string {
    if (text.charAt(0)==='#') {
      // ignore leads
      var posLineEnd = text.indexOf('\n');
      if (posLineEnd>0 && posLineEnd<300) {
        var firstLine = text.slice(0, posLineEnd);
        if (posLineEnd===1)
          firstLine = ' ';
        else
          firstLine = '//'+firstLine.slice(0, firstLine.length-2);
        text = firstLine + text.slice(posLineEnd);
      }
    }
    return text;
  }

  function getWorkerAgentScript(doNOTrun: boolean) {
    var worker_body = "#workeragent#";
    if (doNOTrun) {
  		worker_body = worker_body +'\n //# '+'sourceURL=/isolation_iframe_body.js';
    }
    else {
  		worker_body = '(function() {    ' + worker_body + '\n\n\n'+ 'agentFunction_webWorker(); })() //# '+'sourceURL=/isolation_worker_body.js';
    }
  	return worker_body;
  }

  function getApiScript() {
    var script = "#noapi#";
    script +='\n\nconnection_to_parent.initApiContext = initApiContext;';
    return script;
  }

})(isolation);