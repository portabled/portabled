var buildTime: number;

function start(complete: () => string) {
  var drive = require('nodrive');
  var parentWin = require('nowindow');
  var getBootState = () => require('bootState');

  // TODO: shouldn't try to get to top window I suspect?
  var topWindow = parentWin;
  while (true) {
    try {
      var newParent = topWindow.parent;
      if (!newParent || newParent === topWindow) break;

      // these may fail across embedded domain boundaries
      var accessTitle = newParent.document.title;
      var accessLocationHash = newParent.location.hash;

      topWindow = topWindow.parent;
    }
    catch (errorAccess) {
      break;
    }
  }

  var commander = new CommanderShell(topWindow, document.body, drive, getBootState, complete);

  serveFS(topWindow, drive);
}