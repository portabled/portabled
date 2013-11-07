/// <reference path='typings/knockout.d.ts' />

/// <reference path='layout.ts' />

module teapo {
  export function registerKnockoutBindings(ko: KnockoutStatic) {
      (<any>ko.bindingHandlers).child = {
        update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
          cleanContent(element);
          var value = valueAccessor();
          if (value.childNodes) {
            element.appendChild(value);
          }
          else if (element!==null && typeof element !== 'undefined' ) {
            if ('textContent' in element)
              element.textContent = value;
            else if ('innerText' in element)
              element.innerText = value;
          }
        }
      };
    
    (<any>ko.bindingHandlers).codemirror = {
      init: function(element, valueAccessor) {
        if (!element)
          return;

        var codemirror: CodeMirror.Editor;
        if (element.tagName.toLowerCase()==='textarea') {
          codemirror = CodeMirror.fromTextArea(element);
        }
        else {
          codemirror = CodeMirror(element);
        }

        var observable = valueAccessor();
        if (observable)
          observable(codemirror);
      }
    };

    (<any>ko.bindingHandlers).attach = {
      update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
          valueAccessor();
      }
    };

  }
}