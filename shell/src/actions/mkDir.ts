namespace actions {

  export function mkDir(env: ActionContext) {
    var dlgBody = document.createElement('div');
    dlgBody.style.cssText =
      'position: absolute; left: 30%; top: 40%; height: auto; width: auto; min-width: 40%;'+
      'background: cornflowerblue; color: black; border: solid 1px white;'+
      'padding: 1em;';

    dlgBody.innerHTML =
      '<pre style="margin: 0px;">'+
      '<div style="font-size: 160%; font-weight: light;">Create directory (F7)</div>'+
      '<input id=mkdir-name style="width: 95%; background: navy; color: silver; border: none; font: inherit; font-size: 120%; padding: 3px; padding-left: 0.6em;">'+
    	'<div style="text-align: right; margin-top: 0.5em; margin-right: 5%;"><button id=mkdir-create style="font: inherit; font-size: 120%;"> Create </button></div>'+
      '</pre>';

    var mkdir_name = dlgBody.getElementsByTagName('input')[0];
    var mkdir_create = dlgBody.getElementsByTagName('button')[0];

    var dlg = env.dialogHost.show(dlgBody);

    dlgBody.onkeydown = (e) => {
      if (!e) e = (<any>window).event;
      enrichKeyEvent(e);
      if (e.shellPressed.Escape) {
        if ('cancelBubble' in e) e.cancelBubble = true;
        if (e.preventDefault) e.preventDefault();
        dlg.close();
      }
      else if (e.shellPressed.Enter) {
        if ('cancelBubble' in e) e.cancelBubble = true;
        if (e.preventDefault) e.preventDefault();
        commit();
      }
    };

    function commit() {
      var dir = mkdir_name.value || '';
      if (!dir || dir === '/') return false;

      dir = dir.replace(/^\s+/,'').replace(/\s+$/, '');

      var dirPath = env.repl.coreModules.path.resolve(dir);
      try {
        var st = env.repl.coreModules.fs.statSync(dirPath);
        return; // TODO: show a validation message: file or directory exists
      }
      catch (error) { /* expected error, continue */ }

      env.drive.timestamp = +new Date();
      env.drive.write(dirPath + '/', '');

      setTimeout(() => {
        env.selectFile(dirPath);
      }, 1);

      dlg.close();
    }

    mkdir_create.onclick = commit;

    setTimeout(function() {
      mkdir_name.focus();
    }, 1);

    return true;
  }

}