function serveFS(window: Window, drive: persistence.Drive) {

  if (window.addEventListener) {
    window.addEventListener('message', onMessage, true);
  }
  else if ((<any>window).attachEvent) {
    (<any>window).attachEvent('onmessage', onMessage);
  }

  function onMessage(evt: MessageEvent) {
    if (!evt || !evt.data || !evt.data.requestFS || !evt.source) return;
    var data = evt.data;
    data.requestFS.content = drive.read(data.requestFS.path);
    evt.source.postMessage(data, '*');
  }

}