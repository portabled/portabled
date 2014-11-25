module teapo.app.appRoot.importExport { 


  export function exportBlob(filename: string, textChunks: string[]) { 
    var blob: Blob = new (<any>Blob)(textChunks, { type: 'application/octet-stream' });
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

}