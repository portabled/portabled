module portabled.app.appRoot.importExport {
  
  export function exportAllHTML() { 
    var filename = saveFileName();
    exportBlob(filename, ['<!doctype html>\n', document.documentElement.outerHTML]);
  }
  
}