declare var require;

module shell {

  export var buildTime: number;
  export var buildMessage: string;

  export function start(complete: () => string) {
    var drive = require('nodrive');
    var parentWin = require('nowindow');

    // TODO: shouldn't try to get to top window I suspect?
    var topWindow = parentWin;
    while (topWindow.parent && topWindow.parent !== topWindow) {
      topWindow = topWindow.parent;
    }

    var commander = new CommanderShell(topWindow, document.body, drive, complete);

	}

}