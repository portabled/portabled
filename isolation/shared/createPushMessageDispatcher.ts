function createPushMessageDispatcher() {

  var registeredPushMessageCallbacks: {(msg: any);}[] = [];
  var registeredPushMessageCallbacks_length = 0;

  return {
    handlePushMessage: handlePushMessage_pushMessageDispatcher,
    onPushMessage: onPushMessage_pushMessageDispatcher
  };

  function handlePushMessage_pushMessageDispatcher(pushMessage) {
    for (var i = 0; i < registeredPushMessageCallbacks_length; i++) {
      var cb = registeredPushMessageCallbacks[i];
      if (cb)
        cb(pushMessage);
    }
  }

  function onPushMessage_pushMessageDispatcher(callback: (msg: any) => void): () => void {
    var index = registeredPushMessageCallbacks_length;
    registeredPushMessageCallbacks.push(callback);
    registeredPushMessageCallbacks_length++;

    return unregister_pushMessageCallback;

    function unregister_pushMessageCallback() {
      if (index<0) return;
      delete registeredPushMessageCallbacks[index];
      index = -1;

      // adjust the tail (removal of callbacks may run out of order)
      var newLength = registeredPushMessageCallbacks_length;
      while(!registeredPushMessageCallbacks[newLength] && newLength>=0) {
        newLength--;
      }

      if (newLength!==registeredPushMessageCallbacks_length)
        registeredPushMessageCallbacks_length = newLength;
    }
  }
}
