module persistence.dom {

  export class DOMDrive implements Drive {

    private _byPath: { [path: string]: DOMFile; } = {};
    private _anchorNode: Node = null;

    public timestamp: number;

    constructor(
      private _totals: DOMTotals,
      files: DOMFile[],
      private _document: DOMDrive.DocumentSubset) {

      this.timestamp = this._totals ? this._totals.timestamp : 0;

      for (var i = 0; i < files.length; i++) {
        this._byPath[files[i].path] = files[i];
        if (!this._anchorNode) this._anchorNode = files[i].node;
      }
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

    write(file: string, content: string) {

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
          f.write(content);
          totalDelta += f.contentLength - lengthBefore;
        }
        else { // addition
          var comment = document.createComment('');
          var f = new DOMFile(comment, file, null, 0, 0);
          f.write(content);
          // try to insert at the start, so new files will be loaded first
          var anchor = this._anchorNode;
          if (!anchor || anchor.parentElement != this._document.body) {
            // this happens when filesystem is empty, or nodes got removed
            anchor = this._document.body.getElementsByTagName('script')[0];
            if (anchor) anchor = getNextNode(anchor);
            if (anchor) this._anchorNode = anchor;
          }

          this._document.body.insertBefore(f.node, anchor);
          this._anchorNode = f.node; // next time insert before this node
          this._byPath[file] = f;
          totalDelta += f.contentLength;
        }
      }

      this._totals.timestamp = this.timestamp;
      this._totals.updateNode();
    }

  }

  function getNextNode(node: Node) {
    var result = node.nextSibling;
    if (!result && node.parentNode)
      result = node.parentNode.nextSibling;
    return result;
  }

  export module DOMDrive {

    export interface DocumentSubset {
      body: HTMLBodyElementSubset;

      createComment(data: string): Comment;
    }

    export interface HTMLBodyElementSubset {
      appendChild(node: Node);
      insertBefore(newChild: Node, refNode?: Node);
      getElementsByTagName(tag: string): NodeList;
      firstChild: Node;
    }
  }
}