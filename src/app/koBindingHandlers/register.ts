module teapo.app.koBindingHandlers {

  export function register(ko) {

    for (var k in teapo.app.koBindingHandlers) if (teapo.app.koBindingHandlers.hasOwnProperty(k)) {
      var bindingHandler = teapo.app.koBindingHandlers[k];
      if (bindingHandler && typeof bindingHandler === 'object')
        ko.bindingHandlers[k] = bindingHandler;
    }

  }
  
}