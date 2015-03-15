module portabled.files {
  
  export class FileTree implements persistence.Drive {

    private _virtualRoot: Node;
    private _allFiles: { [file: string]: Node; } = {};
    private _selectedFileNode = ko.observable<Node>(null);

    selectedFile = ko.computed<string>({
      read: () => {
        var n = this._selectedFileNode();
        return n ? n.fullPath : null;
      },
      write: (value) => {
        var node = this._allFiles[value] || null;
        if (node || value === null || value === undefined)
          this._selectFileNode(node);
      }
    });
    
    timestamp: number = 0;

    constructor(private _host: HTMLElement) {

      var domSelection = { selectedFile: null };
      this._virtualRoot = new Node(null, <any>this._host, this._allFiles, domSelection);
      
      if (domSelection.selectedFile)
        this.selectedFile(domSelection.selectedFile);
      
      try {
        var timestamStr = this._virtualRoot.readAttr('timestamp');
        this.timestamp = timestamStr ? parseInt(timestamStr) : 0;
      }
      catch (parseError) {
        this.timestamp = 0;
      }

      addEventListener(this._host, 'click', e => this._onClick(<any>e));
    }

    files(): string[] {
      return objectKeys(this._allFiles);
    }

    read(file: string): string {
      var n = this._allFiles[file];
      if (n)
        return n.read();
      else
        return null;
    }

    write(file: string, content: string) {
      var n = this._allFiles[file];
      if (!n) {
        file = normalizePath(file);
        n = this._allFiles[file];
      }

      if (n) {
        if (content || typeof content === 'string') {
          n.write(content);
        }
        else {
          n.parent.remove(n);
          delete this._allFiles[file];
        }
      }
      else {
        if (!content && typeof content !== 'string')
          return;

        var newFile = this._createFile(file);
        newFile.write(content);
      }
      
      this._virtualRoot.writeAttr('timestamp', this.timestamp + '');
    }
    
    private _createFile(file: string): Node {
      var lastSlashPos = file.lastIndexOf('/');
      if (lastSlashPos) { // slash in position other than lead
        var parentDir = file.slice(1, lastSlashPos);
        var fileName = file = file.slice(lastSlashPos + 1);
        var parent = this._virtualRoot.findOrCreateDir(parentDir);
        var node = parent.createFile(fileName);
        this._allFiles[node.fullPath] = node;
        return node;
      }
      else { 
        var node = this._virtualRoot.createFile(file.slice(1));
        this._allFiles[node.fullPath] = node;
        return node;
      }
    }
    
    private _onClick(e: MouseEvent) {
      var node = this._getNode(<any>e.target || <any>e.srcElement);
      if (!node) return;
      if (node === this._virtualRoot) return;
      
      if (node.isDir) {
        node.toggleCollapse();
      }
      else {
        this._selectFileNode(node);
      }
      
    }
    
    private _selectFileNode(node: Node) {
      var oldSelected = this._selectedFileNode();
      if (oldSelected) {
        oldSelected.setSelectClass(false);
      }
      
      if (node)
        node.setSelectClass(true);
      
      this._selectedFileNode(node);
    }
    
    private _getNode(elem: HTMLElement): Node {
      while (elem) {
        var node = (<any>elem)._portabled_node;
        if (node) return node;
        elem = elem.parentElement;
        if (!elem)
          return null;
      }
    }

  }

  class Node {

    isDir: boolean = false;
    name: string = null;
    fullPath: string = null;

    private _contentPRE: HTMLPreElement = null;
    private _subDirs: Node[] = [];
    private _files: Node[] = [];
    private _ul: HTMLUListElement = null;
    
    constructor(
      public parent: Node,
      public li: HTMLElement,
      allFiles: { [file: string]: Node; },
      selection: { selectedFile: string; }) {
        
      (<any>li)._portabled_node = this;
      
      var childLIs: HTMLLIElement[] = [];
      for (var i = 0; i < this.li.children.length; i++) {

        var child = this.li.children[i];
        if ((<HTMLLIElement>child).tagName === 'LI') childLIs.push(<HTMLLIElement>child);
        if ((<HTMLUListElement>child).tagName === 'UL') {
          this._ul = <HTMLUListElement>child;
          for (var j = 0; j < this._ul.children.length; j++) {
            var ulLI = <HTMLLIElement>this._ul.children[j];
            if (ulLI.tagName === 'LI') childLIs.push(ulLI);
          }
        }
        

        if (((<HTMLDivElement>child).tagName === 'DIV' || (<HTMLDivElement>child).tagName === 'SPAN') && (<HTMLDivElement>child).className) {
          if ((<HTMLDivElement>child).className.indexOf('portabled-file-name') >= 0) {
            this.isDir = false;
            this.name = child.textContent || (<HTMLDivElement>child).innerText;
          }
          else if ((<HTMLDivElement>child).className.indexOf('portabled-dir-name') >= 0) {
            this.isDir = true;
            this.name = child.textContent || (<HTMLDivElement>child).innerText;
          }
        }

        if ((<HTMLPreElement>child).tagName === 'PRE' && (<HTMLPreElement>child).className 
          && (<HTMLPreElement>child).className.indexOf('portabled-file-content') >= 0) {
          
          if (this._contentPRE) {
            // double content?
          }
          else {
            this._contentPRE = <HTMLPreElement>child;
          }
          
        }

      }
      
      if (this.parent) {
        this.fullPath = this.parent.fullPath + '/' + this.name;
      }
      else { 
        this.name = '';
        this.fullPath = '';
      }
      
      if (selection) {
        if (li.className.indexOf('portabled-file-selected') >= 0) {
          if (selection.selectedFile)
            li.className = li.className.replace(/portabled\-file\-selected/g, '');
          else
            selection.selectedFile = this.fullPath;
        }
      }
      else { 
        if (li.className.indexOf('portabled-file-selected') >= 0)
          li.className = li.className.replace(/portabled\-file\-selected/g, '');
      }

      if (allFiles)
        this._createChildNodesAndSort(childLIs, allFiles, selection);

    }

    read(): string {
      if (this.isDir)
        return null; // DEBUG

      return readNodeFileContent(this._contentPRE);
    }

    write(content: string) {
      if (this.isDir)
        return; // DEBUG

      if (!this._contentPRE) {
        this._contentPRE = document.createElement('pre');
        this._contentPRE.className = 'portabled-file-content';
        this.li.appendChild(this._contentPRE);
      }
      
      this._contentPRE.textContent = content || '';
    }
  
    readAttr(prop: string) {
      if (this.li)
        return this.li.getAttribute(getSafeAttributeName(prop));
      else
        return this._ul.getAttribute(getSafeAttributeName(prop));      
    }
  
    writeAttr(prop: string, value: string) {
      if (value === null || value === undefined) {
        if (this.li)
          this.li.removeAttribute(getSafeAttributeName(prop));
        else
          this._ul.removeAttribute(getSafeAttributeName(prop));      
      }
      else {
        if (this.li)
          this.li.setAttribute(getSafeAttributeName(prop), value);
        else
          this._ul.setAttribute(getSafeAttributeName(prop), value);
      }
    }
  
    remove(childNode: Node) {
      var nodeList = childNode.isDir ? this._subDirs : this._files;
      var index = nodeList.indexOf(childNode);
      nodeList.splice(index, 1);
      this._ul.removeChild(childNode.li);
      
      if (!this.parent || this._files.length + this._subDirs.length)
        return;

      this.parent.remove(this);
    }

    findOrCreateDir(relativePath: string): Node {
      
      var slashPos = relativePath.indexOf('/');
      var subdirName = slashPos > 0 ? relativePath.slice(0, slashPos) : relativePath;
      var restPath = slashPos > 0 ? relativePath.slice(slashPos + 1) : null;
      
      var matchIndex = this._binarySearchNode(subdirName, this._subDirs);
      var subdir: Node;
      if (matchIndex >= 0) {
        subdir = this._subDirs[matchIndex];
      }
      else {
        //return this._subDirs[matchIndex];
        var insertIndex = -matchIndex - 100;

        var newLI = document.createElement('li');
        newLI.className = 'portabled-dir';
        var fnameDIV = document.createElement('span');
        fnameDIV.className = 'portabled-dir-name';
        if ('textContent' in fnameDIV)
          fnameDIV.textContent = subdirName;
        else
          fnameDIV.innerText = subdirName;
        newLI.appendChild(fnameDIV);
        var ul = document.createElement('ul');
        newLI.appendChild(ul);
        subdir = new Node(this, newLI, /*allFiles*/ null, /*selection*/ null);
        
        var insertSibling =
          insertIndex < this._subDirs.length ? this._subDirs[insertIndex].li    :
          this._files.length ? this._files[0].li :
          null;
        
        this._subDirs.splice(insertIndex, 0, subdir);
        if (!this._ul) {
          this._ul = document.createElement('ul');
          this.li.appendChild(this._ul);
        }

        this._ul.insertBefore(subdir.li, insertSibling);
      }
      
      if (restPath)
        return subdir.findOrCreateDir(restPath);
      else
        return subdir;
    }
  
    createFile(fileName: string): Node {
      var newLI = document.createElement('li');
      newLI.className = 'portabled-file';
      var fnameDIV = document.createElement('span');
      fnameDIV.className = 'portabled-file-name';
      if ('textContent' in fnameDIV)
        fnameDIV.textContent = fileName;
      else
        fnameDIV.innerText = fileName;
        
      newLI.appendChild(fnameDIV);
      var newNode = new Node(this, newLI, /*allFiles*/ null, /*selection*/ null);
      this._insertChildNode(
        this._files,
        newNode,
          /*forceRerootingEvenIfOrdered*/ true,
          /*insertBeforeElement*/null);
      return newNode;
    }
  
    toggleCollapse() {
      if (this.li.className && this.li.className.indexOf('portabled-dir-collapsed') >= 0) {
        this.li.className = this.li.className.replace(/portabled\-dir\-collapsed/g, '');
      }
      else { 
        this.li.className = (this.li.className || '') + ' portabled-dir-collapsed';
      }
    }
  
    setSelectClass(selected: boolean) {
      if (selected) {
        this.li.className = (this.li.className || '') + ' portabled-file-selected';
      }
      else { 
        this.li.className = this.li.className ? this.li.className.replace(/portabled\-file\-selected/g, '') : null;
      }
    }

    private _createChildNodesAndSort(
      childLIs: HTMLLIElement[],
      allFiles: { [file: string]: Node; },
      selection: { selectedFile: string; }) {
      
      for (var i = 0; i < childLIs.length; i++) {
        var node = new Node(this, childLIs[i], allFiles, selection);
        
        if (node.isDir) {
          this._insertChildNode(
            this._subDirs, node,
            /*forceRerootingEvenIfOrdered*/ <any>this._files.length,
            this._files.length ? this._files[0].li : node.li);
        }
        else {
          allFiles[node.fullPath] = node;
          this._insertChildNode(
            this._files, node,
            /*forceRerootingEvenIfOrdered*/ false,
            node.li);
        }
      }
      
    }

    private _insertChildNode(
      nodeList: Node[],
      node: Node,
      forceRerootingEvenIfOrdered: boolean,
      insertBeforeElement: HTMLElement) {
      
      var insertIndex = this._binarySearchNode(node.name, nodeList);
      if (insertIndex >= 0)
        alert('Node should not exist: we are inserting it.');

      insertIndex = -insertIndex - 100;
      
      if (insertIndex >= nodeList.length) {      
        nodeList.push(node);
        if (forceRerootingEvenIfOrdered)
          this._ul.insertBefore(node.li, insertBeforeElement);
        return;
      }

      this._ul.insertBefore(node.li, nodeList[insertIndex].li);
      nodeList.splice(insertIndex, 0, node);
      
    }
  
    /** returns match index, or (-100 - insertionIndex) */
    private _binarySearchNode(name: string, list: Node[]): number {
      if (!list.length)
        return -100;
      
      if (name > list[list.length - 1].name)
        return -100 - list.length;
      if (name == list[list.length - 1].name)
        return list.length - 1;
      
      if (name < list[0].name)
        return -100;
      if (name === list[0].name)
        return 0;
      
      var rangeStart = 1;
      var rangeLength = list.length - 2;
      while (true) {
        if (!rangeLength)
          return -100 - rangeStart;
        
        var mid = rangeStart + (rangeLength >> 1);
        if (name === list[mid].name)
          return mid;

        if (name < list[mid].name) {
          rangeLength = mid - rangeStart;
        }
        else {
          rangeLength -= mid - rangeStart + 1;
          rangeStart = mid + 1;
        }
      }
    }
    
  }

  export function normalizePath(path: string) : string {
    
    if (!path) return '/'; // empty paths converted to root
    
    while (' \n\t\r'.indexOf(path.charAt(0))>=0) // removing leading whitespace
      path = path.slice(1);

    while ('\n\t\r\\'.indexOf(path.charAt(path.length - 1))>=0) // removing trailing whitespace and trailing slashes
      path = path.slice(0, path.length - 1);

    if (path.charAt(0) !== '/') // ensuring leading slash
      path = '/' + path;

    path = path.replace(/\/\/*/g, '/'); // replacing duplicate slashes with single

    return path;
  }

  export function getSafeAttributeName(caseSensitiveName: string): string {
    if (caseSensitiveName.toLowerCase() === caseSensitiveName
       && caseSensitiveName.indexOf('^')<0)
      return caseSensitiveName;
    var result: string[] = [];
    for (var i = 0; i < caseSensitiveName.length; i++) {
      var c = caseSensitiveName.charAt(i);
      if (c === '^' || c.toLowerCase() !== c)
        result.push('^');

      result.push(c);
    }
    return result.join('');
  }

	export function readNodeFileContent(node: HTMLElement) {
    return node ? node.textContent || (node.innerText ? node.innerText.replace(/\r\n/g, '\n') : '') : '';
  }

}