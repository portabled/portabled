module portabled.docs.types.text.ts_ {
  
  export class CodeMirrorCompletion implements CodeMirror.showHint.Completion {

    text: string;
    from: CodeMirror.Pos;
    to: CodeMirror.Pos;

    constructor(
      private lead: string,
      private prefix: string,
      private suffix: string,
      private trail: string,
      private lineNum: number,
      private _entry: ts.CompletionEntry,
      private _details: ts.CompletionEntryDetails) {
      this.text = this._entry.name;
      this.from = CodeMirror.Pos(lineNum, lead.length);
      this.to = CodeMirror.Pos(lineNum, lead.length + prefix.length + suffix.length);
    }

    render(element: HTMLElement, self, data) {
      var skipVerbose = 0;
      if (this._details.displayParts.length > 3
        && this._details.displayParts[0].text === '('
        && this._details.displayParts[2].text === ')')
        skipVerbose = 3;

      element.appendChild(createSpan(
        this._entry.kind.charAt(0),
        'portabled-completion-icon portabled-completion-icon-' + this._entry.kind));

      renderSyntaxPart(this._details.displayParts, element, this.text);

      if (this._details.documentation && this._details.documentation.length) {
        var docSpan = document.createElement('span');
        docSpan.className = 'portabled-syntax-docs';
        setTextContent(docSpan, ' // ');
        renderSyntaxPart(this._details.documentation, docSpan);
        element.appendChild(docSpan);
      }
    }
    
  }

  var _useTextContent = -1;
  function createSpan(text: string, className: string) {
    var span = document.createElement('span');
    if (_useTextContent === -1)
      _useTextContent = 'textContent' in span ? 1:0;
    if (_useTextContent)
      span.textContent = text;
    else
      span.innerText = text;
    span.className = className;
    return span;
  }
  
}