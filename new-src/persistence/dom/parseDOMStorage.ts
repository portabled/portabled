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

    function continueParsingDOM(finish: boolean) {
      if (document.body) {
        if (!lastNode)
          lastNode = document.body.firstChild;

        while (true) {
          if (!lastNode) return;
          else if (!finish && lastNode == document.body.lastChild) return;


          if (lastNode.nodeType === 8) {
            processNode(<Comment>lastNode);
          }

          lastNode = lastNode.nextSibling;
        }
      }
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
      body: HTMLBodyElementSubset;
    }

    export interface HTMLBodyElementSubset extends DOMDrive.HTMLBodyElementSubset {
      lastChild: Node;
    }

  }

}