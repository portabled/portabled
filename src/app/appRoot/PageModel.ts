module teapo.app.appRoot {
  
  export class PageModel {

    private _drive: persistence.Drive = null;
    private _fileTree: teapo.files.FileTree = null;
    private _docHost: docs.DocHost = null;

    docHostRegions: docs.types.DocHostRegions = <any>{};
    fileTreeHost: HTMLElement = null;
    flyoutScroller: HTMLElement = null;
    brandingArea: HTMLElement = null;
  
    constructor() {
    }

    loadFromDOM(completed: () => void) {
      var fileTree = new teapo.files.FileTree(this.fileTreeHost);

      app.loading('Retrieving cached files...');

      var uniqueKey = this._getUniqueKey();
      var domTimestamp = fileTree.timestamp;

      var mountedDriveCallback: persistence.mountDrive.Callback = mountedDrive => {

          app.loading('Initialising document host...');
          var docHost = new docs.DocHost(
              this.docHostRegions,
              mountedDrive);

          // everything loaded, now assign to state
          this._fileTree = fileTree;
          this._docHost = docHost;
          this._drive = mountedDrive;

          this._fileTree.selectedFile.subscribe(newSelectedFile => this._docHost.show(newSelectedFile));

          if (this._fileTree.selectedFile()) {
            app.loading('Opening...');
            this._docHost.show(this._fileTree.selectedFile());
          }

          var readmeMD = this._drive.read('/readme.md');
        	if (readmeMD) {
            if (!this._fileTree.selectedFile()) {
              app.loading('Opening readme...');
              this._fileTree.selectedFile('/readme.md');
            }

            var readmeHTML = marked(readmeMD);
            if (this.brandingArea && 'innerHTML' in this.brandingArea)
              this.brandingArea.innerHTML = readmeHTML;
          }

          build.processTemplate.mainDrive = mountedDrive;

          completed();

      };

      mountedDriveCallback.progress = (current, total) => {
        app.loading('Retrieving cached files: ' + current + ' of ' + total + '...');
      };
      

      persistence.mountDrive(
        fileTree,
        uniqueKey,
        domTimestamp,
        <any>teapo.persistence,
        mountedDriveCallback);
    }

    keydown(unused, e: KeyboardEvent) {
      if (e.keyCode === 220 || e.which === 220
        || e.keyCode === 79 || e.which === 79) {
        if (e.ctrlKey || e.altKey || e.metaKey) {
          this.moreClick();
          return;
        }
      }

      if (e.keyCode === 66 || e.which === 66) {
        if (e.ctrlKey || e.altKey || e.metaKey) {
          this.buildClick();
          return;
        }
      }

      return true;
    }
  
    thickbarMouseDown(unused, e: MouseEvent) {
      dragScrollMouseDown(e, this.flyoutScroller);
    }

    moreClick() {
      
      if (!this._fileTree)
        return;
      
      var currentSelectedText = '';
      var moreDlg = new moreDialog.Model(
        this._fileTree.selectedFile(),
        currentSelectedText,
        this._drive.files(),
        typedFilename => { 
          document.body.removeChild(div);
          if (!typedFilename)
            return;

          var newFile = files.normalizePath(typedFilename);

          if (this._drive.read(newFile) === null) {
            this._drive.write(newFile, '');
            this._docHost.add(newFile);
          }

          this._fileTree.selectedFile(newFile);
        });

      var div = document.createElement('div');
      document.body.appendChild(div);
      ko.applyBindingsToNode(div, { template: { name: 'MoreDialogView' } }, moreDlg);
      moreDlg.loadFromDOM();
    }
  
    deleteClick() {
      
      var removeFile = this._fileTree.selectedFile();
      if (!removeFile)
        return;
      
      if (!confirm('Remove file\n  ' + removeFile + '  ?'))
        return;
      
      this._drive.write(removeFile, null);
      this._docHost.remove(removeFile);
    }
  
    private _getUniqueKey() {
      var key = window.location.pathname;

      key = key.split('?')[0];
      key = key.split('#')[0];

      key = key.toLowerCase();

      var ignoreSuffix = '/index.html';

      if (key.length > ignoreSuffix.length && key.slice(key.length - ignoreSuffix.length) === ignoreSuffix)
        key = key.slice(0, key.length - ignoreSuffix.length);

      return key;
    }

    buildClick() { 
      var template: string;
      var file = this._fileTree.selectedFile();
      if (file && (file.slice(file.length - '.html'.length) === '.html' || file.slice(file.length - '.html'.length) === '.htm')) {
        template = this._drive.read(file);
      }
      else {
        template = this._drive.read('/index.html');
      }

      if (template) {
        build.functions.appPageModel = this;
        var processed = build.processTemplate(template, [build.functions]);
        var blob = new Blob([processed], { type: 'text/html' });
        var url = URL.createObjectURL(blob);
        window.open(url, '_blank' + Date.now());
      }
    }

    exportAllHTML() {
      importExport.exportAllHTML();
    }
  
    exportAllZIP() {
      importExport.exportAllZIP(this._drive);
    }
  
    exportCurrentFile() {
      var selectedFile = this._fileTree.selectedFile();
      if (selectedFile)
        return;
      
      var simpleFileParts = selectedFile.split('/');
      var simpleFile = simpleFileParts[simpleFileParts.length - 1];
      
      importExport.exportBlob(simpleFile, [this._drive.read(selectedFile)]);
    }

    importText() {
      this._importSingeFile(
        (fileReader, file) => fileReader.readAsText(file),
        null);
    }

    importBase64() {
      this._importSingeFile(
        (fileReader, file) => fileReader.readAsArrayBuffer(file),
        text => {
          alert('Base64 encoding is not implemented.');
          return text;
        });
    }

    private _importSingeFile(requestLoad: (fileReader: FileReader, file: File) => void, convertText: (raw: string) => string) {
      importExport.importSingleFileWithConfirmation(
        requestLoad,
        file => this._drive.read(file),
        (saveName, data) => {
          if (this._drive.read(saveName)) {
            this._docHost.remove(saveName);
          }

          this._drive.write(saveName, data);
          
          this._drive.read(saveName);
          this._docHost.add(saveName);
          
          this._fileTree.selectedFile(saveName);
        },
        convertText);
    }

    importZIP() {
      importExport.importZIPWithConfirmation(this._drive);
    }


  }
  
}