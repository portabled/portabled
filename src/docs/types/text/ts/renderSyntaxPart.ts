module portabled.docs.types.text.ts_ {

  export function renderSyntaxPart(syntax: ts.SymbolDisplayPart[], element: HTMLElement, skipUntil?: string): void {
    var skipping = skipUntil ? true : false;

    for (var i = 0; i < syntax.length; i++) {
      var p = syntax[i];
      if (!p.text) continue;

      if (skipping) {
        if (p.text === skipUntil)
          skipping = false;
        else
        	continue;
      }

      var sp = document.createElement('span');
      setTextContent(sp, p.text);
      sp.className = 'portabled-syntax-'+p.kind;

      element.appendChild(sp);
    }
  }

  
}