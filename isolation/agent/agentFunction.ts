declare var connection_to_parent: ConnectionToParent;


var cmpSer = createComplexSerializer();

function agentFunction_iframe(drive: persistence.Drive) {
  return RUN_IFRAME_CHANNEL(drive);
}

function agentFunction_webWorker() {

  captureGlobalScopeVariables_atStart();
  addMessageEventListener();
  addGlobalErrorListener();

  expectMessage_init_worker_connect(function(init_worker_connect) {

    if (init_worker_connect) {
      try { if (typeof console!=='undefined' && typeof console.info==='function') {
        console.info('worker init: ', init_worker_connect);
      } }
      catch (consoleError) { }
    }

    var fs = detectSyncFSAvailable_or_reason();
    if (typeof fs === 'string') return requestAsyncMode(fs);


    try {
      trySetupSyncMode(fs);
    }
    catch (error) {
      requestAsyncMode(error.message);
    }

  });

}