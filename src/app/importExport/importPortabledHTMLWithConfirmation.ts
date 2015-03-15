module portabled.app.importExport {

  export function importPortabledHTMLWithConfirmation(drive: persistence.Drive) {

    importExport.loadFile(
      (fileReader: FileReader, file: File) => fileReader.readAsText(file),
      (data, file: File) => {
        var parseHOST = document.createElement('div');
        parseHOST.innerHTML = data;
        var fileTreeHost = parseHOST.getElementsByClassName('portabled-file-tree')[0];
        if (!fileTreeHost) {
          alert('Incorrect format detected.');
          return;
        }

        var importedFiles = importChildren(<any>fileTreeHost, drive);

        var folder = prompt(
          'Add ' + importedFiles.length + ' files from portabled HTML to a virtual folder:',
          '/');

        if (!folder)
          return;

        if (folder.charAt(0) !== '/')
          folder = '/' + folder;
        if (folder.charAt(folder.length - 1) !== '/')
          folder = folder + '/';

        drive.timestamp = dateNow();
        for (var i = 0; i < importedFiles.length; i++) {
          var normFilename = files.normalizePath(folder + '/' + importedFiles[i].path);
          drive.write(normFilename, importedFiles[i].content);
        }

      });
    
    function importChildren(parent: HTMLElement, drive: persistence.Drive) {
      var fileElements = parent.getElementsByClassName('portabled-file');
      var allFiles: { path: string; content: string; }[] = [];
      for (var i = 0; i < fileElements.length; i++) {
        var f = importFileElement(parent, <any>fileElements[i], drive);
        if (f)
          allFiles.push(f);
      }
      return allFiles;
    }
    
    function importFileElement(rootHost: HTMLElement, fileElement: HTMLElement, dive: persistence.Drive) {
      var parentPath = computeParentPath(rootHost, fileElement);

      var contentElement: HTMLElement = <any>fileElement.getElementsByClassName('portabled-file-content')[0];
      if (!contentElement)
        return null;
      var content = files.readNodeFileContent(contentElement);

      var filenameElement: HTMLElement = <any>fileElement.getElementsByClassName('portabled-file-name')[0];
      if (!filenameElement)
        return null;
      var filename = filenameElement.textContent || filenameElement.innerText;
      var path = (parentPath.charAt(parentPath.length-1) === '/' ? parentPath :  parentPath + '/') + filename;
      
      return { path, content };
    }

    function computeParentPath(rootHost: HTMLElement, fileElement: HTMLElement): string {
      var dirs: string[] = [];
      var current = fileElement;
      while (current.parentElement !== null && current.parentElement !== rootHost) {
        var current = current.parentElement;
        if (current.className.indexOf('portabled-dir')>=0) {
          var nameSpan: HTMLElement = <any>current.getElementsByClassName('portabled-dir-name')[0];
          if (nameSpan)
            dirs.push(nameSpan.textContent || nameSpan.innerText);
        }
      }

      return '/' + dirs.join('/');
    }
  }
}