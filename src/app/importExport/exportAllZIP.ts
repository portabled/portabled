module portabled.app.importExport {

  export function exportAllZIP(drive: persistence.Drive) {
    zip.useWebWorkers = false;
    var filename = saveFileName();
    if (filename.length > '.html'.length && filename.slice(filename.length - '.html'.length).toLowerCase() === '.html')
      filename = filename.slice(0, filename.length - '.html'.length);
    else if (filename.length > '.htm'.length && filename.slice(filename.length - '.htm'.length).toLowerCase() === '.htm')
      filename = filename.slice(0, filename.length - '.htm'.length);
    filename += '.zip';

    var blobWriter = new zip.BlobWriter('application/octet-binary');
    zip.createWriter(blobWriter, (zipWriter) => {

      var files = drive.files();
      var completedCount = 0;

    var zipDIV = document.createElement('div');
    zipDIV.style.position = 'fixed';
    zipDIV.style.left = '25%'; zipDIV.style.top = '45%';
    zipDIV.style.height = 'auto';
    zipDIV.style.width = '50%';
    zipDIV.style.background = 'silver';
    zipDIV.style.border = 'solid 2px gray';
    zipDIV.style.zIndex = '1000000';
    zipDIV.style.padding = '1em';
    setTextContent(zipDIV, 'ZIP ' + files.length + ' files...');
    document.body.appendChild(zipDIV);

    var zipwritingCompleted = () => {
        zipWriter.close((blob: Blob) => {
          var url = URL.createObjectURL(blob);
          if (typeof console !== 'undefined' && typeof console.log === 'function') {
            console.log('Preparing to save the ZIP [' + blob.size + '] ', blob, url);
          }

          setTextContent(zipDIV, 'ZIP of ' + files.length + ' files, ' + blob.size + ' bytes');
          zipDIV.appendChild(document.createElement('br'));
          var a = document.createElement('a');
          setTextContent(a, 'Save');
          a.href = url;
          a.setAttribute('download', filename);

          zipDIV.appendChild(a);

          a.onclick = () => document.body.removeChild(zipDIV);
        });
      };

      var lastDelay = dateNow();
      var callbackNest = 0;

      var continueWriter = () => {
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

        if (typeof console !== 'undefined' && typeof console.log === 'function') {
          setTextContent(zipDIV, 'ZIP ' + files.length + ' files: ' + zipRelativePath + ' [' + content.length + '] ' + (completedCount + 1) + '/' + files.length + '...');
          console.log(zipRelativePath + ' [' + content.length + '] (' + (completedCount + 1) + ' of ' + files.length + ')...');
        }

        zipWriter.add(zipRelativePath, new zip.TextReader(content), () => {
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
}