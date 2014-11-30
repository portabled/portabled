module portabled.typescript {
  
  export class ScriptDocumentSnapshot implements ts.IScriptSnapshot {

    changes: ts.TextChangeRange[];

    private _text: string;
    private _lineStartPositions: number[] = null;

    constructor(doc: ExternalDocument) {
      this._text = doc.text();
      this.changes = doc.changes();
    }

    getText(start: number, end: number): string {
      return this._text.slice(start, end);
    }

    getLength(): number {
      return this._text.length;
    }

    getLineStartPositions(): number[] {
      if (!this._lineStartPositions)
        this._lineStartPositions = ts.computeLineStarts(this._text);
      return this._lineStartPositions;
    }

    getChangeRange(oldSnapshot: ts.IScriptSnapshot): ts.TextChangeRange {

      if (!this.changes.length)
        return ts.TextChangeRange.unchanged;

      var typedOldSnapshot = <ScriptDocumentSnapshot>oldSnapshot;
      var chunk = typedOldSnapshot.changes ?
        this.changes.slice(typedOldSnapshot.changes.length) :
        this.changes;

      var result = ts.TextChangeRange.collapseChangesAcrossMultipleVersions(chunk);

      return result;

    }


  }
  
}