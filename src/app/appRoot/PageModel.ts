module portabled.app.appRoot {
  
  export class PageModel {

    private _drive: persistence.Drive = null;
    private _fileTree: portabled.files.FileTree = null;
    private _docHost: docs.DocHost = null;
  
    docHostRegions: docs.types.DocHostRegions = <any>{};
    fileTreeHost: HTMLElement = null;
    flyoutScroller: HTMLElement = null;
    brandingArea: HTMLElement = null;
  
    constructor() {
    }

    loadFromDOM(completed: () => void) {
      var fileTree = new portabled.files.FileTree(this.fileTreeHost);

      app.loading('Initializing caches...');

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
        persistence.defaultPersistenceModules(),
        mountedDriveCallback);
    }

    keydown(unused, e: KeyboardEvent) {
      if (e.keyCode === 220 || e.which === 220 // Ctrl+O
        || e.keyCode === 79 || e.which === 79) { // Ctrl+N
        if (e.ctrlKey || e.altKey || e.metaKey) {
          this.moreClick();
          return;
        }
      }

      if ((e.keyCode || e.which) === 66) { // Ctrl+B, Alt+B
        if (e.ctrlKey || e.altKey || e.metaKey) {
          this.buildClick();
          return;
        }
      }

      if ((e.keyCode || e.which) === 82) { // Alt+R
        if (e.altKey) {
          var allFiles = this._drive.files();
          var deleteFiles = allFiles;

          if (this._fileTree.selectedFile()) {
            var currentFile = files.normalizePath(this._fileTree.selectedFile());
            var lastSlash = currentFile.lastIndexOf('/');
            var parentDir = currentFile.slice(0, lastSlash+1);

            deleteFiles = [];
            for (var i = 0; i < allFiles.length; i++) {
              if (allFiles[i].indexOf(parentDir) === 0)
                deleteFiles.push(allFiles[i]);
            }
          }

          if (confirm('Delete '+deleteFiles.length+' files' + (parentDir ? ' at '+parentDir : '') +' out of ' + allFiles.length + '?')) {
            for (var i = 0; i < deleteFiles.length; i++) {
              this._drive.write(deleteFiles[i], null);
            }
            
            alert(deleteFiles.length + ' files deleted.');
          }
          return;
        }
      }
      
      /*
      if (typeof console !== 'undefined'
          && typeof console.log === 'function') {
        console.log('key '+e.keyCode);
      }
      */

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
        this._drive,
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
      moreDlg.connectToDOM();
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
      
      if (key.charAt(0) === '/')
        key = key.slice(1);
      if (key.charAt(key.length - 1) === '/')
        key = key.slice(0, key.length - 1);

      if (window.location.port === 'blob:') {
        var pts = key.split('/');
        key = pts[pts.length - 1];
      }

      var hashedKey =
          murmurhash2_32_gc(key, 2523).toString() + '-' +
          murmurhash2_32_gc(key.slice(1), 45632).toString(); // a naive (stupid) way to reduce collisions

      return key;
    }

    buildClick() { 
      var file = this._fileTree.selectedFile();
      
      buildUI.runBuild(file, this._drive);
    }

    exportAllHTML() {
      importExport.exportAllHTML();
    }

    commitToGitHub() {
      var gitHubURL = document.body.getAttribute('data-github-url');

      if (/.github\.io$/.test(window.location.hostname.toLowerCase()))
        gitHubURL = window.location + '';

      if (!gitHubURL) {
        gitHubURL = prompt('GitHub URL');
        if (!gitHubURL)
          return;
        
        document.body.setAttribute('data-github-url', gitHubURL);
      }

      if (gitHubURL.toLowerCase().indexOf('https://') ===0)
        gitHubURL = gitHubURL.slice('https://'.length);
      else if (gitHubURL.toLowerCase().indexOf('http://') == 0)
        gitHubURL = gitHubURL.slice('http://'.length);

      var gitHubURLParts = gitHubURL.split('/');

      // TODO: support both GitHub pages as well as browse URLs
      if (!/.github\.io$/.test(gitHubURLParts[0].toLowerCase())) {
        alert('not a GitHub URL');
        return;
      }
      if (gitHubURLParts.length < 2) {
        alert('not full GitHub URL (with the file name)');
        return;
      }
      
      var message = prompt('Commit message');
      if (!message)
        return;

      var user = gitHubURLParts[0].slice(0, gitHubURLParts[0].length - '.github.io'.length);

      var repo = gitHubURLParts[1];
      
      var path = gitHubURLParts.length === 2 ? 'index.html' : gitHubURLParts.slice(3).join('/');
      
      
      function commitViaJSAPI() {
//        var gh = new Github();
//        gh.Repo;
      }
      
      var xhr = new XMLHttpRequest();
      xhr.withCredentials = true;
      xhr.open('PUT', 'https://api.github.com/repos/'+user+'/'+repo+'/contents/'+path);
      xhr.onreadystatechange = () => {
        if (xhr.readyState == 4 && xhr.status == 200) {
          var resultJSON = typeof xhr.response === 'string' ? JSON.parse(xhr.response) : xhr.response;
          if (!resultJSON) {
            alert('GitHub did not respond well.');
            return;
          }
          
          console.log(resultJSON);
        }
      };
      xhr.onerror = (err) => {
        alert('GitHub reject: ' + err.message);
      };
      
      var req = JSON.stringify({
        "path": path,
        "message": message,
        "content": '<!doctype html>' + document.documentElement.outerHTML
      });
      
      xhr.send(req);
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
  
    importPortabledHTML() {
      importExport.importPortabledHTMLWithConfirmation(this._drive);
    }


  }
  
}