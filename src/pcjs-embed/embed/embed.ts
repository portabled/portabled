declare var require;

module shell {

  function start(complete: () => string) {

    var parentWin = require('nowindow');
    var topWindow = parentWin.parent || parentWin;
    topWindow.document.title = 'Turbo PCJS (using pcjs.org by Jeff Parsons @jeffpar)';

    var screenRatio = null;

    document.body.style.color = 'gray';
    //document.body.style.overflow = 'hidden';
    //document.body.parentElement.style.overflow = 'hidden';

    var drive: persistence.Drive = require('nodrive');

    var nowin: Window = require('nowindow');
    nowin.onunload = (e) => {
      if (pcjsScope.onunload)
        return pcjsScope.onunload(e);
    };
    nowin.onbeforeunload = (e) => {
      if (pcjsScope.onbeforeunload)
        return pcjsScope.onbeforeunload(e);
    };

    var curWinMetrics;
    var resizeMod = require('resize');
    resizeMod.on(winMetrics => {
      curWinMetrics = winMetrics;
      updateSize();
    });


    var pcjsScope: any = redirectWindow(drive, window, '/cache/', '/demos/');
    pcjsScope.pcjs = pcjs;
    pcjsScope.pcjs();

    var embedPC = (<any>pcjsScope).embedPC;

    var root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);


    var rootInner = document.createElement('div');
    rootInner.id = require('uniqueKey');
    root.appendChild(rootInner);

    var emb = embedPC(
      root.id,
      //'/demos/turbo.xml',
      '/demos/turbo-ega.xml',
      //'/demos/sample1.xml',
    //'/demos/sample3a.xml',
    //'/demos/sample2.xml',
    //'/devices/pc/machine/5170/ega/1152kb/rev3/machine.xml');
      '/demos/components.xsl');

    (<any>nowin).nodrive = drive;
    //(<any>nowin).computer = comp;
    console.log('nodrive: ', drive/*, ' computer: ', comp*/);
    updateSize();
    installAutosave();
    var textar = document.getElementsByTagName('textarea')[0];
    if (textar) {
      setTimeout(() => textar.focus(), 400);
      updateSize();
    }


    if (pcjsScope.onload) {
      setTimeout(() => {
      	(<any>pcjsScope).onload();
      }, 10);
    }

    setTimeout(() => complete(), 10);

    function updateSize(width: number, height: number) {
      var width = curWinMetrics ? curWinMetrics.windowWidth :
      	(nowin.innerWidth || (nowin.document.body.parentElement ? nowin.document.body.parentElement.clientWidth : 0) || nowin.document.body.clientWidth);
      var height = curWinMetrics ? curWinMetrics.windowHeight :
      	(nowin.innerHeight || (nowin.document.body.parentElement ? nowin.document.body.parentElement.clientHeight : 0) || nowin.document.body.clientHeight);

      root = <any>document.getElementById('root');
      if (!root) return;
      root.style.overflow = 'hidden';
      var display = <HTMLDivElement>root.children[0];
      if (display) {
        var canvas = display.getElementsByTagName('canvas')[0];
        if (!canvas) return;
        var rootMachine = document.getElementById('root.machine');
        if (rootMachine) {
          rootMachine.style.maxWidth = null;
        }

        if (!screenRatio)
          screenRatio = canvas.offsetWidth / canvas.offsetHeight;

        var availableHeight = height - 40;
        var availableWidth = width - 20;
        var updateWidth, updateHeight;
        if (availableHeight * screenRatio < availableWidth) {
          updateWidth = availableHeight * screenRatio;
          updateHeight = availableHeight;
        }
        else {
          updateWidth = availableWidth;
          updateHeight = availableWidth / screenRatio;
        }

        updateWidth = ((updateWidth*10)|0) / 10;
        updateHeight = ((updateHeight*10)|0) / 10;

        /*display.style.width = updateWidth + 'px';
        display.style.height = updateHeight + 'px';
        display.style.overflow = 'hidden';*/

        canvas.style.width = updateWidth + 'px';
        canvas.style.height = updateHeight + 'px';

        if (!updateSize.linksUpdated) {
          var links = display.getElementsByTagName('a');
          for (var i = 0; i < links.length; i++) {
            var a = links[i];
            if (a.innerHTML === 'XML') {
              a.innerHTML = 'Save';
              a.href = '';
              a.onclick = (e: Event) => {
                if (e.cancelable) e.cancelBubble = true;
                if (e.preventDefault) e.preventDefault();
                save();
              };
            }
          }
          updateSize.linksUpdated = true;
        }
      }
    }

