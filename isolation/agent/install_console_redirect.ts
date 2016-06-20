function install_console_redirect(postMessageToHost: (msg: any) => void, serialize: (obj: any) => any) {

  if (typeof console!=='undefined' && console) {
    ConsoleRedirect.prototype = console;
  }

  var console_redirect = new ConsoleRedirect();
  console_redirect.log = log_redirect;
  console_redirect.warn = warn_redirect;
  console_redirect.debug = debug_redirect;
  console_redirect.trace = trace_redirect;
  console_redirect.error = error_redirect;
  console = console_redirect;

  function ConsoleRedirect() { }

  function log_redirect() {
    var args = [];
    for (var i = 0; i < arguments.length; i++) { args.push(arguments[i]); }
    console_level_redirect('log', args);
  }

  function warn_redirect() {
    var args = [];
    for (var i = 0; i < arguments.length; i++) { args.push(arguments[i]); }
    console_level_redirect('warn', args);
  }

  function debug_redirect() {
    var args = [];
    for (var i = 0; i < arguments.length; i++) { args.push(arguments[i]); }
    console_level_redirect('debug', args);
  }

  function trace_redirect() {
    var args = [];
    for (var i = 0; i < arguments.length; i++) { args.push(arguments[i]); }
    console_level_redirect('trace', args);
  }

  function error_redirect() {
    var args = [];
    for (var i = 0; i < arguments.length; i++) { args.push(arguments[i]); }
    console_level_redirect('error', args);
  }

  function console_level_redirect(level: string, args: any[]) {
    postMessageToHost({console_echo: { level: level, args: serialize(args) } });
  }
}