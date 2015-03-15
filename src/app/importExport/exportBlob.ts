module portabled.app.importExport {


  export function exportBlob(filename: string, textChunks: string[]) {
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
      var doc = win.document;
      doc.open();
      doc.write(content);
      doc.close();

      doc.execCommand('SaveAs', null, filename);
    }, 200);

  }
  
}