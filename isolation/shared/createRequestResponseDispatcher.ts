function createRequestResponseDispatcher() {

  var diagTimeStart = +new Date();
  var requests = {count: 0};

  return {
    pushCallback: pushCallback_reqResDispatcher,
    popCallback: popCallback_reqResDispatcher
  };

  function pushCallback_reqResDispatcher(callback: Function): string {
    var key = generateKey();
    requests[key] = callback;
    return key;
  }

  function popCallback_reqResDispatcher(key: string): Function {
    if (key) {
      var callback = requests[key];
      if (callback)
        delete requests[key];
    }

    return callback;
  }

  function generateKey() {
    var key = (requests.count++).toString();

    // generate a bit of timestamp for the benefit of easier debugging
    if (Date.now) key += '-'+(Date.now()-diagTimeStart)+'ms';
    else key += '-'+(+ new Date()-diagTimeStart)+'ms';

    return key;
  }

}
