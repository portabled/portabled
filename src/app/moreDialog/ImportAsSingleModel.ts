module portabled.app.moreDialog {
  
  interface SiblingEntry {
    file: string;
    dir?: string;
    isMatching: boolean;
    isSubdir: boolean;
  }
  
  export class ImportAsSingleModel {

    filename = ko.observable('');
    siblings = ko.observableArray<SiblingEntry>([]);
  
    contentHost = ko.observable<HTMLElement>(null);
  
    private _updateTimer = new Timer();

    constructor(
      defaultBaseDir: string,
    	private _file: File,
      private _data: any,
      private _text: string,
      private _drive: persistence.Drive) {

      this.filename(defaultBaseDir + '/' + this._file.name);
      
      this._updateFromFilename();
      
      this.filename.subscribe(() => this._updateTimer.reset());
      
      this._updateTimer.ontick = () => this._updateFromFilename();
      
      this.contentHost.subscribe(() => this._updateTimer.reset());
    }

  	click(data: SiblingEntry) {
      if (data.dir) {
        var filePart = null;
        var filenameParts = this.filename().split('/');
        for (var i = filenameParts.length - 1; i >= 0; i--) {
          if (filenameParts[i]) {
            filePart = filenameParts[i];
            break;
          }
        }
        if (!filePart)
          filePart = this._file.name;
        this.filename(data.dir + filePart);
      }
      else {
        this.filename(data.file);
      }
    }
  
    private _updateFromFilename() {
      var normFilename = files.normalizePath(this.filename());
      var lastslash = normFilename.lastIndexOf('/');
      var parentDir = normFilename.slice(0, lastslash +1);
      
      var allFiles = this._drive.files();
      var filtered: SiblingEntry[] = [];
      var exactMatch = false;
      var skipDeepDirs: any = {};
      for (var i = 0; i < allFiles.length; i++) {
        if (!allFiles[i].indexOf(parentDir)) {
          var nextSlash = allFiles[i].indexOf('/', parentDir.length);
          if (nextSlash>0) {
            // collapse deep directories beneath the current one
            var subdir = allFiles[i].slice(parentDir.length, nextSlash);
            if (skipDeepDirs.hasOwnProperty(subdir))
              continue;
            skipDeepDirs[subdir] = true;
            filtered.push({ file: ' ' + parentDir + subdir + '/...', isMatching: false, isSubdir: true, dir: parentDir + subdir + '/' });
            continue;
          }
          var isMatching = allFiles[i]===normFilename;
          filtered.push({ file: allFiles[i], isMatching: isMatching, isSubdir: false });
          if (isMatching)
            exactMatch = true;
        }
      }
      
      filtered.sort((entry1, entry2) => entry1.file>entry2.file ? 1 : entry1.file < entry2.file ? -1 : 0);
      if (normFilename.lastIndexOf('/')>0) {
        // insert the parent directories at the start
        var normFilenameParts = normFilename.split('/');
        normFilenameParts = normFilenameParts.slice(0, normFilenameParts.length - 2); // current name and current dir
        var insertDirs: SiblingEntry[] = [];
        for (var i = 0; i < normFilenameParts.length; i++) {
          var dir = normFilenameParts.slice(0, i + 1).join('/') + '/';
          insertDirs.push({ file: ' ' + dir + '...', isMatching: false, isSubdir: true, dir: dir });
        }
        filtered = insertDirs.concat(filtered);
      }
      
      this.siblings(filtered);

      if (this.contentHost()) {
        if (!exactMatch) {
          this.contentHost().style.display = 'none';
        }
        else {
          this.contentHost().style.display = 'block';

          this.contentHost().innerHTML = '';
          var mergeHost = document.createElement('div');
          mergeHost.style.width = '100%';
          mergeHost.style.height = '100%';
          mergeHost.style.background = 'cornflowerblue';

          this.contentHost().innerHTML = '';
          this.contentHost().appendChild(mergeHost);

          var detectedMode =
            /.ts$/.test(normFilename) ? 'text/typescript' :
          	/.html$/.test(normFilename) ? 'text/html' :
          	/.css$/.test(normFilename) ? 'text/css' :
            /.js$/.test(normFilename) ? 'javascript' :
          	'text';

          var options = {
            orig: this._text, // swapped with value to make new text on the left
            origLeft: null,
            value: this._drive.read(normFilename), // here
            lineNumbers: true,
            mode: detectedMode,
            highlightDifferences: true,
            connect: true,
            collapseIdentical: true,
            allowEditingOriginals: false,
            revertButtons: false
          };

          setTimeout(() => {
            var dv = (<any>CodeMirror).MergeView(mergeHost, options);
          }, 1);
          
/*
          dv.leftOriginal().setSize(null, '80%');
          dv.editor().setSize(null, '80%');
          dv.rightOriginal().setSize(null, '80%');
*/

        }
      }
    }
    
  }
  
}