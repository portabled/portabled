/// <reference path='typings/knockout.d.ts' />

module teapo {
  export function registerKnockoutBindings(_ko: typeof ko) {
    (<any>_ko.bindingHandlers).attach = {
      init: function(element, valueAccessor) {
        valueAccessor();
      }
    };
  }
}


