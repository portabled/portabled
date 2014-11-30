module portabled.app.appRoot.importExport {

  export function exportAllZIP(drive: persistence.Drive) {
    zip.useWebWorkers = false;
    var filename = saveFileName();
    if (filename.length > '.html'.length && filename.slice(filename.length - '.html'.length).toLowerCase() === '.html')
      filename = filename.slice(0, filename.length - '.html'.length);
    else if (filename.length > '.htm'.length && filename.slice(filename.length - '.htm'.length).toLowerCase() === '.htm')
      filename = filename.slice(0, filename.length - '.htm'.length);
    filename += '.zip';

    var blobWriter = new zip.BlobWriter();
    zip.createWriter(blobWriter, (zipWriter) => {

      var files = drive.files();
      var completedCount = 0;

      var zipwritingCompleted = () => {
        zipWriter.close((blob) => {
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.setAttribute('download', filename);
          a.click();
        });
      };

      var continueWriter = () => {
        if (completedCount === files.length) {
          zipwritingCompleted();
          return;
        }

        var content = drive.read(files[completedCount]);

        var zipRelativePath = files[completedCount].slice(1);

        zipWriter.add(zipRelativePath, new zip.TextReader(content), () => {
          completedCount++;

          setTimeout(continueWriter, 1);
        });
      };

      continueWriter();
    });
  }
  
}