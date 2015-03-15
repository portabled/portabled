module portabled.app.importExport {

  export function importZIPWithConfirmation(drive: persistence.Drive) {

    importExport.loadFile(
      (fileReader: FileReader, file: File) => fileReader.readAsArrayBuffer(file),
      (data, file: File) => {

        zip.useWebWorkers = false;
        zip.createReader(
          new zip.BlobReader(file),
          reader => {
            reader.getEntries(entries => {

              var folder = prompt(
                'Add ' + entries.length + ' files from zip to a virtual folder:',
                '/');

              if (!folder)
                return;

              if (folder.charAt(0) !== '/')
                folder = '/' + folder;
              if (folder.charAt(folder.length - 1) !== '/')
                folder = folder + '/';

              var completeCount = 0;
              var overwriteCount = 0;

              var processEntry = () => {

                if (completeCount === entries.length) {
                  alert(
                    completeCount + ' imported into ' + folder +
                    (overwriteCount ? ', ' + overwriteCount + ' existing files overwritten' : ''));
                  return;
                }

                var entry = entries[completeCount];

                if (entry.directory) {
                  completeCount++;
                  processEntry();
                  return;
                }

                var writer = new zip.TextWriter();

                entry.getData(writer,(text) => {
                  var virtFilename = folder + entry.filename;
                  var normFileName = files.normalizePath(virtFilename);

                  var isOverwrite = false;

                  var fileEntry = drive.read(normFileName);
                  if (fileEntry)
                    isOverwrite = true;

                  drive.write(normFileName, text);

                  if (isOverwrite)
                    overwriteCount++;

                  completeCount++;
                  setTimeout(() => processEntry(), 1);

                });
              };

              processEntry();

            });
          },
          error => {
            alert('Zip file error: ' + error);
          });

      });

  }
}