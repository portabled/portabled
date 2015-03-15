module portabled.typescript {

  export class ScriptDocumentSnapshot implements ts.IScriptSnapshot {

    changes: ts.TextChangeRange[];

    private _text: string;
    private _lineStartPositions: number[] = null;

    constructor(doc: ExternalDocument) {
      this._text = doc.text();
      this.changes = doc.changes().slice(0);
    }

    getText(start: number, end: number): string {
      if (!this._text)
        return '';
      return this._text.slice(start, end);
    }

    getLength(): number {
      if (!this._text)
        return 0;
      return this._text.length;
    }

    getChangeRange(oldSnapshot: ts.IScriptSnapshot): ts.TextChangeRange {

      if (!this.changes.length)
        return ts.unchangedTextChangeRange;

      var typedOldSnapshot = <ScriptDocumentSnapshot>oldSnapshot;
      var chunk = typedOldSnapshot.changes ?
        this.changes.slice(typedOldSnapshot.changes.length) :
        this.changes;

      var result = ts.collapseTextChangeRangesAcrossMultipleVersions(chunk);

      return result;

    }


  }
  
}