module teapo.app.appRoot.importExport { 

  export function loadFile(
    requestLoad: (fileReader: FileReader, file: File) => void,
    processData: (data: any, file: File) => void) {
    var input = document.createElement('input');
    input.type = 'file';

    input.onchange = () => {
      if (!input.files || !input.files.length) return;

      var fileReader = new FileReader();
      fileReader.onerror = (error) => {
        alert('read ' + error.message);
      };
      fileReader.onloadend = () => {
        if (fileReader.readyState !== 2) {
          alert('read ' + fileReader.readyState + fileReader.error);
          return;
        }

        processData(fileReader.result, input.files[0]);
      };

      requestLoad(fileReader, input.files[0]);
    };

    input.click();
  }
}