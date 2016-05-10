namespace actions {

  export function save() {

    var window = require('nowindow');
    var document = window.document;
    var textChunks: string[] = ['<!doctype html>\n', document.documentElement.outerHTML];

    var totalSize = 0;
    for (var i = 0; i < textChunks.length; i++) totalSize += textChunks[i].length;

    var filename = saveFileName();

    if (typeof Blob==='function'
        && typeof URL!=='undefined' && typeof URL.createObjectURL==='function') {
    	exportBlob(filename, textChunks);
    }
    else {
      exportDocumentWrite(filename, textChunks.join(''));
    }

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
    			console.log('saved ' + totalSize+' using Blob and A/dispatchEvent/click');
        }
        catch (e) {
          a.click();
    			console.log('saved ' + totalSize+' using Blob and A/click');
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
    			console.log('saved ' + totalSize+' using document.write and execCommand');
        }, 200);

      }

    function saveFileName() {

        if (window.location.protocol.toLowerCase() === 'blob:')
          return 'index.html';

        var urlParts = window.location.pathname.split('/');
        var currentFileName = decodeURI(urlParts[urlParts.length - 1]);
        var lastDot = currentFileName.indexOf('.');
        if (lastDot > 0) {
          currentFileName = (currentFileName.slice(0, lastDot) || 'index') + '.html';
        }
        else {
          currentFileName += '.html';
        }
      	if (currentFileName==='.html') currentFileName = 'index.html';
        return currentFileName;
      }
  }
}