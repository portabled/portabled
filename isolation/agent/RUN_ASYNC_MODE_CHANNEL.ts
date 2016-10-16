function RUN_ASYNC_CHANNEL(driveSnapshot: any) {
  self_onmessage = ASYNC_CHANNEL_webworker_onmessage;

  var pushMessageDispatcher = createPushMessageDispatcher();
  var requestResponseDispatcher = createRequestResponseDispatcher();

  var drive = {
    timestamp: driveSnapshot.timestamp,
    files: files_ASYNC_CHANNEL,
    read: read_ASYNC_CHANNEL,
    write: write_ASYNC_CHANNEL,
    storedSize: storedSize_ASYNC_CHANNEL
  };

  var tmDrive = {
    timestamp: driveSnapshot.timestamp,
    write: driveUpdate_write_ASYNC_CHANNEL
  };

  connection_to_parent = {
    drive: drive,
    onPushMessage: pushMessageDispatcher.onPushMessage,
    invokeAsync: invokeAsync_ASYNC_CHANNEL
  };

  install_console_redirect(postMessageToHost, cmpSer.serialize);


  function invokeAsync_ASYNC_CHANNEL(msg: any, callback: (error: Error, result: any) => void) {
    var msg_ser = cmpSer.serialize(msg);
    if (callback) {
      var key = requestResponseDispatcher.pushCallback(callback);
      postMessageToHost({ invokeAsync: { key: key, msg: msg_ser } });
    }
    else {
      postMessageToHost({ invokeAsync: { msg: msg_ser } });
    }
  }

  function ASYNC_CHANNEL_webworker_onmessage(e) {
    if (e.data.asyncResponse) {
      handleAsyncResponse_ASYNC_CHANNEL(e.data.asyncResponse);
    }
    else if (e.data.remoteEval) {
      handleRemoteEval_EITHER_CHANNEL(e.data.remoteEval);
    }
    else if (e.data.pushMessage) {
      pushMessageDispatcher.handlePushMessage(e.data.pushMessage);
    }
    else if (e.data.driveUpdates) {
      handleDriveUpdates_ASYNC_CHANNEL(e.data.driveUpdates);
    }
    else {
      reportUnknownMessage_ASYNC_CHANNEL(e);
    }
  }

  function handleAsyncResponse_ASYNC_CHANNEL(asyncResponse) {
    if (!asyncResponse.key) {
      reportKeylessResponse(asyncResponse);
      return;
    }

    var callback = requestResponseDispatcher.popCallback(asyncResponse.key);
    callback(asyncResponse.error && cmpSer.serialize(asyncResponse.error), asyncResponse.result);
  }


  function handleDriveUpdates_ASYNC_CHANNEL(driveUpdates) {
    driveSnapshot.timestamp = Math.max(driveSnapshot.timestamp, driveUpdates.timestamp);
    driveApplyUpdates(tmDrive, driveUpdates);
  }

  function reportUnknownMessage_ASYNC_CHANNEL(e) {
    if (_console_log)
      _console_log('onmessage: unknown in ASYNC_CHANNEL: ', e.data, e);
  }

  function driveUpdate_write_ASYNC_CHANNEL(file: string, content: any) {
    if (content || typeof content === 'string')
      driveSnapshot[file] = content;
    else
      delete driveSnapshot[file];
  }

  function reportKeylessResponse(asyncResponse) {
    if (_console_log)
      _console_log('onmessage: asyncResponse with no key: ', asyncResponse);
  }


  function createDriveFromSnapshot(snapshot: any) {

    var tmDrive = {
      timestamp: drive.timestamp,
      write: (file: string, content) => {
        drive.timestamp = Math.max(drive.timestamp, tmDrive.timestamp);
        if (content || typeof content === 'string')
          driveSnapshot[file] = content;
        else
          delete driveSnapshot[file];
      }
    };

    return drive;
  }

  function files_ASYNC_CHANNEL(): string[] {
    var result: string[] = [];
    for (var k in driveSnapshot) {
      if (k && k.charCodeAt(0)===47) result.push(k);
    }
    return result;
  }

  function read_ASYNC_CHANNEL(file: string): string {
    var result = driveSnapshot[file];
    if (result || typeof result!=='undefined') return result;
    else return null;
  }

  function write_ASYNC_CHANNEL(file: string, content) {
    var msg:DriveUpdateMessage;
    if (!content && (content===null || typeof content==='undefined')) {
      delete driveSnapshot[file];
      msg = {driveUpdates: [ {deleteFile: file} ], timestamp: drive.timestamp};
    }
    else {
      driveSnapshot[file] = content;
      msg = {driveUpdates:[ {updateFile: file, content: content} ], timestamp: drive.timestamp};
    }
    postMessageToHost(msg);
  }

  function storedSize_ASYNC_CHANNEL(file: string): number {
    var file = read_ASYNC_CHANNEL(file);
    if (file) return file.length;
    else return 0;
  }

}
