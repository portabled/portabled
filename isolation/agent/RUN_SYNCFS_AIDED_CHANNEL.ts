function RUN_SYNCFS_AIDED_CHANNEL(fs, msg) {

  var cookieBaseDate = +new Date();

  self_onmessage = SYNCFS_AIDED_CHANNEL_webworker_onmessage;
  var pushMessageDispatcher = createPushMessageDispatcher();
  var requestResponseDispatcher = createRequestResponseDispatcher();

  var drive = {
    timestamp: msg.driveTimestamp,
    files: files_SYNCFS_AIDED_CHANNEL,
    read: read_SYNCFS_AIDED_CHANNEL,
    write: write_SYNCFS_AIDED_CHANNEL,
    storedSize: storedSize_SYNCFS_AIDED_CHANNEL
  };

  connection_to_parent = {
    drive: drive,
    onPushMessage: pushMessageDispatcher.onPushMessage,
    invokeAsync: invokeAsync_SYNCFS_AIDED_CHANNEL,
    invokeSync: invokeSync_SYNCFS_AIDED_CHANNEL
  };

  install_console_redirect(postMessageToHost, cmpSer.serialize);

  function SYNCFS_AIDED_CHANNEL_webworker_onmessage(e) {
    if (e.data.asyncResponse) {
      handleAsyncResponse_SYNCFS_AIDED_CHANNEL(e.data.asyncResponse);
    }
    else if (e.data.remoteEval) {
      handleRemoteEval_EITHER_CHANNEL(e.data.remoteEval);
    }
    else if (e.data.pushMessage) {
      pushMessageDispatcher.handlePushMessage(e.data.pushMessage);
    }
    else if (e.data.driveUpdates) {
      handleDriveUpdates_SYNCFS_AIDED_CHANNEL(e.data.driveUpdates);
    }
    else {
      reportUnknownMessage_SYNCFS_AIDED_CHANNEL(e);
    }
  }

  function handleAsyncResponse_SYNCFS_AIDED_CHANNEL(asyncResponse) {
    if (!asyncResponse.key) {
      reportKeylessResponse(asyncResponse);
      return;
    }

    var callback = requestResponseDispatcher.popCallback(asyncResponse.key);
    callback(asyncResponse.error && cmpSer.serialize(asyncResponse.error), asyncResponse.result);
  }

  function handleDriveUpdates_SYNCFS_AIDED_CHANNEL(driveUpdates) {
    // TODO: support drive watch
  }

  function reportUnknownMessage_SYNCFS_AIDED_CHANNEL(e) {
    if (_console_log)
      _console_log('onmessage: unknown in SYNCFS_AIDED_CHANNEL: ', e.data, e);
  }

  function files_SYNCFS_AIDED_CHANNEL() {
    var cookieFilename = generateCookieFilename('drive_files_');
    var files_response = postMessageWaitForResponse({driveRequest_files: cookieFilename}, cookieFilename, 'drive.files_');
    return files_response;
  }

  function read_SYNCFS_AIDED_CHANNEL(file: string) {
    var cookieFilename = generateCookieFilename('drive_read_');
    var read_response = postMessageWaitForResponse({driveRequest_read: { key: cookieFilename, file: file } }, cookieFilename, 'drive.read_');
    return read_response;
  }

  function write_SYNCFS_AIDED_CHANNEL(file: string, content: any) {
    var msg:DriveUpdateMessage;
    if (!content && (content===null || typeof content==='undefined')) {
      msg = {driveUpdates: [ {deleteFile: file} ], timestamp: drive.timestamp};
    }
    else {
      msg = {driveUpdates:[ {updateFile: file, content: content} ], timestamp: drive.timestamp};
    }
    postMessageToHost(msg);
  }

  function storedSize_SYNCFS_AIDED_CHANNEL(file: string) {
    var cookieFilename = generateCookieFilename('drive_storedSize_');
    var storedSize_response = postMessageWaitForResponse({driveRequest_storedSize: { key: cookieFilename, file: file }}, cookieFilename, 'drive.storedSize_');
    return storedSize_response;
  }

  function reportKeylessResponse(asyncResponse) {
    if (_console_log)
      _console_log('onmessage: asyncResponse with no key: ', asyncResponse);
  }

  function invokeAsync_SYNCFS_AIDED_CHANNEL(msg: any, callback: (error: Error, result: any) => void) {
    var msg_ser = cmpSer.serialize(msg);
    if (callback) {
      var key = requestResponseDispatcher.pushCallback(callback);
      postMessageToHost({ invokeAsync: { key: key, msg: msg_ser } });
    }
    else {
      postMessageToHost({ invokeAsync: { msg: msg_ser } });
    }
  }

  function invokeSync_SYNCFS_AIDED_CHANNEL(msg: any): any {
    var cookieFilename = generateCookieFilename('invokeSync_');
    var invokeSync_response = postMessageWaitForResponse({invokeSync: { key: cookieFilename, msg: msg }}, cookieFilename, 'invokeSync_');


    if (invokeSync_response.error) {
      var toThrow = cmpSer.deserialize(invokeSync_response.error);
      throw toThrow;
    }

    return invokeSync_response.response;
  }

  function postMessageWaitForResponse(msg: any, cookieFile: string, idle_sping_reason: string) {
    postMessageToHost(msg);
    var parseFailAfter;
    while (true) {
      var content = getFileSync(fs, cookieFile);
      if (content) {

        var now = Date.now ? Date.now() : + new Date();
        if (parseFailAfter) {
          if (now>parseFailAfter) {
            var result = _JSON_parse(content);
            return result;
          }
        }

        try {
          var result = _JSON_parse(content);
          return result;
        }
        catch (error) {
          if (!parseFailAfter)
            parseFailAfter = now + 3000; // 3 seconds to complete the writing
        }
      }

      SYNCFS_idle_spin(idle_sping_reason);
    }
  }

  function generateCookieFilename(hint) {
    var fn = hint+'T'+((+new Date())-cookieBaseDate)+'R'+Math.random().toString().replace(/\./g, '');
    return fn;
  }

}
