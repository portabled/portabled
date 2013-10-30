module files {
  export class FileListControl {
    private _items = new FileList();
  
    constructor(private _host: HTMLElement) {
  
      Layout.cleanContent(this._host);
      this._host.appendChild(this._items.div);
  
      this._applyStyle(this._host.style);
    }
  
    onclick: (file:string) => void = null;
  
    addFile(file: string) {
      var path = normalizePath(file);
      this._items.addFile(path);
    }
  
    removeFile(file: string) {
      var path = normalizePath(file);
      this._items.removeFile(path);
    }
  
    editNewFileName(oncompleted: (file: string) => void) {
    }
  
    private _applyStyle(s: MSStyleCSSProperties) {
    }
  }
  
  class FileList {
    div = document.createElement('div');
  
    constructor() {
      this._applyStyle(this.div.style);
    }

    addFile(file: string) {
    }

    removeFile(file: string) {
    }

    private _applyStyle(s: MSStyleCSSProperties) {
    }
  }
  
  class FolderItem {
    items = new FileList();
    div = document.createElement('div');
    private _nameDiv = document.createElement('div');
  
    constructor(public name: string) {
      this._applyStyle(this.div.style, this._nameDiv.style);
      this.div.appendChild(this._nameDiv);
      this.div.appendChild(this.items.div);
    }
  
    private _applyStyle(ds: MSStyleCSSProperties, ns: MSStyleCSSProperties) {
    }
  }
  
  class FileItem {
    div = document.createElement('div');
  
    constructor(public name: string) {
      this._applyStyle(this.div.style);
    }
  
    private _applyStyle(s: MSStyleCSSProperties) {
    }
  }

  function normalizePath(path: string): string {
    return path;
  }
}