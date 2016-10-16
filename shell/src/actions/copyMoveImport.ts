namespace actions {

  export function copyMoveImport(env: copyMoveImport.ExtendedActionContext) {
    if (!env.targetPanelPath && env.virtualSource)
      return false;

    var dlgBody = document.createElement('div');
    dlgBody.style.cssText =
      'position: absolute; left: 30%; top: 40%; height: auto; width: auto; min-width: 40%;'+
      'background: cornflowerblue; color: black; border: solid 1px white;'+
      'padding: 1em;';

    dlgBody.innerHTML =
      '<pre style="margin: 0px;">'+
      '<div style="font-size: 160%; font-weight: light;">'+ env.title +'</div>'+
      '<div>from<span id=from_label_extra></span>:</div>'+
      '<pre id=copy-from style="width: 95%; background: navy; color: silver; border: none; font: inherit; font-size: 120%; padding: 3px; padding-left: 0.6em; opacity: 0.8;"></pre>'+
      '<div>to<span id=to_label_extra></span>:</div>'+
      '<input id=copy-to style="width: 95%; background: navy; color: silver; border: none; font: inherit; font-size: 120%; padding: 3px; padding-left: 0.6em;">'+
      '<pre id=copy-overlap-message style="background: tomato; color: white; display: none;"></pre>'+
    	'<div style="text-align: right; margin-top: 0.5em; margin-right: 5%;"><button id=copy-button style="font: inherit; font-size: 120%;"> '+env.buttonText+' </button></div>'+
      '</pre>';

    var dlg = env.dialogHost.show(dlgBody);

    var from_label_extra = dlgBody.getElementsByTagName('span')[0];
    var to_label_extra = dlgBody.getElementsByTagName('span')[1];
    var copy_from = dlgBody.getElementsByTagName('pre')[1];
    var copy_to = dlgBody.getElementsByTagName('input')[0];
    var copy_overlap_message = dlgBody.getElementsByTagName('pre')[2];
    var copy_button = dlgBody.getElementsByTagName('button')[0];


    var targetDir: string;
    var hasOverlap = false;

    copy_from.textContent = copy_from.innerText = env.from;
    from_label_extra.textContent = from_label_extra.innerText = env.dirSource ?
      ' (dir with '+env.sourceFiles.length+' file'+(env.sourceFiles.length===1?'':'s')+')':
    	(env.sourceFiles.length<=1 ? ' (file)' : ' ('+env.sourceFiles.length+' files)');

		copy_to.value = env.targetPanelPath;
    updateToLabel();

    copy_button.onclick = function() {
      commit();
      dlg.close();
    };

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
        updateToLabel();
        if (hasOverlap) return;
        commit();
        dlg.close();
      }
      else {
        queue_updateToLabel();
      }
    };

    (<any>copy_to).onchange = queue_updateToLabel;
    (<any>copy_to).oninput = queue_updateToLabel;
    (<any>copy_to).ontextInput = queue_updateToLabel;
    (<any>copy_to).ontextinput = queue_updateToLabel;
    (<any>copy_to).onmousedown = queue_updateToLabel;
    (<any>copy_to).onmouseup = queue_updateToLabel;

    setTimeout(function() {
      copy_to.focus();
      if (copy_to.select) copy_to.select();
      else if (copy_to.setSelectionRange) copy_to.setSelectionRange(0, (copy_to.value||'').length);
    }, 1);

    return true;

    function queue_updateToLabel() {
      if ((<any>queue_updateToLabel)._timeout) return;
      (<any>queue_updateToLabel)._timeout = setTimeout(function() {
        (<any>queue_updateToLabel)._timeout = 0;
        updateToLabel();
      }, 300);
    }

    function updateToLabel() {
      try {
        var trg = copy_to.value;
        if (trg) trg = trg.replace(/^\s+/, '').replace(/\s+$/, '');
        if (!trg) {
          var to_label_text = '';
        }
        else {
          trg = env.path.resolve(trg);
          var isDir = /\/$/.test(trg) ? true : env.fs.existsSync(trg) && env.fs.statSync(trg).isDirectory();
          var trgFiles = getDirFiles(env.drive, trg);
          if (isDir) {
            var to_label_text = ' (dir with '+trgFiles.length+' file'+(trgFiles.length===1?'':'s')+')';
          }
          else {
            to_label_text = ' (file)';
          }

          hasOverlap = false;
          var overlapCount = 0;
          var pairs = generateMovePairs();
          for (var i = 0; i < pairs.pairs.length; i++) {
            if (env.fs.existsSync(pairs.pairs[i].target)) {
              hasOverlap = true;
              overlapCount++;
            }
          }

          if (hasOverlap) {
            if (isDir)
              to_label_text = to_label_text.replace(
                ')',
                ', '+overlapCount+(overlapCount<pairs.pairs.length?' out of '+pairs.pairs.length:'')+
                ' to overwrite existing)');
            else
              to_label_text = '(file to overwrite existing)';
          }

          if (hasOverlap) {
            copy_overlap_message.style.display = 'block';
            copy_overlap_message.textContent = copy_overlap_message.innerText = (move ? 'Move':'Copy')+' anyway, including overwrite?';
            copy_button.parentElement.style.textAlign = 'left';
          }
          else {
            copy_overlap_message.style.display = 'none';
            copy_button.parentElement.style.textAlign = 'right';
          }

        }
      }
      catch (err) {
        to_label_text = ' (new)';
        hasOverlap = false;
        copy_overlap_message.style.display = 'none';
        copy_button.parentElement.style.textAlign = 'right';
      }

      to_label_extra.textContent = to_label_extra.innerText = to_label_text;

    }

    function generateMovePairs() {
      var targetName = copy_to.value;
      if (!targetName) return null;
      targetName = targetName.replace(/^\s+/, '').replace(/\s+$/,'');
      if (!targetName) return null;
      targetDir = env.path.resolve(targetName);

      if (!env.dirSource && env.sourceFiles.length===1) {
        if (targetName.slice(-1)!=='/'
           && (!env.fs.existsSync(targetDir) || !env.fs.statSync(targetDir).isDirectory())) {
          // consider target a file
          var target = env.path.resolve(targetDir);
        }
        else {
          // consider target a directory where to put a file
          var fn = env.path.basename(env.cursorPath);
          var target = targetDir==='/' ? '/'+fn : env.path.resolve(targetDir, fn);
        }

        if (!env.virtualSource && env.cursorPath===target) return null;
        return { select: target, pairs: [{ source: env.sourceFiles[0], target: target }] };
      }
      else {
        var prefix = env.virtualSource ? '/' : env.path.resolve(env.currentPanelPath);
        if (prefix!=='/') prefix += '/';

        if (!env.virtualSource && targetDir.slice(-1) !== '/') {
          // allow renaming of directories, strip the name of the source dir from the target
          var cursorPath = env.cursorPath;
          if (env.selected && (env.selected.length>1 || env.selected[0]!==env.cursorPath))
            cursorPath = env.currentPanelPath;
          prefix = env.path.resolve(cursorPath);
        	if (prefix!=='/') prefix += '/';
        }

        var result: { source: copyMoveImport.SourceEntry; target: string }[] = [];
        var select: string;

        for (var i = 0; i < env.sourceFiles.length; i++) {
          var sourceFilePath = env.sourceFiles[i].path;
          if (sourceFilePath.charCodeAt(0)!==47) sourceFilePath='/'+sourceFilePath;

          if (!select) {
            var restParts = sourceFilePath.slice(prefix.length).split('/');
            for (var j = 0; j < restParts.length; j++) {
              if (restParts[j]) {
                if (targetDir==='/')
                  select = '/'+restParts[j];
                else
                  select =
              			env.path.join(targetDir, restParts[j]);
                break;
              }
            }
          }

        	var trgFile = targetDir === '/' ?
              sourceFilePath.slice(prefix.length) :
              env.path.join(targetDir, sourceFilePath.slice(prefix.length));

          if (env.virtualSource || sourceFilePath!==trgFile)
          	result.push({ source: env.sourceFiles[i], target: trgFile });
        }

        if (!select) select = targetDir;

        return { select: select, pairs: result };
      }
    }

    function commit() {

      if (typeof console!=='undefined' && typeof console.log==='function' && console['__debug']) {
        console.log('commit');
      }

      var pairs = generateMovePairs();
      if (!pairs || !pairs.pairs.length) return;

      if (typeof console!=='undefined' && typeof console.log==='function' && console['__debug']) {
        console.log('commit:generateMoveParts['+pairs.pairs.length+']');
      }

      env.drive.timestamp = +new Date();

      var trgFileMap: any = {};
      var anyRemove = false;
      for (var i = 0; i < pairs.pairs.length; i++) {
        if (move) trgFileMap[pairs.pairs[i].target] = true;

        if (typeof console!=='undefined' && typeof console.log==='function' && console['__debug']) {
        	console.log('commit:pairs['+i+'] - getContent()...');
      	}
        var content = pairs.pairs[i].source.getContent();

        if (typeof console!=='undefined' && typeof console.log==='function' && console['__debug']) {
        	console.log('commit:pairs['+i+'] - content['+content.length+'] - write()...');
      	}

        env.drive.write(pairs.pairs[i].target, content);

        if (typeof console!=='undefined' && typeof console.log==='function' && console['__debug']) {
        	console.log('commit:pairs['+i+'] - content['+content.length+'] - write() OK.');
      	}

        if (pairs.pairs[i].source.remove)
          anyRemove = true;
      }

      if (anyRemove) {
        for (var i = 0; i < pairs.pairs.length; i++) {
          if (!trgFileMap[pairs.pairs[i].source.path])
            pairs.pairs[i].source.remove();
        }
      }

      env.selectFile(
        env.dirSource ? targetDir : pairs.select);

    }
  }

	export namespace copyMoveImport {

    export interface ExtendedActionContext extends ActionContext {
      dirSource: boolean;
      virtualSource: boolean;
      title: string;
      buttonText: string;
      from: string;
      sourceFiles: SourceEntry[];
    }

    export interface SourceEntry {
      path: string;
      getContent(): string;
      remove();
    }

  }
}