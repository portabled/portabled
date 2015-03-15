module portabled.app.importExport {

  export function commitToGitHub() {

    
    
    var filename = saveFileName();
    exportBlob(filename, ['<!doctype html>\n', document.documentElement.outerHTML]);
  }

}