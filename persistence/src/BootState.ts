class BootState {

  domTimestamp: number = null;
  domTotalSize: number = null;
  domLoadedSize: number = null;
  loadedFileCount: number = null;
  storageName: string = null;
  storageTimestamp: number = null;
  storageLoadFailures: { [storage: string]: string; } = {};

  newDOMFiles: string[] = [];
  newStorageFiles: string[] = [];

	ondomnode: (node: any, recognizedKind: 'file' | 'totals', recognizedEntity: any) => void = null;

  private _byPath: { [path: string]: DOMFile; } = {};

  private _totals: DOMTotals = null;

  private _completion: (drive: persistence.Drive) => void = null;

  private _anticipationSize = 0;
  private _lastNode: Node = null;

  private _currentOptionalDriveIndex = 0;
  private _shadowFinished = false;
  private _detachedDrive: persistence.Drive.Detached = null; // sometimes it lingers here until DOM timestamp is ready
  private _shadow: persistence.Drive.Shadow = null;
  private _toUpdateDOM: { [path: string]: any; } = null;
  private _toForgetShadow: string[] = [];
  private _domFinished = false;
  private _reportedFiles: any = {};

  private _newDOMFileCache: any = {};
  private _newStorageFileCache: any = {};

  constructor(
    private _document: Document,
    private _uniqueKey: string,
    private _optionalDrives: persistence.Drive.Optional[] = [attached.indexedDB, attached.webSQL, attached.localStorage]) {

    this._loadNextOptionalDrive();

  }

  read(path: string) {
    if (this._toUpdateDOM && path in this._toUpdateDOM)
      return this._toUpdateDOM[path];
    var f = this._byPath[path];
    if (f) return f.read();
    else return null;
  }

  continueLoading() {
    if (!this._domFinished)
      this._continueParsingDOM(false /* toCompletion */);

    this.newDOMFiles = [];
    for (var k in this._newDOMFileCache) {
      if (k && k.charCodeAt(0)==47)
        this.newDOMFiles.push(k);
    }
    this._newDOMFileCache = {};

    this.newStorageFiles = [];
    for (var k in this._newStorageFileCache) {
      if (k && k.charCodeAt(0)==47)
        this.newStorageFiles.push(k);
    }
    this._newStorageFileCache = {};
  }

  finishParsing(completion: (drive: persistence.Drive) => void) {
    if (this._domFinished) {
      try {
        // when debugging, break on any error will hit here too
        throw new Error('finishParsing should only be called once.');
      }
      catch (error) {
        if (typeof console !== 'undefined' && console && typeof console.error==='function')
          console.error(error);
      }
    }

    this._completion = completion;
    this._continueParsingDOM(true /* toCompletion */);
  }

  private _processNode(node: Node) {
    var cmheader = new CommentHeader(<Comment>node);

    var file = DOMFile.tryParse(cmheader);
    if (file) {
      this._processFileNode(file);
      if (typeof this.ondomnode==='function') {
        this.ondomnode(node, 'file', file);
      }
      return;
    }

    var totals = DOMTotals.tryParse(cmheader);
    if (totals) {
      this._processTotalsNode(totals);
      if (typeof this.ondomnode==='function') {
        this.ondomnode(node, 'totals', totals);
      }
      return;
    }

    if (typeof this.ondomnode==='function') {
      this.ondomnode(node, null, null);
    }

  }

  private _processTotalsNode(totals: DOMTotals) {
    if (this._totals) {
      this._removeNode(totals.node);
    }
    else {
      this._totals = totals;
      this.domTimestamp = totals.timestamp;
      this.domTotalSize = Math.max(totals.totalSize, this.domTotalSize|0);

      var detached = this._detachedDrive;
      if (detached) {
        this._detachedDrive = null;
        this._compareTimestampsAndProceed(detached);
      }
    }
  }

  private _processFileNode(file: DOMFile) {
    if (this._byPath[file.path]) { // a file with this name was encountered before
      // prefer earlier nodes
      this._removeNode(file.node);
      return;
    }

    // no updating nodes until whole DOM loaded
    // (looks like some browsers get confused by updating DOM during loading)

    this._byPath[file.path] = file;
    this._newDOMFileCache[file.path] = true;

    this.loadedFileCount++;
    this.domLoadedSize += file.contentLength;
    this.domTotalSize = Math.max(this.domTotalSize, this.domLoadedSize);
  }

  private _removeNode(node: Node) {
    var parent = node.parentElement || node.parentNode;
    if (parent) parent.removeChild(node);
  }

  private _continueParsingDOM(toCompletion: boolean){

    this.domLoadedSize -= this._anticipationSize;
    this._anticipationSize = 0;

    while (true) {

      // keep very last node unprocessed until whole document loaded
      // -- that means each iteration we find the next node, but process this._lastNode
      var nextNode = this._getNextNode();

      if (!nextNode && !toCompletion) {

        // no more nodes found, but more expected: no processing at this point
        // -- but try to estimate what part of the last known node is loaded (for better progress precision)
        if (this._lastNode && this._lastNode.nodeType===8) {
          var cmheader = new CommentHeader(<Comment>this._lastNode);
          var speculativeFile = DOMFile.tryParse(cmheader);
          if (speculativeFile) {
            this._anticipationSize = speculativeFile.contentLength;
            this.domLoadedSize = this.domLoadedSize + this._anticipationSize;
            this.domTotalSize = Math.max(this.domTotalSize, this.domLoadedSize); // total should not become less that loaded
          }
        }
        return;
      }

      if (this._lastNode && this._lastNode.nodeType===8) {
        this._processNode(<Comment>this._lastNode);
      }
      else {
        if (typeof this.ondomnode==='function') {
          this.ondomnode(this._lastNode, null, null);
        }
      }

      if (!nextNode) {
        // finish
        this._lastNode = null;
        this._processDOMFinished();
        return;
      }

      this._lastNode = nextNode;
    }
  }

  private _processDOMFinished() {

    this._domFinished = true;

    if (this._toUpdateDOM) {

      // these are updates from attached storage that have not been written out
      // (because files with corresponding paths don't exist in DOM)

      for (var path in this._toUpdateDOM) {
        let entry: { content, encoding };
        if (!path || path.charCodeAt(0)!==47) continue; // expect leading slash
        var content = this._toUpdateDOM[path];
        if (content && content.content && content.encoding) {
          entry = content; // content could be string or { content, encoding }
        }

        if (content===null) {
          var f = this._byPath[path];
          if (f) {
            delete this._byPath[path];
            this._removeNode(f.node);
          }
          else {
            if (this._shadow) this._shadow.forget(path);
            else this._toForgetShadow.push(path);
          }
        }
        else if (typeof content!=='undefined') {
          var f = this._byPath[path];
          if (f) {
            if (!entry)
              entry = bestEncode(content); // it could already be { content, encoding }

            var modified = f.write(entry.content, entry.encoding);
            if (!modified) {
              if (this._shadow) this._shadow.forget(path);
              else this._toForgetShadow.push(path);
            }
          }
          else {
            var anchor = this._findAnchor();
            var comment = document.createComment('');
            var f = new DOMFile(comment, path, null, 0, 0);
            entry = bestEncode(content);
            f.write(entry.content, entry.encoding);
            this._byPath[path] = f;
            this._newDOMFileCache[path] = true;
            this._document.body.insertBefore(f.node, anchor);
          }
        }
      }
    }

    if (this._shadowFinished) {
      this._allCompleted();
      return;
    }

    var detached = this._detachedDrive;
    if (detached) {
      this._detachedDrive = null;
      this._compareTimestampsAndProceed(detached);
    }
  }

  private _finishUpdateTotals() {
    if (this._totals) {
      if (this.storageTimestamp > this.domTimestamp) {
        this._totals.timestamp = this.storageTimestamp;
        this._totals.updateNode();
      }
    }
  }

  private _getNextNode() {
    if (!this._lastNode) {
      var head = this._document.head || this._document.getElementsByTagName('head')[0] as HTMLElement;
      if (head) {
        var next = head.firstChild;
        if (next) return next;
      }
      var body = this._document.body;
      if (body)
        return body.firstChild;
      return null;
    }

    var nextNode = this._lastNode.nextSibling;
    if (!nextNode) {
      var body = this._document.body || null;
      var lastNodeParent = this._lastNode.parentNode || this._lastNode.parentElement || null;
      if (lastNodeParent!==body)
        nextNode = body.firstChild;
    }
    return nextNode;
  }

  private _loadNextOptionalDrive() {
    if (this._currentOptionalDriveIndex >= this._optionalDrives.length) {

      this._finishOptionalDetection();
      return;
    }

    var nextDrive = this._optionalDrives[this._currentOptionalDriveIndex];
    nextDrive.detect(this._uniqueKey, (error, detached) => {
      if (detached) {
        this.storageName = nextDrive.name;
        this._shadowDetected(detached);
      }
      else {
        this.storageLoadFailures[nextDrive.name] = error || 'Empty return.';
        this._currentOptionalDriveIndex++;
        this._loadNextOptionalDrive();
      }
    });
  }

  private _shadowDetected(detached: persistence.Drive.Detached) {
    this.storageTimestamp = detached.timestamp;
    if (this._totals || this._domFinished)
      this._compareTimestampsAndProceed(detached);
    else
      this._detachedDrive = detached;
  }

  private _compareTimestampsAndProceed(detached: persistence.Drive.Detached) {
    var domRecent: boolean;
    if (detached.timestamp && detached.timestamp > this.domTimestamp) domRecent = false;
    else if (!detached.timestamp && !this.domTimestamp) domRecent = false;
    else domRecent = true;

    if (domRecent) {
      detached.purge(shadow => {
        this._shadow = shadow;
        this._finishOptionalDetection();
      });
    }
    else {
      this._toUpdateDOM = {};
      detached.applyTo({
        timestamp: this.domTimestamp,
        write: (path: string, content: any, encoding: string) => {
          this._applyShadowToDOM(path, content, encoding);
        }
      }, shadow => {
        this._shadow = shadow;
        this._finishOptionalDetection();
      });
    }
  }

  private _applyShadowToDOM(path: string, content: any, encoding: string) {
    if (this._domFinished) {

      var file = this._byPath[path];
      if (file) {
        if (content===null) {
          this._removeNode(file.node);
          delete this._byPath[path];
        }
        else {
          var modified = file.write(content, encoding);
          if (!modified)
            this._toForgetShadow.push(path);
        }
      }
      else {
        if (content===null) {
          this._toForgetShadow.push(path);
        }
        else {
          var anchor = this._findAnchor();
          var comment = document.createComment('');
          var f = new DOMFile(comment, path, null, 0, 0);
          f.write(content, encoding);
          this._document.body.insertBefore(f.node, anchor);
          this._byPath[path] = f;
          this._newDOMFileCache[path] = true;
        }
      }
      this._newStorageFileCache[path] = true;
    }
    else {
      this._toUpdateDOM[path] = encoding ? { content, encoding } : content;
      this._newStorageFileCache[path] = true;
    }
  }

  private _findAnchor() {
    var anchor: Node = null;
    for (var k in this._byPath) if (k && k.charCodeAt(0)===47) {
      anchor = this._byPath[k].node;
    }
    if (!anchor) {
      var scripts = this._document.getElementsByTagName('script');
      anchor = scripts[scripts.length-1];
    }
    return anchor;
  }

  private _finishOptionalDetection() {

    if (this._shadow) {
      for (var i = 0; i < this._toForgetShadow.length; i++) {
        this._shadow.forget(this._toForgetShadow[i]);
      }
    }

    this._shadowFinished = true;

    if (this._domFinished){
      this._allCompleted();
    }
  }

  private _allCompleted() {
    this._finishUpdateTotals();

    var domFiles: DOMFile[] = [];
    for (var path in this._byPath) {
      if (!path || path.charCodeAt(0)!==47) continue; // expect leading slash
      domFiles.push(this._byPath[path]);
    }

    var domDrive = new DOMDrive(this._totals, domFiles, this._document);
    var mountDrive = new MountedDrive(domDrive, this._shadow);
    this._completion(mountDrive);
  }
}