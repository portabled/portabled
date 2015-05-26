function earlyBoot() {

  var earlyBootStart = new Date().valueOf();

  document.write(
    '<'+'style'+' data-legit=mi>'+
    '*{display:none;background:white;color:white;}'+
    'html,body{display:block;}'+
    '</'+'style'+'>'+
    (document.body ? '' : '<body>'));

  elem(document.body, {
    height: '100%',
  	margin: 0,
    padding: 0,
    overflow: 'hidden'
  });
  elem(document.body.parentElement, {
    overflow: 'hidden'
  });

  var allStyleElements = document.getElementsByTagName('style');
  var addedStyle = allStyleElements[allStyleElements.length-1];

  var bootFrame = createFrame();
  bootFrame.iframe.style.zIndex = 2000;
  bootFrame.iframe.style.display = 'block';

  bootFrame.global.elem = elem;

  var bootAPI = bootUI(bootFrame.document, bootFrame.global, function elemProxy(a,b,c) { return bootFrame.global.elem(a,b,c); });
  bootFrame.api = bootAPI;
  bootFrame.startTime = earlyBootStart;

  var uniqueKey = deriveUniqueKey(location);

  var shellLoaderInstance = null;
	var shellLoadInterval = setInterval(function() {
    if (typeof shellLoader === 'undefined') return;
    if (!shellLoadInterval) return; // protect against old Opera's super-async habits
    shellLoaderInstance = shellLoaderInstance ? shellLoaderInstance.continueLoading() : shellLoader ? shellLoader(uniqueKey, document, bootFrame) : null;
  }, 100);

  window.onload = function() {

    clearInterval(shellLoadInterval);
    shellLoadInterval = 0;

    removeSpyElements();
    bootFrame.iframe.style.zIndex = 1000;
    if (addedStyle.parentElement)
    	addedStyle.parentElement.removeChild(addedStyle);
    bootFrame.iframe.style.display = '';

    (shellLoaderInstance || shellLoader(uniqueKey, document, bootFrame)).finishLoading();

  };

  function deriveUniqueKey(locationSeed) {
    var key = (locationSeed + '').split('?')[0].split('#')[0].toLowerCase();

    var posIndexTrail = key.search(/\/index\.html$/);
    if (posIndexTrail>0) key = key.slice(0, posIndexTrail);

    if (key.charAt(0) === '/')
      key = key.slice(1);
    if (key.slice(-1) === '/')
      key = key.slice(0, key.length - 1);

    return smallHash(key) + '-' + smallHash(key.slice(1) + 'a');

    function smallHash(key) {
      for (var h=0, i=0; i < key.length; i++) {
        h = Math.pow(31, h + 31 / key.charCodeAt(i));
        h -= h | 0;
      }
      return (h * 2000000000) | 0;
    }

  }

  function removeSpyElements() {

    removeElements('iframe', function(ifr) { return ifr !== bootFrame.iframe; });
    removeElements('style', function(sty) { return sty.getAttribute('data-legit') !== 'mi'; });
    removeElements('script', function(sty) { return sty.getAttribute('data-legit') !== 'mi'; });

    function removeElements(tagName, predicateToRemove) {
    	var list = document.getElementsByTagName(tagName);
      for (var i = 0; i < list.length; i++) {
        var elem = list[i] || list.item(i);
        if (predicateToRemove(elem)) {
          elem.parentElement.removeChild(elem);
          i--;
        }
      }
    }
  }

}