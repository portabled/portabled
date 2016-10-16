function handleRemoteEval_EITHER_CHANNEL(remoteEval) {
  try {
    var script = remoteEval.script;
    if (remoteEval.path) {
      script += '//# '+'sourceURL='+remoteEval.path;
    }

    var arg = remoteEval.arg;
    var fn = new _Function(script);
    var result = fn(arg);
    if (!remoteEval.key) {
      if (_console_log)
        _console_log('remoteEval: succeeded while no key was passed: ', result, remoteEval);
      return;
    }

    var remoteResponse = {
      key: remoteEval.key,
      result: result
    };
    postMessageToHost({remoteResponse: remoteResponse});
  }
  catch (error) {
    if (!remoteEval.key) {
      if (_console_log)
        _console_log('remoteEval: error while no key was passed: ', error, remoteEval);
      return;
    }

    var remoteErrorResponse = {
      key: remoteEval.key,
      error: cmpSer.serialize(error)
    };
    postMessageToHost({remoteErrorResponse: remoteErrorResponse});
  }
}
