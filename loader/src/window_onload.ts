function window_onload() {

  function onfinishloading(loadedDrive) {
    drive = loadedDrive;
    if (typeof loader!=='undefined' && loader) loader.drive = loadedDrive;

    updateBootStateProps();
    bootState.read = function(file) { return drive.read(file); };
    keepDomNodesUntilBootComplete = [];
    domNodeCallbacks = [];

    timings.driveLoaded = +new Date();
    if (loadedCallbacks && loadedCallbacks.length) {
      if (document.title==='/:' || document.title==='/:.' || document.title==='//') document.title = '//.';
      for (var i = 0; i < loadedCallbacks.length; i++) {
        var callback = loadedCallbacks[i];
        callback(drive);
      }
    }
    else {
      if (document.title==='/:' || document.title==='/:.' || document.title==='//') document.title = '//,';
      fadeToUI();
    }
  }

  clearInterval(keepLoading);

  removeSpyElements();

  timings.documentLoaded = +new Date();

  sz.update();

  bootDrive.finishParsing(onfinishloading);

}