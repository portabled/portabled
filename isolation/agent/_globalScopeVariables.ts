declare var FileReaderSync;

var _addEventListener: typeof addEventListener;
var _setInterval: typeof setInterval;
var _clearInterval: typeof clearInterval;
var _postMessage: Function;
var _Function: typeof Function;
var _FileReaderSync;
var _eval: Function;
var _console_log;
var _JSON_parse;

function captureGlobalScopeVariables_atStart() {
  _addEventListener = addEventListener;
  _setInterval = setInterval;
  _clearInterval = clearInterval;
  _postMessage = postMessage;
  _Function = Function;
  _FileReaderSync = FileReaderSync;
  _eval = eval;

  if (typeof console !== 'undefined' && console && typeof console.log==='function') {
    if (console.log.bind)
    	_console_log = console.log.bind(console);
  }

  if (typeof JSON !== 'undefined' && JSON && typeof JSON.parse==='function') {
    if (JSON.parse.bind) {
    	_JSON_parse = JSON.parse.bind(JSON);
    }
    else {
      _JSON_parse = (str) => _eval('('+str+')');
    }
  }

}

function postMessageToHost(msg) {
  _postMessage(msg);
}
