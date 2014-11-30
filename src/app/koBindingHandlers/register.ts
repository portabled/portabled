module portabled.app.koBindingHandlers {

  export function register(ko) {

    for (var k in portabled.app.koBindingHandlers) if (portabled.app.koBindingHandlers.hasOwnProperty(k)) {
      var bindingHandler = portabled.app.koBindingHandlers[k];
      if (bindingHandler && typeof bindingHandler === 'object')
        ko.bindingHandlers[k] = bindingHandler;
    }

  }
  
}