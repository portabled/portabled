namespace actions {

  export function remove(env: ActionContext) {
    var dlgBody = document.createElement('div');
    dlgBody.style.cssText =
      'position: absolute; left: 30%; top: 40%; height: auto; width: auto; min-width: 40%;'+
      'background: firebrick; color: black; border: solid 1px white;'+
      'padding: 1em;';

    dlgBody.innerHTML =
      '<pre style="margin: 0px;">'+
      '<div style="font-size: 160%; font-weight: light;">Delete (F8)</div>'+
      '<div><span id=deleting-header>Deleting these XXX files:</span></div>'+
      '<pre id=delete-list style="width: 95%; background: black; color: tomato; border: none; font: inherit; font-size: 120%; padding: 3px; padding-left: 0.6em; opacity: 0.8;"></pre>'+
      '<div>- please confirm deletion</div>'+
    	'<div style="text-align: right; margin-top: 0.5em; margin-right: 5%;"><button id=delete-button style="font: inherit; font-size: 120%;"> Delete </button></div>'+
      '</pre>';

    var dlg = env.dialogHost.show(dlgBody);

    var deleting_header = dlgBody.getElementsByTagName('span')[0];
    var delete_list = dlgBody.getElementsByTagName('pre')[1];
    var delete_button = dlgBody.getElementsByTagName('button')[0];

    if (!env.selected || !env.selected.length) {
    	var filesToRemove: string[] = getDirFiles(env.drive, env.cursorPath);
    }
    else {
      var filesToRemove: string[] = [];
      for (var i = 0; i < env.selected.length; i++){
        var list = getDirFiles(env.drive, env.selected[i]);
        for (var j = 0; j < list.length; j++) {
          filesToRemove.push(list[j]);
        }
      }
    }

    if (filesToRemove.length===0) return;

    var deleting_text = 'Deleting '+(filesToRemove.length ==1 ? ' this file:' : ' these '+filesToRemove.length+' files:');
    if ('textContent' in deleting_header) deleting_header.textContent = deleting_text;
    else deleting_header.innerText = deleting_text;

    var fileList: string[] = [];
    for (var i = 0; i < filesToRemove.length; i++) {
      if (i==5+1 && filesToRemove.length > 10) {
        fileList.push('...');
        i = filesToRemove.length - 3-1;
      }
      else {
        fileList.push(filesToRemove[i]);
      }
    }

    if ('textContent' in delete_list) delete_list.textContent = fileList.join('\n');
    else delete_list.innerText = fileList.join('\n');

    delete_button.onclick = commit;

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

    setTimeout(function() {
      delete_button.focus();
    }, 1);

    return true;

    function commit() {
      env.drive.timestamp = +new Date();
      for (var i = 0; i < filesToRemove.length; i++) {
        env.drive.write(filesToRemove[i], null);
      }

      dlg.close();
    }
  }

}