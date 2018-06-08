function fadeToUI() {
  sz.update();
  shell.style.opacity = '0';
  shell.style.filter = 'alpha(opacity=0)'; // TODO: feature-detect and do either one or another
  shell.style.display = 'block';

  if (loader.delayed_shell_html) {
    loader.delayed_shell_html();
  }

  var start = +new Date();
  var fadeintTime = Math.min(500, (start-timings.domStarted)/2);

  var animateFadeIn: any = setInterval(animateStep, 20);

  function animateStep() {
    var passed = (+new Date()) - start;
    var opacity = Math.min(passed, fadeintTime) / fadeintTime;

    boot.style.opacity = (1 - opacity).toString();
    boot.style.filter = 'alpha(opacity=' + (((1-opacity) * 100) | 0) + ')'; // TODO: feature-detect and do either one or another

    shell.style.opacity = <any>opacity;
    shell.style.filter = 'alpha(opacity=' + ((opacity * 100) | 0) + ')'; // TODO: feature-detect and do either one or another

    if (passed >= fadeintTime) {
      shell.style.opacity = <any>1;
      shell.style.filter = 'alpha(opacity=100)';
      boot.style.opacity = <any>0;
      boot.style.filter = 'alpha(opacity=0)';

      if (animateFadeIn) {
        sz.update();
        clearInterval(animateFadeIn);
        animateFadeIn = 0;
        setTimeout(function() { // slight delay for better opacity smoothness
          sz.update();
          if (boot.parentElement)
            boot.parentElement.removeChild(boot);
          shell.style.opacity = null;
          shell.style.filter = null;

          if (document.title==='//.')
            document.title = '//:';

        }, 1);
      }
    }
  }
} // fadeToUI
