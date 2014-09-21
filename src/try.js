var _errorCache = [];
_errorCache.byText = {};

window.onerror = function(errObj, file, line, ch, err) {
  var txt = err.stack;
  var firstTrigger = _errorCache.length === 0;
  if (_errorCache.byText[txt]) {
    _errorCache.byText[txt]++;
  }
  else {
    _errorCache.byText[txt]=1;
    _errorCache.push(txt);
  }

  if (firstTrigger)
    setTimeout(function() {
      var errorText = _errorCache.map(function(txt){return _errorCache.byText[txt]+' - '+txt}).join('\n');
      _errorCache = [];
      _errorCache.byText = {};
      alert(errorText);
    }, 200);
};

throw new Error('123')