var self_onmessage;

function addMessageEventListener() {
  _addEventListener('message', (e) => {

    if (!self_onmessage) {
      if (_console_log)
        _console_log('onmessage: self_onmessage is null: ', e.data, e); // but let it throw too
    }

    self_onmessage(e);
  }, true);
}
