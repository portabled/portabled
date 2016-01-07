namespace shell.build {

  export function spawnWindowContext(uiDoc: Document, scriptPath: string, titleText: string, drive: persistence.Drive, log: (...args: any[]) => void) {

    var blankWindow = createBlankWindow();

    var proc = new noapi.HostedProcess(
      scriptPath,
      drive,
      blankWindow);
    proc.console.log = (...args: any[]) => {
      log(args);
      (<any>blankWindow).log(args.join(' '));
    };

    return {
      noprocess: proc,
      blankWindow: blankWindow
    };


    function createBlankWindow() {
        var blankWindow = window.open('', '_blank' + (+new Date()));

        var pollUntil = (+new Date()) + 1000;

        while (+new Date() < pollUntil) {
          try {
            var blankWindowDoc = blankWindow.document;
            blankWindowDoc.title = 'External window...';
            break;
          }
          catch (error) { blankWindowDoc = null; }
        }

        if (!blankWindowDoc) {
          var ifr = uiDoc.createElement('iframe');
          ifr.style.position = 'absolute';
          ifr.style.left = ifr.style.top = '5%';
          ifr.style.width = ifr.style.height = '90%';
          ifr.src = 'about:blank';
          uiDoc.body.appendChild(ifr);
          blankWindow = ifr.contentWindow || (<any>ifr).window;


          var pollUntil = (+new Date()) + 1000;

          while (+new Date() < pollUntil) {
            try {
              var blankWindowDoc = blankWindow.document;
              blankWindowDoc.title = 'Inner frame';
              break;
            }
            catch (error) { blankWindowDoc = null; }
          }
        }

      	if (!blankWindowDoc)
          throw new Error('Cannot open a frame for hosting content.');

        blankWindow.document.open();
        blankWindow.document.write([
          '<html><title>' + titleText + '...</title>',
          '<style>',
          'html, body { background: black; color: greenyellow; }',
          'h2 { font-weight: 100; width: 40%; position: fixed; font-size: 200%; }',
          'pre { width: 50%; padding-left: 50%; opacity: 1; transition: opacity 1s; }',
          '</style>',
          '<h2>' + titleText + '</h2>',
          '<' + 's' + 'cript>',
          'var textContentProp = "textContent" in document.createElement("pre") ? "textContent" : "innerText";',
          'var lastLogElem;',
          'function log(text) {',
          '  var logElem = document.createElement("pre");',
          '  logElem[textContentProp]=text;',
          '  document.body.appendChild(logElem);',
          '  logElem.scrollIntoView();',
          '  if (lastLogElem) {',
          '    lastLogElem.style.opacity = 0.5;',
          '  }',
          '  lastLogElem = logElem;',
          '}',
          '<' + '/' + 's' + 'cript>'].join('\n'));
        blankWindow.document.close();

      return blankWindow;
    }
  }
}