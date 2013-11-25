/// <reference path='typings/knockout.d.ts' />

/// <reference path='editor.ts' />
/// <reference path='files.ts' />
/// <reference path='persistence.ts' />

module teapo {
  export class ApplicationShell {

    fileList: FileList = null;

    private _storage: DocumentStorage = null;
    private _selectedDocState: DocumentState = null;
    private _editorElement: HTMLElement = null;
    private _host: HTMLElement = null;

    constructor() {
      this._storage = new DocumentStorage();
      this._storage.entryResolver = this.fileList;
      this._storage.typeResolver = DocumentEditorType;
  
      this.fileList = new FileList(this._storage);
  
      this.fileList.selectedFile.subscribe((fileEntry) => this._fileSelected(fileEntry));
    }

    saveZip() {
      
    }

    saveHtml() {
      var html = document.head.parentElement.outerHTML;
      var result = [];
      var plainStart = 0;
      for (var i = 0; i < html.length; i++) {
        var code = html.charCodeAt(i);
        if (code<128) continue;

        if (i>plainStart)
          result.push(html.slice(plainStart, i));

        var uriTxt = encodeURIComponent(html.charAt(i));
        console.log(i, uriTxt, html.charAt(i));
        for (var j = 1; j < uriTxt.length; j+=3) {
          var uriHex = parseInt(uriTxt.slice(j), 16);
          result.push(String.fromCharCode(uriHex));
        }

        plainStart = i;
      }

      result.push(html.slice(plainStart));
  
      var totalUtf = result.join('');
      var base64 = btoa(totalUtf);
      console.log(totalUtf.length);

      var dataUri = 'data:application/octet-stream;base64,'+base64;
      try {
        var a = document.createElement('a');
        a.href = dataUri;
        var slashParts = window.location.pathname.split('/');
        (<any>a).download = slashParts[slashParts.length-1];
        a.click();
      }
      catch (e) {
        window.open(dataUri);
      }
    }
  
    attachToHost(host: HTMLElement) {
      this._host = host;
      if (this._editorElement) {
        this._host.innerHTML = '';
        this._host.appendChild(this._editorElement);
      }
    }

    private _fileSelected(fileEntry: FileEntry) {
      var newDocState: DocumentState = null;
      if (fileEntry)
        newDocState = this._storage.getDocument(fileEntry.fullPath());

      if (this._selectedDocState) {
        this._selectedDocState.editor().close();
      }

      var newEditorElement: HTMLElement = null;
      if (newDocState) {
        newEditorElement = newDocState.editor().open();
      }

      if (newEditorElement!==this._editorElement) {
        var oldEditorElement= this._editorElement;

        this._editorElement = newEditorElement;

        if (oldEditorElement && this._host) {
          this._host.removeChild(oldEditorElement);
        }

        this._host.innerHTML = ''; // removing the initial startup decoration

        if (newEditorElement && this._host)
          this._host.appendChild(newEditorElement);
      }
    }
  }
}