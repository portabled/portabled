function expectMessage_init_worker_connect(callback: (init_worker_connect: any) => void) {
  self_onmessage = (e) => {
    if (e.data.init_worker_connect) {
      self_onmessage = null;
      callback(e.data.init_worker_connect);
    }
    else {
      reportUnknownMessage_expecting_init_worker_connect(e);
    }
  };

  function reportUnknownMessage_expecting_init_worker_connect(e) {
    if (_console_log)
      _console_log('onmessage: unknown expecting init_worker_connect: ', e.data, e);
  }
}
