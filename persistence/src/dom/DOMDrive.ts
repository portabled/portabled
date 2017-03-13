class DOMDrive implements persistence.Drive {

  private _byPath: { [path: string]: DOMFile; } = {};
  private _anchorNode: Node = null;
  private _totalSize = 0;

  public timestamp: number;

  constructor(
    private _totals: DOMTotals,
    files: DOMFile[],
    private _document: DOMDrive.DocumentSubset) {

    for (var i = 0; i < files.length; i++) {
      this._byPath[files[i].path] = files[i];
      this._totalSize += files[i].contentLength;
      if (!this._anchorNode) this._anchorNode = files[i].node;
    }

    if (!this._totals) {
      var comment = this._document.createComment('');
      var parent: any = this._document.head || this._document.getElementsByTagName('head')[0] || this._document.body;
      parent.insertBefore(comment, parent.children ? parent.children[0] : null);
      this._totals = new DOMTotals(0, this._totalSize, comment);
    }

    this.timestamp = this._totals.timestamp;
  }

  files(): string[] {

    if (typeof Object.keys === 'string') {
      var result = Object.keys(this._byPath);
    }
    else {
      var result: string[] = [];
      for (var k in this._byPath) if (this._byPath.hasOwnProperty(k)) {
        result.push(k);
      }
    }

    result.sort();

    return result;
  }

  read(file: string): string {
    var file = normalizePath(file);
    var f = this._byPath[file];
    if (!f)
      return null;
    else
      return f.read();
  }

  storedSize(file: string): number {
    var file = normalizePath(file);
    var f = this._byPath[file];
    if (!f)
      return null;
    else
      return f.contentLength;
  }

  write(file: string, content: string, encoding?: string) {

    var totalDelta = 0;

    var file = normalizePath(file);
    var f = this._byPath[file];

    if (content === null) {
      // removal
      if (f) {
        totalDelta -= f.contentLength;
        var parentElem = f.node.parentElement || f.node.parentNode;
        parentElem.removeChild(f.node);
        delete this._byPath[file];
      }
    }
    else {
      if (f) { // update
        var lengthBefore = f.contentLength;
        if (!f.write(content, encoding)) return; // no changes - no update for timestamp/totals
        totalDelta += f.contentLength - lengthBefore;
      }
      else { // addition
        var comment = document.createComment('');
        var f = new DOMFile(comment, file, null, 0, 0);
        f.write(content, encoding);

        this._anchorNeeded();

        this._document.body.insertBefore(f.node, this._anchorNode);
        this._anchorNode = f.node; // next time insert before this node
        this._byPath[file] = f;
        totalDelta += f.contentLength;
      }
    }

    this._totals.timestamp = this.timestamp;
    this._totals.totalSize += totalDelta;
    this._totals.updateNode();
  }

  loadProgress() {
    return { total: this._totals ? this._totals.totalSize : this._totalSize, loaded: this._totalSize };
  }

  continueLoad(entry: DOMFile | DOMTotals) {

    if (!entry) {
      this.continueLoad = null;
      this._totals.totalSize = this._totalSize;
      this._totals.updateNode();
      return;
    }

    if ((<any>entry).path) {
      var file = <DOMFile>entry;
      // in case of duplicates, prefer earlier, remove latter
      if (this._byPath[file.path]) {
        if (!file.node) return;
        var p = file.node.parentElement || file.node.parentNode;
        if (p) p.removeChild(file.node);
        return;
      }

      this._byPath[file.path] = file;
      if (!this._anchorNode) this._anchorNode = file.node;
      this._totalSize += file.contentLength;
    }
    else {
      var totals = <DOMTotals>entry;
      // consider the values, but throw away the later totals DOM node
      this._totals.timestamp = Math.max(this._totals.timestamp, totals.timestamp|0);
      this._totals.totalSize = Math.max(this._totals.totalSize, totals.totalSize|0);
      if (!totals.node) return;
      var p = totals.node.parentElement || totals.node.parentNode;
      if (p) p.removeChild(totals.node);
    }
  }

  private _anchorNeeded() {
    // try to insert at the start, so new files will be loaded first
    var anchor = this._anchorNode;
    if (anchor && anchor.parentElement === this._document.body) return;

    // this happens when filesystem is empty, or nodes got removed
    // - we try not to bubble above scripts, so boot UI is rendered fast even on slow connections
    var scripts = this._document.body.getElementsByTagName('script');
    anchor = scripts[scripts.length-1];
    if (anchor) {
      var next = anchor.nextSibling;
      if (!next && anchor.parentNode)
        next = anchor.parentNode.nextSibling;
      anchor = next;
    }

    if (anchor) this._anchorNode = anchor;
  }

}

namespace DOMDrive {

  export interface DocumentSubset {
    body: HTMLBodyElementSubset;
    head: Node;

    createComment(data: string): Comment;

    getElementsByTagName(tag: string): { [index: number]: Node; length: number };
  }

  export interface HTMLBodyElementSubset {
    appendChild(node: Node);
    insertBefore(newChild: Node, refNode?: Node);
    getElementsByTagName(tag: string): NodeList;
    firstChild: Node;
    children: { [index: number]: Node; length: number; };
  }
}