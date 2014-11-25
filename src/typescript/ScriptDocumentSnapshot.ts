module teapo.typescript {
  
  export class ScriptDocumentSnapshot implements TypeScript.IScriptSnapshot {

    changes: TypeScript.TextChangeRange[];

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
        this._lineStartPositions = TypeScript.TextUtilities.parseLineStarts(this._text);
      return this._lineStartPositions;
    }

    getChangeRange(oldSnapshot: TypeScript.IScriptSnapshot): TypeScript.TextChangeRange {

      if (!this.changes.length)
        return TypeScript.TextChangeRange.unchanged;

      var typedOldSnapshot = <ScriptDocumentSnapshot>oldSnapshot;
      var chunk = typedOldSnapshot.changes ?
        this.changes.slice(typedOldSnapshot.changes.length) :
        this.changes;

      var result = TypeScript.TextChangeRange.collapseChangesAcrossMultipleVersions(chunk);

      return result;

    }


  }
  
}