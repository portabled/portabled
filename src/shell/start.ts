module portabled.shell {

  export function start() {

    addEventListener(window, 'load', () => {
      var co = new consoleUI.ConsoleUI(document.body);
      var pan = new panels.Panels(document.body);
    });
  }

}