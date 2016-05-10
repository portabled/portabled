function createFrame() {
  var iframe = document.createElement('iframe');
  (<any>iframe).application='yes'; // MHTA trusted
  (<any>iframe).__knownFrame = true;
  iframe.style.cssText = 'position:absolute; left:0; top:0; width:100%; height:100%; border:none;display:none;padding:0px;margin:0px;';
  iframe.src = 'about:blank';
  iframe.frameBorder = '0';
  document.body.appendChild(iframe);

  var ifrwin = iframe.contentWindow;
  if (!ifrwin) {
    // IE567 - try to make it behave
    try { (<any>iframe).contentWindow = ifrwin = (<any>iframe).window; }
    catch (err) { }
  }

  var ifrdoc = ifrwin.document;

  if (ifrdoc.open) ifrdoc.open();
  ifrdoc.write(
    '<'+'!doctype html><' + 'html><' + 'head><' + 'style>' +
    'html{margin:0;padding:0;border:none;height:100%;border:none;overflow:hidden;}' +
    'body{margin:0;padding:0;border:none;height:100%;border:none;overflow:hidden;}' +
    '*,*:before,*:after{box-sizing:inherit;}' +
    'html{box-sizing:border-box;}' +
    '</' + 'style><' + 'body>'+
    '<' + 'body></' + 'html>');
  if (ifrdoc.close) ifrdoc.close();

  fitFrameList.push(iframe);

  return iframe;
} // createFrame
