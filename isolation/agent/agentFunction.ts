declare var connection_to_parent: ConnectionToParent;


var errorSer = createErrorSerializer();
captureGlobalScopeVariables_atStart();
addMessageEventListener();

expectMessage_init_worker_connect(function() {

  var fs = detectSyncFSAvailable_or_reason();
  if (typeof fs === 'string') return requestAsyncMode(fs);


  try {
    trySetupSyncMode(fs);
  }
  catch (error) {
    requestAsyncMode(error.message);
  }

});
