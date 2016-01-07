function bootUI(document: Document, window: Window, base) {

  base.elem(document.body, {
    background: 'black',
    color: 'silver',
    border: 'none',
    overflow: 'hidden',
    fontFamily: 'FixedSys, System, Terminal, Arial, Helvetica, Roboto, Droid Sans, Sans Serif',
    fontWeight: 'bold'
  });

  var monitorBack = base.elem('div', {
    position: 'relative',
    width: '100%', height: '100%',
    padding: '3em',
    background: '#101010',
    opacity: 0,
    transition: 'all 0.1s ease-in',
    webkitTransition: 'all 0.1s ease-in',
    mozTransition: 'all 0.1s ease-in',
    oTransition: 'all 0.1s ease-in',
    msTransition: 'all 0.1s ease-in'
  }, document.body);

  var hostHeight = Math.max(document.body.offsetHeight, document.body.parentElement.offsetHeight);
  var hostWidth = Math.max(document.body.offsetWidth, document.body.parentElement.offsetWidth);

  var totalWidth = Math.min((hostHeight - 40) * 640 / 350, hostWidth - 10);
  var totalHeight = totalWidth * 350 / 640;

  shake(lazerAppear);

  function shake(callback) {
    var shakeStart = Date.now();
    var shakeTotal = 700;
    var shakeAni = setInterval(function() {
      var passed = Date.now() - shakeStart;
      var phase = passed / shakeTotal;
      if (phase > 1) {
        monitorBack.parentElement.removeChild(monitorBack);
        clearInterval(shakeAni);
        if (callback)
          callback();
        return;
      }

      if (phase < 0.1) {
        monitorBack.style.opacity = phase * 10;
        monitorBack.style.width = (100 - phase) + '%';
        monitorBack.style.height = (100 - phase) + '%';
      }
      else {
        var fadePhase = (Math.sin((phase - 0.1) * 8) + 1) / 2;
        monitorBack.style.opacity = fadePhase * 0.5;
        var shakePhase = Math.sin((phase - 0.1) * 5);
        monitorBack.style.top = shakePhase * 100 + 'px';
      }
    }, 1);
  }

  var lazer: HTMLElement;
  var lazerAni;
  var bootBar: HTMLElement;

  function lazerAppear() {
    // console.log('ani: lazerAppear');
    var lazerStart = Date.now();
    var lazerTotal = 1000;

    lazer = elem('div', {
      position: 'absolute',
      background: 'orange',
      top: totalHeight / 2 + 'px',
      left: totalWidth / 2 + 'px',
      width: '1px',
      height: '1px',
      filter: 'blur(10px)',
      webkitFilter: 'blur(10px)',
      mozFilter: 'blur(10px)',
      oFilter: 'blur(10px)',
      msFilter: 'DXImageTransform.Microsoft.Blur(PixelRadius=\'10\')',
      transition: 'all 0.1s ease-in',
      webkitTransition: 'all 0.1s ease-in',
      mozTransition: 'all 0.1s ease-in',
      oTransition: 'all 0.1s ease-in',
      msTransition: 'all 0.1s ease-in'
    }, document.body);

    lazerAni = setInterval(function() {
      var lazerPhase = (Date.now() - lazerStart) / lazerTotal;
      // console.log('ani: lazerPhase ' + lazerPhase);
      if (lazerPhase > 1) {
        clearInterval(lazerAni);
        if (lazer) {
          lazer.style.opacity = <any>1;
        }
        // console.log('ani: create bootBar');
        bootBar = base.elem('div', {
          position: 'absolute',
          top: (totalHeight / 2 - totalHeight / 140) + 'px',
          background: 'white', color: 'white',
          height: totalHeight / 70 + 'px',
          width: totalWidth * 0.3 + 'px',
          left: totalWidth * 0.48 + 'px',
          filter: 'blur(10px)',
          webkitFilter: 'blur(5px)',
          mozFilter: 'blur(5px)',
          oFilter: 'blur(5px)',
          msFilter: 'DXImageTransform.Microsoft.Blur(PixelRadius=\'5\')',
          fontSize: '10%',
          innerHTML: '&nbsp;',
          transition: 'all 0.6s ease-in',
          webkitTransition: 'all 0.6s ease-in',
          mozTransition: 'all 0.6s ease-in',
          oTransition: 'all 0.6s ease-in',
          msTransition: 'all 0.6s ease-in'
        }, document.body);

        return;
      }

      if (lazerPhase < 0.5) {
        var appearPhase = lazerPhase * 2;
        // console.log('ani: appearPhase ' + appearPhase);
        var bigDiameter = Math.min(totalHeight, totalWidth) / 20;
        var diameter = bigDiameter * appearPhase;
        lazer.style.width = diameter + 'px';
        lazer.style.left = (totalWidth - diameter) / 2 + 'px';
        lazer.style.height = diameter + 'px';
        lazer.style.top = (totalHeight - diameter) / 2 + 'px';
      }
      else {
        var widenPhase = (lazerPhase - 0.5) * 2;
        // console.log('ani: widenPhase ' + widenPhase);
        var bigDiameter = Math.min(totalHeight, totalWidth) / 20;
        var height = bigDiameter - (bigDiameter * 0.7) * widenPhase;
        lazer.style.height = height + 'px';
        lazer.style.top = (totalHeight - height) / 2 + 'px';
        var width = bigDiameter + (totalWidth * 0.95 - bigDiameter) * widenPhase;
        lazer.style.width = width + 'px';
        lazer.style.left = (totalWidth - width) / 2 + 'px';
      }
    }, 1);
  }

  function lazerStop() {
    if (lazer && lazerAni) {
      clearInterval(lazerAni);
      lazer.parentElement.removeChild(lazer);
      lazer = null;
      lazerAni = 0;
    }
  }

  var _ratio;

  var _splash: HTMLImageElement;
  var _splashStartRatio;

  return {
    drive: function(drive) {
      try {
        var dt = drive.read('/splash.img');
        if (dt) {
          _splash = document.createElement('img');
          _splash.width = 640;
          _splash.height = 350;
          _splash.src = dt;
          elem(_splash, {
            position: 'absolute',
            top: totalWidth / 2 + 'px',
            left: totalHeight / 4 + 'px',
            height: '1px',
            width: totalWidth / 2 + 'px',
            opacity: 0.1,

            filter: 'blur(10px)',
            webkitFilter: 'blur(10px)',
            mozFilter: 'blur(10px)',
            oFilter: 'blur(10px)',
            msFilter: 'DXImageTransform.Microsoft.Blur(PixelRadius=\'10\')',

            transition: 'all 0.6s ease-in',
            webkitTransition: 'all 0.6s ease-in',
            mozTransition: 'all 0.6s ease-in',
            oTransition: 'all 0.6s ease-in',
            msTransition: 'all 0.6s ease-in'

          }, document.body);
          _splashStartRatio = _ratio || 0;
        }
      }
      catch (errorLoadImage) {
      }
    },
    title: function(t, ratio) {
      _ratio = ratio;
      // setText(smallTitle,t);
      if (typeof console !== 'undefined' && typeof console.log === 'function')
        console.log(t);
      if (ratio) {
        if (bootBar) {
          // console.log('ani: bootBar there ' + ratio);
          var width = totalWidth * ratio * 0.8;
          bootBar.style.left = (((totalWidth - width) / 2)|0) + 'px';
          bootBar.style.width = width + 'px';
        }
        else {
          // console.log('ani: bootBar not there ' + ratio);
        }
        if (_splash) {
          var canvPhase = (ratio - (_splashStartRatio || 0)) / (1 - _splashStartRatio || 0);
          var width = totalWidth * 0.499 + canvPhase * totalWidth / 2;
          var height = canvPhase * totalHeight * 0.999;
          _splash.style.top = (totalHeight - height) / 2 + 'px';
          _splash.style.height = height + 'px';
          _splash.style.left = (totalWidth - width) / 2 + 'px';
          _splash.style.width = width + 'px';
          _splash.style.opacity = <any>canvPhase;
          var blurRadius = (1 - canvPhase) * 10 + 2;
          _splash.style.filter = 'blur('+blurRadius+'px)';
          _splash.style.webkitFilter = 'blur('+blurRadius+'px)';
          (<any>_splash.style).mozFilter = 'blur('+blurRadius+'px)';
          (<any>_splash.style).oFilter = 'blur('+blurRadius+'px)';
          (<any>_splash.style).msFilter = 'DXImageTransform.Microsoft.Blur(PixelRadius=\''+blurRadius+'\')';

        }
      }
    },
    loaded: function() {
      //setText(smallTitle, 'Loaded.');
    }
  };
}