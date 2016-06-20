function requestAsyncMode(fs_reason: string) {

  self_onmessage = expect_driveSnapshot_thenStart_ASYNC_CHANNEL;

  postMessageToHost({requestInitAsync: fs_reason});

  function expect_driveSnapshot_thenStart_ASYNC_CHANNEL(e) {
    if (e.data.driveSnapshot) {
      RUN_ASYNC_CHANNEL(e.data.driveSnapshot);
    }
    else {
      report_unexpectedMessage_whenExpecting_driveSnapshot(e);
    }
  }

  function report_unexpectedMessage_whenExpecting_driveSnapshot(e) {
    if (_console_log)
      _console_log('onmessage: unknown expecting driveSnapshot for ASYNC_CHANNEL: ', e.data, e);
  }
}
