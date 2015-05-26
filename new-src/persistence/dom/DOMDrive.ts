module persistence.dom {

  export class DOMDrive implements Drive {

    private _byPath: { [path: string]: DOMFile; } = {};

    public timestamp: number;

    constructor(
      private _totals: DOMTotals,
      files: DOMFile[],
      private _document: DOMDrive.DocumentSubset) {

      this.timestamp = this._totals ? this._totals.timestamp : 0;

      for (var i = 0; i < files.length; i++) {
        this._byPath[files[i].path] = files[i];
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
          f.node.parentElement.removeChild(f.node);
          delete this._byPath[file];
        }
      }
      else {
        // addition
        if (f) {
          var lengthBefore = f.contentLength;
          f.write(content);
          totalDelta += f.contentLength - lengthBefore;
        }
        else {
          var comment = document.createComment('');
          var f = new DOMFile(comment, file, null, 0, 0);
          f.write(content);
          this._document.body.appendChild(f.node);
          totalDelta += f.contentLength;
        }
      }

      this._totals.timestamp = this.timestamp;
      this._totals.updateNode();
    }

  }

  export module DOMDrive {

    export interface DocumentSubset {
      body: HTMLBodyElementSubset;

      createComment(data: string): Comment;
    }

    export interface HTMLBodyElementSubset {
      appendChild(node: Node);
      insertBefore(newChild: Node, refNode?: Node);
      firstChild: Node;
    }
  }
}