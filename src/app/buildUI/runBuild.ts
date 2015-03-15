module portabled.app.buildUI {
  
  export function runBuild(file: string, drive: persistence.Drive) {
    
    var resolvedFile = files.normalizePath(file) || '';
    var template: string;

    if (/\.htm(l?)$/g.test(resolvedFile)) {
      template = drive.read(resolvedFile);
    }
    else {
      while (true) {
        var slashPos = resolvedFile.lastIndexOf('/');
        if (slashPos < 0) break;

        resolvedFile = resolvedFile.slice(0, slashPos);
        var testFile;
        if ((template = drive.read(testFile = resolvedFile + '/index.html'))
          || (template = drive.read(testFile = resolvedFile + '/index.htm'))) {
          resolvedFile = testFile;
          break;
        }
      }
    }
    
    if (!template) {
      // cannot find HTML template
      alert('Cannot build ' + file);
      return;
    }

    var blankWindow = window.open('', '_blank' + dateNow());

    var pollUntil = dateNow() + 1000;

    while (dateNow() < pollUntil) {
      try {
        var blankWindowDoc = blankWindow.document;
      }
      catch (error) { }
    }

    if (!blankWindowDoc) {
      alert('Cannot open a window to host the built document');
      return;
    }

    blankWindow.document.open();
    blankWindow.document.write([
      '<html><title>Building ' + resolvedFile + '...</title>',
      '<style>',
      'html, body { background: black; color: green; }',
      'h2 { font-weight: 100; width: 40%; position: fixed; font-size: 200%; }',
      'pre { width: 50%; padding-left: 50%; opacity: 1; transition: opacity 1s; }',
      '</style>',
      '<h2>Building ' + resolvedFile + '</h2>',
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

    build.processTemplate(
      template, [build.functions],
      logText => (<any>blankWindow).log(logText),
      (error, processed) => {

        if (error) {
          var errorElem = blankWindow.document.createElement('pre');
          errorElem.style.fontWeight = 'bold';
          setTextContent(errorElem, error + '\n' + error.message + ' ' + (<any>error).stack);
          blankWindow.document.body.appendChild(errorElem);
          errorElem.scrollIntoView();

          if (processed) {
            var showResultButton = blankWindow.document.createElement('button');
            setTextContent(showResultButton, ' Show results ');
            showResultButton.onclick = showProcessed;
            blankWindow.document.body.appendChild(showResultButton);
            showResultButton.scrollIntoView();
          }
          return;
        }

        showProcessed();

        function showProcessed() {

          try {

            var blob = new Blob([processed], { type: 'text/html' });
            var url = URL.createObjectURL(blob);
            blankWindow.location.replace(url);

          }
          catch (blobError) {
            blankWindow.document.open();
            blankWindow.document.write(processed);
            blankWindow.document.close();
          }
        }
      });
    
  }
  
}