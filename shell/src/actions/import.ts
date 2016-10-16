namespace actions {

  export function importAction(env: ActionContext) {

    if (env.files && env.files.length) {
      return importFiles(env.files);
    }
    else {
      return importExplicitDialog();
    }

    function importFiles(fileList: FileList) {
      var outstandingDirCount = 0;
      var outstandingFileCount = 0;
      var allfiles: copyMoveImport.SourceEntry[] = [];

      processFileList('/', fileList);

      return true;

      function onFileListCompleted() {
        function ExtendContext() { }
        ExtendContext.prototype = env;
        var contextCopy: copyMoveImport.ExtendedActionContext = <any>new ExtendContext();
        contextCopy.cursorPath = allfiles.length !== 1 ? 'import' : allfiles[0].path;
        contextCopy.from = 'imported files';
        contextCopy.dirSource = false;

        contextCopy.title = 'Import (F3)';
        contextCopy.buttonText = 'Import';
        contextCopy.sourceFiles = allfiles;
        contextCopy.virtualSource = true;
        contextCopy.targetPanelPath = contextCopy.currentPanelPath;

        copyMoveImport(contextCopy);
      }

      function processFileList(leadPath: string, fileList: FileList) {
        for (var i = 0; i < fileList.length; i++) {
          var fi: any = fileList[i];
          var fiPath = env.path.join(
            leadPath || '/',
            fi.relativePath || fi.webkitRelativePath || fi.msRelativePath || fi.mozRelativePath || fi.oRelativePath
            || fi.name);

          if (fi.isFile) {
            addFileEntry(fiPath, fi);
          }
          else if (fi.isDirectory) {
            addDirEntry(fiPath, fi);
          }
          else if (fi.getAsEntry) {
            addEntry(fiPath, fi.getAsEntry());
          }
          else if (fi.webkitGetAsEntry) {
            addEntry(fiPath, fi.webkitGetAsEntry());
          }
          else if (fi.mozGetAsEntry) {
            addEntry(fiPath, fi.mozGetAsEntry());
          }
          else if (fi.msGetAsEntry) {
            addEntry(fiPath, fi.msGetAsEntry());
          }
          else if (fi.oGetAsEntry) {
            addEntry(fiPath, fi.oGetAsEntry());
          }
          else {
            addFile(fiPath, fi);
          }
        }
      }

      function addEntry(path: string, entry: any) {
        if (entry.isFile)
          addFileEntry(path, entry);
        else if (entry.isDirectory)
          addDirEntry(path, entry);
      }

      function addDirEntry(path: string, dir: any) {
        outstandingDirCount++;

        var reader = dir.createReader();
        reader.readEntries(addEntries, oneCompleted);

        function addEntries(entries: any[]) {
          if (!entries || !entries.length) {
            oneCompleted();
            return;
          }

          for (var i = 0; i < entries.length; i++) {
            addEntry(path+'/'+entries[i].name, entries[i]);
          }

          reader.readEntries(addEntries, oneCompleted);
        }

        function oneCompleted() {
          outstandingDirCount--;

          if (!outstandingDirCount && !outstandingFileCount) {
            onFileListCompleted();
            return;
          }
        }
      }

      function addFileEntry(path: string, fileEntry: any) {
        outstandingFileCount++;
        fileEntry.file(
          file => {
            addFile(path, file);
            outstandingFileCount--;
            if (!outstandingDirCount && !outstandingFileCount) {
              onFileListCompleted();
              return;
            }
          },
          error => {
            outstandingFileCount--;
            if (!outstandingDirCount && !outstandingFileCount) {
              onFileListCompleted();
              return;
            }
          });
      }

      function addFile(path: string, file: File) {
        outstandingFileCount++;
        var content: string = null;

        var reader = new FileReader();
        reader.onerror = oneCompleted;
        reader.onload = () => {
          content = reader.result;
          allfiles.push({
            path: path,
            getContent: () => content,
            remove: null
          });
          oneCompleted();
        };
        reader.readAsText(file);

        function oneCompleted() {
          outstandingFileCount--;
          if (!outstandingDirCount && !outstandingFileCount) {
            onFileListCompleted();
            return;
          }
        }
      }
    }

    function importExplicitDialog() {

      var dlgBody = document.createElement('div');
      dlgBody.style.cssText =
        'position: absolute; left: 40%; top: 40%; max-height: 40%; width: 20%;'+
        'background: #101010; color: gray; border: solid 1px white;'+
        'padding: 1em;';

      dlgBody.innerHTML =
        '<pre style="margin: 0px;">'+
        '<div id=import_title style="font-size: 160%; font-weight: light;">Import (F3)</div>'+
        '<input type=file id=import_file '+
        	' multiple'+
      		//' directory webkitdirectory mozdirectory msdirectory odirectory'+
        	' style="width: 95%; background: black; color: gray; border: none; font: inherit; font-size: 120%; padding: 3px; padding-left: 0.6em;">'+
        '<div><input type=checkbox id=import_directory> directory</div>'+
        '<div style="text-align: right; margin-top: 0.5em; margin-right: 5%;"><button id=import_button style="font: inherit; font-size: 120%;"> Import </button></div>'+
        '</pre>';

      var dlg = env.dialogHost.show(dlgBody);

      var ctls = children(dlgBody, 'div', 'input', 'button');

      dlgBody.onkeydown = (e) => {
        if (!e) e = (<any>window).event;
        enrichKeyEvent(e);
        if (e.shellPressed.Escape) {
          if ('cancelBubble' in e) e.cancelBubble = true;
          if (e.preventDefault) e.preventDefault();
          dlg.close();
        }
        else if (e.shellPressed.Enter) {
          if ('cancelBubble' in e) e.cancelBubble = true;
          if (e.preventDefault) e.preventDefault();
          commit();
        }
      };

      ctls.import_directory.onchange = dirCheck;
      ctls.import_directory.onchanged = dirCheck;
      ctls.import_directory.onvaluechange = dirCheck;
      ctls.import_directory.onvaluechanged = dirCheck;
      ctls.import_directory.onclick = dirCheck;

      ctls.import_button.onclick = commit;

      setTimeout(function() {
        ctls.import_file.focus();
        if (ctls.import_file.click) ctls.import_file.click();
      }, 1);

      ctls.import_file.onchange = () => {
        importFiles(ctls.import_file.files);
        dlg.close();
      };

      dlgBody.ondragenter = dlgBody.ondragover = function(e) {
        if (!e) e = (<any>window).event;
        if (e.preventDefault) e.preventDefault();
        if (e.stopPropagation) e.stopPropagation();
      };

      dlgBody.ondrop = function(e) {
        if (!e) e = (<any>window).event;
        var dt = e.dataTransfer;
        var files = dt ? dt.files : null;
        if (!files) return;

        if (e.preventDefault) e.preventDefault();
        if (e.stopPropagation) e.stopPropagation();


        importFiles(files);
        dlg.close();
      };

      return true;

      function dirCheck() {
        if ((<any>dirCheck)._timeout) clearTimeout((<any>dirCheck)._timeout);
        (<any>dirCheck)._timeout = setTimeout(function() {
          (<any>dirCheck)._timeout = null;
          var isDir = !!ctls.import_directory.checked || ctls.import_directory.value==='on' || ctls.import_directory.value===true || ctls.import_directory.value==='true' || ctls.import_directory.value==='yes';
          var propPrefixes = ['moz', 'webkit', 'ms', 'o', ''];
          for (var i = 0; i < propPrefixes.length; i++) {
            var prop = propPrefixes[i]+'directory';
            if (prop in ctls.import_file) {
              ctls.import_file[prop] = isDir;
            }
          }
        }, 100);
      }

      function commit() {
        importFiles(ctls.import_file.files);
        dlg.close();
      }
    }

  }

}