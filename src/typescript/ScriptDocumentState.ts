module portabled.typescript {
  
  export class ScriptDocumentState {

    private _snapshot: ScriptDocumentSnapshot = null;

    constructor(public doc: ExternalDocument) {
    }

    getScriptSnapshot() {
      //if (!this._snapshot || this._snapshot.changes.length != this.doc.changes().length)
        this._snapshot = new ScriptDocumentSnapshot(this.doc);
      return this._snapshot;
    }

    getScriptVersion() {
      var changes = this.doc.changes();
      return changes.length;
    }

  }
  
}