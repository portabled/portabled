function serveFS(window: Window, drive: persistence.Drive) {

  if (window.addEventListener) {
    window.addEventListener('message', onMessage, true);
  }
  else if ((<any>window).attachEvent) {
    (<any>window).attachEvent('onmessage', onMessage);
  }

  function onMessage(evt: MessageEvent) {
    if (!evt || !evt.data || !evt.data.requestFS // detect 'our' messages
        || evt.data.requestFS.content) // ignore responses that somehow roundtripped back
      return;

    var source = evt.source;

    if (!source) { // sometimes there is excessive restriction, let's try to break through anyway
      try {
        source = window.parent;
        if (!source || source === window) return;
      }
      catch (error) {
        return;
      }
    }

    var data = evt.data;
    data.requestFS.content = drive.read(data.requestFS.path);
    source.postMessage(data, '*');
  }

}