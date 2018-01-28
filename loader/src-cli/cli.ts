declare var fs, path, require, process, __dirname, __filename;

function cli() {
  if (typeof WScript!=='undefined' && typeof ActiveXObject!=='undefined') {
    var sh = new ActiveXObject('WScript.Shell');
    var args = 'node ' + WScript.ScriptFullName;
    for (var i = 0; i < WScript.Arguments.length; i++) {
      args+=' ' + WScript.Arguments[i];
    }
    sh.Run(args);
    WScript.Quit(0);
  }

  copy();

}