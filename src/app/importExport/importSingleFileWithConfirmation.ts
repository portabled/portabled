module portabled.app.importExport { 

  export function importSingleFileWithConfirmation(
    requestLoad: (fileReader: FileReader, file: File) => void,
    read: (file: string) => string,
    write: (file: string, text: string) => void,
    convertText: (raw: string) => string) {

      importExport.loadFile(
        requestLoad,
        (data, file) => {
          var saveNamePromptMessage;
          var existingRaw = read(files.normalizePath(file.name));
          var existing = convertText ? convertText(existingRaw) : existingRaw;
          if (existing) {
            if (existing === data) {
              saveNamePromptMessage =
                file.name + ' already exists ' +
                'with that same content ' +
                '(' + data.length + ' character' + (data.length === 1 ? '' : 's') + ')' +
                '\n' +
                'Provide path or cancel:';
            }
            else {
              saveNamePromptMessage =
                file.name + ' already exists ' +
                'with that different content ' +
                '(' + data.length + ' character' + (data.length === 1 ? '' : 's') + 
                ' comparing to ' + existing.length+' in the existing)' +
                '\n' +
                'Provide path or cancel:';
            }
          }
          else {
            saveNamePromptMessage =
             file.name+' loaded '+data.length+' character' + (data.length === 1 ? '' : 's')+
              '\n' +
              'Provide path or cancel:';
          }
          
          var saveName = prompt(saveNamePromptMessage, file.name);
          if (!saveName)
            return;

          saveName = files.normalizePath(saveName);

          write(saveName, convertText ? convertText(data) : data);

        });

  }
}