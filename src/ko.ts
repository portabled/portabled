/// <reference path='typings/knockout.d.ts' />

module teapo {
  export function registerKnockoutBindings(ko: KnockoutStatic) {
    (<any>ko.bindingHandlers).attach = {
      init: function(element, valueAccessor) {
          valueAccessor();
      }
    };
  }
}