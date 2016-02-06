module shell.actions {

  export function importAction(env: ActionContext) {
    var dlgBody = document.createElement('div');
    dlgBody.style.cssText =
      'position: absolute; left: 40%; top: 40%; max-height: 40%; width: 20%;'+
      'background: #101010; color: gray; border: solid 1px white;'+
      'padding: 1em;';

    dlgBody.innerHTML =
      '<pre style="margin: 0px;">'+
      '<div id=import_title style="font-size: 160%; font-weight: light;">Import (F3)</div>'+
      '<input type=file id=import_file style="width: 95%; background: black; color: gray; border: none; font: inherit; font-size: 120%; padding: 3px; padding-left: 0.6em;">'+
    	'<div style="text-align: right; margin-top: 0.5em; margin-right: 5%;"><button id=import_button style="font: inherit; font-size: 120%;"> Import </button></div>'+
      '</pre>';

    var dlg = env.dialogHost.show(dlgBody);

    var ctls = children(dlgBody, 'div', 'input', 'button');
    var tablist: ImportTab[] = [];

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

    ctls.import_button.onclick = commit;

    setTimeout(function() {
      ctls.import_file.focus();
      if (ctls.import_file.click) ctls.import_file.click();
    }, 1);

    ctls.import_file.onchange = () => updateFileSelected(ctls.import_file.files);

    dlgBody.ondragenter = dlgBody.ondragover = function(e) {
      if (!e) e = (<any>window).event;
      if (e.preventDefault) e.preventDefault();
      if (e.stopPropagation) e.stopPropagation();
    };

    dlgBody.ondrop = function(e) {
      if (!e) e = (<any>window).event;
      var dt = e.dataTransfer;
      var files = dt ? dt.files : null;
      if (!files) return;

      if (e.preventDefault) e.preventDefault();
      if (e.stopPropagation) e.stopPropagation();


      updateFileSelected(files);
    };

    var interpretedAsIs: FileData[] = null;
    var interpretedAsEq80Container: FileData[] = null;
    var interpretedAsZip: FileData[] = null;


    return true;

    function commit() {

      dlg.close();
    }

    function updateFileSelected(files: FileList) {
      interpretedAsIs = null;
      interpretedAsEq80Container = null;
      interpretFileListAsIs(files);
      if (files.length===1)
        interpretFileAsEq80Container(files[0]);

      updateInterpretedSections();
    }

    function ensureContentAreaPrepared() {
      if (tablist.length) return;

      ctls.import_file.parentElement.removeChild(ctls.import_file);
      var stash_import_file = ctls.import_file;

      dlgBody.style.cssText =
        'position: absolute; left: 10%; top: 10%; height: 80%; width: 80%;'+
        'background: #101010; color: gray; border: solid 1px white;';


      dlgBody.innerHTML =
        '<pre style="margin: 0px; height: 100%;">'+
        '<table cellspacing=0 cellpadding=0 style="height:100%; width: 100%; padding: 1em;">'+
        '<tr height=1><td height=1 id=import_file_host style="height: 1px;">'+
        '<span id=import_title style="font-size: 160%; font-weight: light;">Import (F3)</span>'+
        '</td></tr><tr height=1><td height=1 style="height: 1px;">'+
        '<span id=import_tab_files style="display: inline-block; margin-left: 1em; padding: 0.3em; padding-left: 0.5em; padding-right: 0.5em; cursor: pointer; background: #282828;"> Files </span>'+
        '<span id=import_tab_eq80 style="display: inline-block; margin-left: 1em; padding: 0.3em; padding-left: 0.5em; padding-right: 0.5em; cursor: pointer; background: #181818;"> Extracted </span>'+
        '<span id=import_tab_zip style="display: inline-block; margin-left: 1em; padding: 0.3em; padding-left: 0.5em; padding-right: 0.5em; cursor: pointer; background: #181818;"> ZIP </span>'+
        '</td></tr><tr height=100%><td height=100% style="height: 100%;">'+
        '<div id=import_body_files style="height: 100%;  overflow: auto; background: #282828;">'+
        ' OK files list or content AREA HERE  '+
        '<br><br><br><br>123<br><br><br><br>'+
        '</div>'+
        '<div id=import_body_eq80 style="height: 100%; overflow: auto; display: none;background: #282828;">'+
        ' OK HTML container files list AREA HERE  '+
        '</div>'+
        '<div id=import_body_zip style="height: 100%; overflow: auto; display: none; background: #282828;">'+
        ' OK ZIP files list AREA HERE  '+
        '</div>'+
        '</td></tr><tr height=1><td height=1 style="height: 1px; text-align: right;">'+
        '<span>import into path: </span>'+
        '<input id=import_target_path style="font: inherit; font-size: 120%; background: black; border: solid 1px silver; color: silver; margin-right: 1em;">'+
        '<button id=import_button style="font: inherit; cursor: pointer;"> Import </button>'+
        '</td></tr></table>'+
        '</pre>';

      ctls = children(dlgBody, 'td', 'input', 'div', 'button', 'span');
      ctls.import_file = stash_import_file;
      ctls.import_file.style.cssText = 'min-width: 25%; width: auto; background: black; color: gray; border: none; font: inherit; font-size: 120%; padding: 3px; padding-left: 0.6em;';
      ctls.import_file_host.appendChild(ctls.import_file);

      initTab('files');
      initTab('eq80');
      initTab('zip');

      setTimeout(function() {
        ctls.import_target_path.focus();
      }, 1);

      function initTab(name: string) {
        var tab = {
          tag: ctls['import_tab_'+name],
          body: ctls['import_body_'+name],
          disabled: false
      	};
        tablist.push(tab);
        tab.tag.onclick = function() { selectTab(tab) };
      }

      function selectTab(tab) {
        for (var i = 0; i < tablist.length; i++) {
          if (tab===tablist[i]) {
            tablist[i].tag.style.background='#282828';
            tablist[i].body.style.display='block';
          }
          else {
            tablist[i].tag.style.background='#181818';
            tablist[i].body.style.display='none';
          }
        }
      }
    }

    function createBrowserUI(tab: ImportTab, files: FileData[]) {
      if (!files) {
        tab.disabled = true;
        tab.tag.style.display = 'none';
        tab.body.style.display = 'none';
        return;
      }

      tab.disabled = false;

      tab.body.style.overflow = null;
      tab.body.innerHTML =
        '<table style="width: 100%; height: 100%" cellpadding=0 cellspacing=0>'+
        '<tr height=100%><td id=import_browser_directory_tree height=100% width=35% valign=top style="height: 100%; width: 35%; overflow: auto;">'+
        'DIRECTORY TREE GOES HERE'+
        '</td><td id=import_browser_file_list height=100% width=65% valign=top style="height: 100%; width: 65%; overflow: auto;">'+
        'FILE LIST GOES HERE'+
        '</td></tr>'+
        '<tr height=1><td id=import_browser_status_bar height=1 colspan=2 style="height: 1px; text-align: right">'+
        'status bar text'+
        '</td></tr>'+
        '</table>';
      var bctls = children(tab.body, 'td');

      updateStatusBar();
      updateTree();
      updateFileList();

      function updateStatusBar() {
        var statusText = files.length === 0 ? 'No files' : files.length === 1 ? '1 file' : files.length+' files';
        if ('textInput' in bctls.import_browser_status_bar) bctls.import_browser_status_bar.textInput = statusText;
        else bctls.import_browser_status_bar.innerText = statusText;
      }

      function updateTree() {
        // TODO: infer tree structure from the file list
      }

      function updateFileList() {
        bctls.import_browser_file_list.innerHTML = '';
        for (var i = 0; i < files.length; i++) {
          var fi = document.createElement('div');
          fi.style.cssText = 'display: inline-block; min-width: 30%; padding: 0.5em; padding-top: 3px; padding-bottom: 3px;';
          if ('textContent' in fi) fi.textContent = files[i].path;
          else fi.innerText = files[i].path;
          bctls.import_browser_file_list.appendChild(fi);
        }
      }
    }

    function interpretFileListAsIs(files: FileList) {

      var list: FileData[] = [];
      for (var i = 0; i < files.length; i++) {
        list.push(createEntry(files[i]));
      }

      return list;

      function createEntry(file: File): FileData {
				return {
          path: files[i].name,
          getContent(callback: (error: any, result: any) => void) {
          	callback(new Error('Not implemented'), null);
        	}
        };
      }

    }

    function interpretFileAsEq80Container(file: File) {
      // TODO: stash it in appropriate variables
    }

    function updateInterpretedSections() {
      ensureContentAreaPrepared();
      createBrowserUI(tablist[0], interpretedAsIs);
    }

    interface FileData {
      path: string;
      getContent(callback: (error: any, result: any) => void);
    }

    interface ImportTab {
      tag: HTMLElement;
      body: HTMLElement;
      disabled: boolean;
    }

  }

}