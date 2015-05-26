function shellLoader(uniqueKey: string, document: Document, boot: shellLoader.BootModuleAPI): shellLoader.ContinueLoading {

  var driveMount = persistence.bootMount(uniqueKey, document);

  return continueLoading();

  function continueLoading(): shellLoader.ContinueLoading {
    driveMount.continueLoading();
    return { continueLoading, finishLoading };
  }

  function finishLoading() {

    driveMount.finishLoading(drive => {

      var uiframe = createFrame();
      uiframe.iframe.style.opacity = '0';

      var wasResized = false;
      var resizeHandlers: any[] = [];
      elem.on(window, 'resize', global_resize_detect);
      elem.on(document.body, 'resize', global_resize_detect);
      elem.on(uiframe.document.body, 'touchstart', global_resize_detect);
      elem.on(uiframe.document.body, 'touchmove', global_resize_detect);
      elem.on(uiframe.document.body, 'touchend', global_resize_detect);
      elem.on(uiframe.document.body, 'pointerdown', global_resize_detect);
      elem.on(uiframe.document.body, 'pointerup', global_resize_detect);
      elem.on(uiframe.document.body, 'pointerout', global_resize_detect);
      elem.on(uiframe.document.body, 'keydown', global_resize_detect);
      elem.on(uiframe.document.body, 'keyup', global_resize_detect);


      (<any>shell_elem).on = elem.on;
      (<any>shell_elem).off = elem.off;

      loadMod({
        path: '/shell/start.js',
        eval: drive.read('/shell/start.ts.js'),
        ui: false,
        scope: {
          require: shell_require,
          document: uiframe.document,
          window: uiframe.global,
          console: window.console,
          elem: shell_elem,
          setText: setText
        }
      });

      function shell_require(moduleName): any {
        switch (moduleName) {
          case 'ui': return uiframe;
          case 'drive': return drive;
          case 'resize': return { on: onresize, off: offresize };
        }

        if ((moduleName + '').charAt(0) === '.') {
          moduleName = '/shell/' + moduleName.slice(2);
        }

        var code = drive.read(moduleName);
        if (code) {
          var mod = loadMod({
            eval: code,
            path: persistence.normalizePath(moduleName),
            ui: false,
            scope: { require: shell_require }
          });
    			return mod.exports;
        }
      }

      function shell_elem(x, y, z) { return (<any>uiframe.global).elem(x, y, z); }

      function onresize(handler) {
        if (typeof handler !== 'function') return;
        resizeHandlers.push(handler);
      }

      function offresize(handler) {
        if (typeof handler !== 'function') return;
        for (var i = 0; i < resizeHandlers.length; i++) {
          if (resizeHandlers[i]===handler) {
            resizeHandlers.splice(i, 1);
          }
        }
      }

      function global_resize_detect() {
        if (wasResized) return;
        wasResized = true;

        if (typeof requestAnimationFrame ==='function') {
          requestAnimationFrame(global_resize_delayed);
        }
        else {
          setTimeout(global_resize_delayed, 5);
        }
      }

      var lastMetrics: any = {};
      function global_resize_delayed() {
        wasResized = false;

        var metrics = getMetrics();
        if (metrics.windowWidth !== lastMetrics.windowWidth
          && metrics.windowHeight !== lastMetrics.windowHeight) {
          lastMetrics = metrics;

          for (var i = 0; i < resizeHandlers.length; i++) {
            var f = resizeHandlers[i];
            if (f)
              f(metrics);
          }
        }
      }

      function getMetrics() {
        var metrics = {
          windowWidth: window.innerWidth || document.body.parentElement.clientWidth || document.body.clientWidth,
          windowHeight: window.innerHeight || document.body.parentElement.clientHeight || document.body.clientHeight
        };
        return metrics;
      }

      var start = new Date().valueOf();
      var fadeintTime = Math.min(500, (new Date().valueOf() - boot.startTime) * 0.9);
      var animateFadeIn = setInterval(function() {
        var passed = new Date().valueOf() - start;
        var opacity = Math.min(passed, fadeintTime) / fadeintTime;
        boot.iframe.style.opacity = (1 - opacity).toString();
        uiframe.iframe.style.opacity = '1';

        if (passed >= fadeintTime) {
          clearInterval(animateFadeIn);
          if (boot.iframe.parentElement) // old Opera may keep firing even after clearInterval
          	boot.iframe.parentElement.removeChild(boot.iframe);
        }
      }, 10);

      //if (typeof console !== 'undefined' && console.log)
      //  console.log(window['dbgDrive'] = drive);

    });

  }

}

module shellLoader {

  export interface BootModuleAPI extends loadMod.LoadedResult {
    api: any;
    startTime: number;
  }

  export interface ContinueLoading {

    continueLoading(): ContinueLoading;

    finishLoading();

  }

}