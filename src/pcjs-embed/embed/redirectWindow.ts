module shell {

  export function redirectWindow(drive: persistence.Drive, window: Window, cachePath: string, cwd: string) {

    function WindowOverride() {
      var _this = this;

      var xhrOverride = redirectXMLHttpRequest(drive, cwd);
      var lsOverride = redirectLocalStorage(drive, cachePath);
      Object.defineProperty(this, 'XMLHttpRequest', { get: function() { return xhrOverride; } });
      Object.defineProperty(this, 'localStorage', { get: function() { return lsOverride; } });
      Object.defineProperty(this, 'window', { get: function() { return _this; } });
      var _onload;
      Object.defineProperty(this, 'onload', { get: function() { return _onload; }, set: function(v) { _onload = v; } });
      Object.defineProperty(this, 'addEventListener', {
        get: function() {
          return function(evtName: string, handler: any, other: any) {
            if (evtName === 'unload') {
              _this.onunload = handler;
            }
            else if (evtName === 'onbeforeunload') {
              _this.onbeforeunload = handler;
            }
            else {
              window.addEventListener(evtName, handler, other);
            }
          }
        }
      });
      Object.defineProperty(this, 'alert', { get: function() { function redirectAlert(msg) { window.console.log('alert', msg); }; return redirectAlert; } });

      function defineProxy(k) {
        Object.defineProperty(_this, k, {
          get: function() {
            var res: any = window[k];
            if (typeof res === 'function' && !/pcjs/.test(k)) {
              return (<Function>res).bind(window);
            }
            return res;
          },
          set: function(v) {
            window[k] = v;
          }
        });
      }
      for (var k in window) {
        if (!(k in this)) {
          defineProxy(k);
        }
      }
      if (Object.getOwnPropertyNames) {
        var props = Object.getOwnPropertyNames(window)
        for (var i = 0; i < props.length; i++) {
          if (!(props[i] in this)) {
            defineProxy(props[i]);
          }
        }
      }


    }

    var win: Window = new WindowOverride();

    return win;
  }

}