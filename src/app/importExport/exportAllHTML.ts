module portabled.app.importExport {

  export function exportAllHTML() {
    var filename = saveFileName();
    exportBlob(filename, ['<!doctype html>\n', document.documentElement.outerHTML]);
  }

 }