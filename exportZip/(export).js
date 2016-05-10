var fs = require('fs');
var window = require('nowindow');
var document = window.document;
var drive = require('nodrive');

var Blob = window.Blob;
var encodeURIComponent = window.encodeURIComponent;
var FileReader = window.FileReader;

var zip;

eval(fs.readFileSync('zip.js')+'\n//# '+'sourceURL=zip.js');
eval(fs.readFileSync('inflate.js')+'\n//# '+'sourceURL=inflate.js');
eval(fs.readFileSync('deflate.js')+'\n//# '+'sourceURL=deflate.js');

if (!zip)
  zip = window.zip || this.zip;

exportAllZIP();

function exportAllZIP() {
  zip.useWebWorkers = false;
  var filename = saveFileName();
  if (filename.length > '.html'.length && filename.slice(filename.length - '.html'.length).toLowerCase() === '.html')
    filename = filename.slice(0, filename.length - '.html'.length);
  else if (filename.length > '.htm'.length && filename.slice(filename.length - '.htm'.length).toLowerCase() === '.htm')
    filename = filename.slice(0, filename.length - '.htm'.length);
  filename += '.zip';

  var blobWriter = new zip.BlobWriter('application/octet-binary');
  zip.createWriter(blobWriter, function(zipWriter) {

    var files = drive.files();
    var completedCount = 0;

    console.log('ZIP ' + files.length + ' files...');

    var zipwritingCompleted = function() {
      zipWriter.close(function(blob) {
        var url = window.URL.createObjectURL(blob);
        console.log('Preparing to save the ZIP [' + blob.size + ' of '+files.length+' files] ', url);

        var a = window.loader.shell.contentWindow.document.createElement('a');
        a.href = url;
        a.setAttribute('download', filename);
        a.click();

      });
    };

    var lastDelay = +new Date();
    var callbackNest = 0;

    var continueWriter = function() {
      if (completedCount === files.length) {
        setTimeout(zipwritingCompleted, 300);
        return;
      }

      var content = drive.read(files[completedCount]);
      if (!content) {
        completedCount++;
        continueWriter();
        return;
      }

      var zipRelativePath = files[completedCount].slice(1);

      console.log('ZIP ' + files.length + ' files: ' + zipRelativePath + ' [' + content.length + '] ' + (completedCount + 1) + '/' + files.length + '...');

      zipWriter.add(zipRelativePath, new zip.TextReader(content), function () {
        completedCount++;
        if (dateNow() - lastDelay > 200 || callbackNest >20) {
          lastDelay = dateNow();
          setTimeout(continueWriter, 100);
        }
        else {
          callbackNest++;
          continueWriter();
          callbackNest--;
        }
      });
    };

    continueWriter();
  });
}

function dateNow() {
  return +new Date();
}

function saveFileName() {

  if (window.location.protocol.toLowerCase() === 'blob:')
    return 'mi.html';

  var urlParts = window.location.pathname.split('/');
  var currentFileName = window.decodeURI(urlParts[urlParts.length - 1]);
  var lastDot = currentFileName.indexOf('.');
  if (lastDot > 0) {
    currentFileName = currentFileName.slice(0, lastDot) + '.html';
  }
  else {
    currentFileName += '.html';
  }
  return currentFileName;
}