    function installAutosave() {
      return;
      setTimeout(() => {
        var root = document.getElementById('root');
        if (!root) return;
        var canv = root.getElementsByTagName('canvas')[0];
        if (!canv) return;
        var textar = root.getElementsByTagName('textarea')[0];
        if (!textar) return;

        canv.addEventListener('mousemove', () => eventDelaySave(), true);
        canv.addEventListener('touchmove', () => eventDelaySave(), true);
        textar.addEventListener('keydown', () => eventDelaySave(), true);

        try {
          var snapshot = canv.toDataURL('image/png');
        }
        catch (error) {
          return;
        }

        var _delaySave = 0;
        eventDelaySave(30 * 1000);
        console.log('Installed autosave');


        function eventDelaySave(time?: number) {
          time = time || 30 * 983;
          clearTimeout(_delaySave);
          _delaySave = setTimeout(checkStableAndSave, time);
        }

        function checkStableAndSave() {
          var newSnapshot = canv.toDataURL('image/png');
          if (newSnapshot !== snapshot) { // TODO: pass on small changes too
            snapshot = newSnapshot;
            eventDelaySave();
            console.log('Screen is not stable, continue watching...');
            return;
          }

          console.log('Saving snapshot...');
          drive.write('/splash.img', snapshot);
          // comp.powerOff(true, true);
          setTimeout(() => {
            // comp.powerOn(true);
            eventDelaySave(5 * 60 * 1000);
            console.log('Snapshot saved, continue watching...');
          }, 50);
        }

      }, 3 * 60 * 1000); // install after half a minute
    }

    function save() {
      nowin.console.log('poweroff...');
      // comp.powerOff(true, true);
      var root = document.getElementById('root');
      if (root) {
        var canv = root.getElementsByTagName('canvas')[0];
        if (canv) {
          try {
            var dt = canv.toDataURL('image/png');
            drive.write('/splash.img', dt);
          }
          catch (errorCanv) {
            console.error('Snapshot of the screen failed');
          }
        }
        root.style.opacity = '0.2';
      }

      setTimeout(() => {
        nowin.console.log('save HTML...');
        saveHTML();
        // comp.powerOn(true);
        if (root) {
          root.style.opacity = '1';
        }
      }, 5000);

      function saveHTML() {

        var filename = saveFileName();
        exportBlob(filename, ['<!doctype html>\n', nowin.document.documentElement.outerHTML]);

        function exportBlob(filename: string, textChunks: string[]) {
          try {
            var blob: Blob = new (<any>Blob)(textChunks, { type: 'application/octet-stream' });
          }
          catch (blobError) {
            exportDocumentWrite(filename, textChunks.join(''));
            return;
          }

          exportBlobHTML5(filename, blob);
        }

        function exportBlobHTML5(filename, blob: Blob) {
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.setAttribute('download', filename);
          try {
            // safer save method, supposed to work with FireFox
            var evt = document.createEvent("MouseEvents");
            (<any>evt).initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            a.dispatchEvent(evt);
          }
          catch (e) {
            a.click();
          }
        }

        function exportDocumentWrite(filename: string, content: string) {
          var win = document.createElement('iframe');
          win.style.width = '100px';
          win.style.height = '100px';
          win.style.display = 'none';
          document.body.appendChild(win);

          setTimeout(() => {
            var doc = win.contentDocument || (<any>win).document;
            doc.open();
            doc.write(content);
            doc.close();

            doc.execCommand('SaveAs', null, filename);
          }, 200);

        }

        function saveFileName() {

          if (nowin.location.protocol.toLowerCase() === 'blob:')
            return 'pcjs-app.html';

          var urlParts = nowin.location.pathname.split('/');
          var currentFileName = decodeURI(urlParts[urlParts.length - 1]);
          var lastDot = currentFileName.indexOf('.');
          if (lastDot > 0) {
            currentFileName = currentFileName.slice(0, lastDot) + '.html';
          }
          else {
            currentFileName += '.html';
          }
          return currentFileName;
        }
      }
    }
  }

  (<any>shell).start = start;

}