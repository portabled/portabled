function trySetupSyncMode(fs) {

  var cookieFilename = generateCookieFilename();

  pollForFile_or_expectMessage_requestInitSync_reject({
    file: cookieFilename,
    when_OK: function(msg) {
      postMessageToHost({requestInitSync_completed: 'done'});
      return RUN_SYNCFS_AIDED_CHANNEL(fs, msg);
    },
    when_requestInitSync_reject: function(driveSnapshot) {
      return RUN_ASYNC_CHANNEL(driveSnapshot);
    },
    when_timeout: function() {
      return requestAsyncMode('wait for cookie file timed out: '+cookieFilename);
    }
  });

  function generateCookieFilename() {
    var fn = 'T'+(+new Date())+'R'+Math.random().toString().replace(/\./g, '');
    return fn;
  }

  function pollForFile_or_expectMessage_requestInitSync_reject(
  	opts: {
      file: string;
      when_OK: (msg: any) => void;
      when_requestInitSync_reject: (driveSnapshot: any) => void;
      when_timeout: () => void;
    }) {

    var cookieFilename = opts.file;
    var timeoutAfter = +new Date() + 1000 *88888; // TODO: DEBUGDEBUG
    self_onmessage = requestInitSync_onmessage;
    var pollFS = _setInterval(setInterval_pollFS, 5);
    postMessageToHost({requestInitSync: opts.file});

    function setInterval_pollFS() {
      var response = getFileSync(fs, cookieFilename);
      if (response) {
        var response_msg = _JSON_parse(response);
        _clearInterval(pollFS);
        opts.when_OK(response_msg);
        return;
      }

      var now = Date.now ? Date.now() : +new Date();
      if (now>timeoutAfter) {
        _clearInterval(pollFS);
        opts.when_timeout();
        return;
      }
    }

    function requestInitSync_onmessage(e) {
      if (e.data.requestInitSync_reject) {
        _clearInterval(pollFS);
        self_onmessage = null;
        var driveSnapshot = e.data.requestInitSync_reject;
        opts.when_requestInitSync_reject(driveSnapshot);
      }
      else {
        reportUnexpectedMessage_whenPolling_syncFS(e);
      }
    }
  }

	function reportUnexpectedMessage_whenPolling_syncFS(e) {
    if (_console_log)
      _console_log('onmessage: unknown when polling for SYNCFS_AIDED_CHANNEL: ', e.data, e);
  }

}

function getFileSync(fs, fname: string) {
  try {
    /*
    var found = true;
    var entries = fs.root.createReader().readEntries();
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].name===fname) {
        found = true;
        break;
      }
    }
    if (!found) return;
    */

    var fentry = fs.root.getFile('/isolation-syncfs-aided--'+fname, {create: false});
    var file = fentry.file();
    var reader = new _FileReaderSync();
    var text = reader.readAsText(file);
    if (!text) {
      return null;
    }

    try {
      // MDN and W3C are ambiguous?
      if (typeof fentry.remove==='function')
        fentry.remove();
      else if (typeof file.remove==='function')
        file.remove();
    }
    catch (error) {
    }

    return text;
  }
  catch (err) {
  }
}
