module persistence.dom {

  export function parseDOMStorage(document: parseDOMStorage.DocumentSubset): parseDOMStorage.ContinueParsing {

    var loadedFiles: DOMFile[] = [];
    var loadedTotals: DOMTotals;
    var lastNode: Node;
    var loadedSize = 0;

    return continueParsing();

    function continueParsing(): parseDOMStorage.ContinueParsing {

      continueParsingDOM(false);

      return {
        continueParsing,
        finishParsing,
        loadedSize,
        totalSize: loadedTotals ? loadedTotals.totalSize : 0,
        loadedFileCount: loadedFiles.length
      };

    }

    function finishParsing(): DOMDrive {

      continueParsingDOM(true);

      if (loadedTotals) {
        loadedTotals.totalSize = loadedSize;
        loadedTotals.updateNode();
      }

      var drive = new DOMDrive(loadedTotals, loadedFiles, document);

      return drive;
    }

    var processHead;
    function continueParsingDOM(finish: boolean) {
      if (!lastNode) {
        processHead = document.head || document.getElementsByTagName('head')[0];
        if (!processHead) return;
        lastNode = processHead.firstChild;
        if (!lastNode) return;
      }

      while (true) {

        var nextNode = getNextNode();
        if (!nextNode && !finish) return; // do not consume last node until whole document loaded

        if (lastNode.nodeType === 8)
          processNode(<Comment>lastNode);

        if (!nextNode) return; // finish
        lastNode = nextNode;
      }
    }

    function getNextNode() {
        var nextNode = lastNode.nextSibling;
        if (!nextNode && processHead && document.body && (nextNode = document.body.firstChild))
          processHead = null;

        return nextNode;
    }

    function processNode(node: Comment): boolean {
      var cmheader = new CommentHeader(node);

      var file = DOMFile.tryParse(cmheader);
      if (file) {
        loadedFiles.push(file);
        loadedSize += file.contentLength;
        return true;
      }

      var totals = DOMTotals.tryParse(cmheader);
      if (totals)
        loadedTotals = totals;
    }
  }

  export module parseDOMStorage {

    export interface ContinueParsing {

      continueParsing(): ContinueParsing;

      finishParsing(): DOMDrive;

      loadedFileCount: number;
      loadedSize: number;
      totalSize: number;

    }

    export interface DocumentSubset extends DOMDrive.DocumentSubset {
      body: DOMDrive.HTMLBodyElementSubset;
      head: DOMDrive.HTMLBodyElementSubset;
      getElementsByTagName(tagName: string): any;
    }

  }

}