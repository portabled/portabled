module portabled.app {

  export function start() {

    loading('Initialising the application...');


    koBindingHandlers.register(ko);

    // Cleanup of the HTML for fishy scripts and remnants of the dialog windows.
    //
    // Some fishy internet providers (looking at you, Vodafone)
    // inject their scripts indiscriminately into every served web page.
    // These needs to be removed from DOM
    // at least to avoid saving them with the document.
    //
    // Dialog windows implemented as HTML DIVs may survive if document is saved.
    // That stuff can be safely removed (it appears at the end of DOM body).

    removeSpyScripts();
    removeTrailElements();
    
    addEventListener(window, 'load',() => {
      // this may never be executed, if window is already loaded
      removeSpyScripts();
      removeTrailElements();
    });


    loading('Restoring the setup...');

    var layout = new portabled.app.appRoot.PageModel();

    loading('Rendering...');

    ko.applyBindings(layout, document.body);

    loading('Processing...');
    layout.loadFromDOM(() => {

      setTimeout(() => {
        runStartScripts(() => {
          loading(null);
        });
      }, 1);

    });

  }
    
  var startScripts: { (completed: () => void): void; }[] = [];

  export module start {
    
    export function addStartScript(script: (completed: () => void) => void ) {
      startScripts.push(script);
    }
    
  }
  
  function runStartScripts(completed: () => void) {
    var completionInvoked = false;
    invokeNextStartupScript();

    function invokeNextStartupScript() {
      if (!startScripts.length) {
        if (!completionInvoked) {
          completionInvoked = true;
          setTimeout(() => {
            completed();
          }, 1);
        }
        return;
      }

      var nextScript = startScripts.shift();
      nextScript(() => { 
        invokeNextStartupScript();
      });

      setTimeout(invokeNextStartupScript, 1);
    }
  }
    
  function removeSpyScripts() {
    var spyScripts: Element[] = [];
    for (var i = 0; i < document.scripts.length; i++) {
      if (document.scripts[i].getAttribute('data-legit') !== 'portabled')
        spyScripts.push(document.scripts[i]);
    }
    
    for (var i = 0; i < spyScripts.length; i++) {
      spyScripts[i].parentNode.removeChild(spyScripts[i]);
    }
  }

  function removeTrailElements() {
    var lastDIV = document.getElementById('portabled-last-element');
    while (lastDIV && lastDIV.nextSibling) {
      lastDIV.nextSibling.parentNode.removeChild(lastDIV.nextSibling);
    }
  }

}