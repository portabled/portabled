/// <reference path='typings/typescriptServices.d.ts' />

class DocumentState implements TypeScript.IScriptSnapshot {

  private _version = 0;
  private _changes: TypeScript.TextChangeRange[] = [];

  constructor(private _doc: CodeMirror.Doc) {
    CodeMirror.on(this._doc, 'change', (e,doc,change) => this._onChange(change));
  }

  /**
   * Not a part of IScriptSnapshot, unlike other public methods here.
   * Need to find out who's calling into this (and kill them, naturally).
   */
  getVersion(): number {
    return this._version;
  }

  getText(start: number, end: number): string {
    var startPos = this._doc.posFromIndex(start);
    var endPos = this._doc.posFromIndex(end);
    var text = this._doc.getRange(startPos, endPos);
    return text;
  }

  getLength(): number {
    var lineCount = this._doc.lineCount();
    if (lineCount===0)
      return 0;

    var lastLineStart = this._doc.indexFromPos({line:lineCount-1,ch:0});
    var lastLine = this._doc.getLine(lineCount-1);
    return lastLineStart + lastLine.length;
  }

  getLineStartPositions(): number[] {
    var result: number[] = [];
    var current = 0;
    this._doc.eachLine((lineHandle) => {
      result.push(current);
      current += lineHandle.text.length+1; // plus EOL character
    });
    return result;
  }

  getTextChangeRangeSinceVersion(scriptVersion: number): TypeScript.TextChangeRange {
    var startVersion = this._version - this._changes.length;

    if (scriptVersion < startVersion) {
      var wholeText = this._doc.getValue();
      return new TypeScript.TextChangeRange(
        TypeScript.TextSpan.fromBounds(0,0),
        wholeText.length);
    }

    var chunk: TypeScript.TextChangeRange[];

     if (scriptVersion = startVersion)
      chunk = this._changes;
    else
      chunk = this._changes.slice(scriptVersion - startVersion);
    this._changes.length = 0;
    return TypeScript.TextChangeRange.collapseChangesAcrossMultipleVersions(this._changes);
  }


  private _onChange(change): void {
    var offset = this._doc.indexFromPos(change.from);
    var oldLength = this._totalLengthOfLines(change.removed);
    var newLength = this._totalLengthOfLines(change.text);

    var ch = new TypeScript.TextChangeRange(
        TypeScript.TextSpan.fromBounds(offset, offset+oldLength),
        newLength);

    this._changes.push(ch) ;

    this._version++;
  }
                        
  private _totalLengthOfLines(lines: string[]): number {
    var length = 0;
    for (var i = 0; i < lines.length; i++) {
      if (i>0)
        length++; // '\n'

      length += lines[i].length;
    }
    return length;
  }
}