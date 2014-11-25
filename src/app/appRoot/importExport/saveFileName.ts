module teapo.app.appRoot.importExport {
  
  export function saveFileName() {

    if (window.location.protocol.toLowerCase() === 'blob:')
      return 'nteapo.html';

    var urlParts = window.location.pathname.split('/');
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