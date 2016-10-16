function onkeeploading() {

  if (document.title==='/:') document.title = '/:.';
  if (!timings.domStarted
      && (bootDrive.domLoadedSize || bootDrive.domTotalSize))
    timings.domStarted = +new Date();

  removeSpyElements();

  var goodTimeUpdateSize = false;
  var now = Date.now?Date.now():+new Date();
  if (!(<any>onkeeploading)._lastUpdateSize) {
    goodTimeUpdateSize = true;
  }
  else {
    if (now-(<any>onkeeploading)._lastUpdateSize>500)
      goodTimeUpdateSize = true;
  }

  if (goodTimeUpdateSize) {
    (<any>onkeeploading)._lastUpdateSize = now;
  	sz.update();
  }

  var prevLoadedSize = bootDrive.domLoadedSize;
  var prevTotalSize = bootDrive.domTotalSize;

  bootDrive.continueLoading();
  updateBootStateProps();

  if (bootDrive.newDOMFiles.length || bootDrive.newStorageFiles.length
      || prevLoadedSize !== bootDrive.domLoadedSize || prevTotalSize !== bootDrive.domTotalSize) {
    if (document.title==='/:' || document.title==='/:.') document.title = '//';

    for (var i = 0; i < progressCallbacks.length; i++) {
      var callback = progressCallbacks[i];
      callback(bootDrive);
    }
  }

}
