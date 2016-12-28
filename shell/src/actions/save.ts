namespace actions {

  export function save(env: ActionContext) {

    var window = require('nowindow');
    var document = window.document;
    var wholeHTML = '<!doctype html>\n'+ document.documentElement.outerHTML;
    var blob = tryCreateBlob(wholeHTML);


    var dlgBody = document.createElement('div');
    dlgBody.style.cssText =
      'position: absolute; left: 30%; top: 25%; height: auto; width: auto; min-width: 40%;'+
      'background: #303030; color: silver; border: solid 1px white;'+
      'padding: 1em;';

    dlgBody.innerHTML =
      `<pre style="margin: 0px;">
      <div style="font-size: 160%; font-weight: light;">Save</div>
      <div><span class=saving-header>Selected file XXX bytes out of total XXX bytes.</span></div>
      <label><input class=save-extract-file type=radio name=type> Extract file </label>
      <label><input class=save-local-copy type=radio name=type checked> Local copy </label>
      <label><input class=save-github-upload type=radio name=type> GitHub upload </label>
    	<div style="text-align: right; margin-top: 0.5em; margin-right: 5%;"><button class=save-button style="font: inherit; font-size: 120%;"> Save </button></div>
      </pre>`;

    var dlg = env.dialogHost.show(dlgBody);

    var savingHeader = dlgBody.getElementsByClassName('saving-header')[0] as HTMLButtonElement;
    if (savingHeader) {

      var wholeSizeText = fmtSize(wholeHTML.length);


      if (!env.selected || !env.selected.length) {
        var fileList: string[] = getDirFiles(env.drive, env.cursorPath);
        if (fileList.length===1) {
          var singleFile = fileList[0];
        }
      }
      else if (env.selected.length===1) {
        var singleFile = env.selected[0];
      }

      var savingHeaderText: string;
      if (singleFile) {
        var singleFileContent = env.drive.read(singleFile);

        if (singleFileContent!==null && typeof singleFileContent!=='undefined') {
          savingHeaderText = 'Selected '+fmtSize(singleFileContent.length)+' out of '+wholeSizeText+'.';
        }
      }

      if (!savingHeaderText) {
        savingHeaderText = 'Total size '+wholeSizeText+'.';
        var saveExtractFile = dlgBody.getElementsByClassName('save-extract-file')[0] as HTMLInputElement;
        if (saveExtractFile) saveExtractFile.disabled = true;
      }

      if ('textContent' in savingHeader) savingHeader.textContent = savingHeaderText;
      else savingHeader.innerText = savingHeaderText;

    }

    var saveButton = dlgBody.getElementsByClassName('save-button')[0] as HTMLButtonElement;
    if (saveButton) {
      setTimeout(() => {
        saveButton.focus();
      }, 1);
      saveButton.onclick = function() {
        commit();
      };
    }

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


    return true;

    function commit() {
      var saveLocalCopy = dlgBody.getElementsByClassName('save-local-copy')[0] as HTMLInputElement;
      if (saveLocalCopy && saveLocalCopy.checked) {
      	downloadHTML(blob, wholeHTML, saveFileName());
      }

      var saveExtractFile = dlgBody.getElementsByClassName('save-extract-file')[0] as HTMLInputElement;
      if (saveExtractFile && saveExtractFile.checked && singleFile) {
        var singleFileSimplename = singleFile.split['/'].slice(-1)[0];
      	downloadHTML(tryCreateBlob(singleFileContent), singleFileContent, singleFileSimplename);
      }

      var saveGithubUpload = dlgBody.getElementsByClassName('save-github-upload')[0] as HTMLInputElement;
      if (saveGithubUpload && saveGithubUpload.checked) {
        var req = env.http.request({
          
        });
      }

      dlg.close();
    }

  }

  function tryCreateBlob(content) {
    try {
      if (typeof Blob==='function'
          && typeof URL!=='undefined' && typeof URL.createObjectURL==='function') {
      	var blob: Blob = new (<any>Blob)([content], { type: 'application/octet-stream' });
        return blob;
      }
    }
    catch (blobError) {}
    return null;
  }

  function fmtSize(size) {
    var str = size+'';
    var fmtStr = '';
    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(str.length-i-1);
      if (i>0 && (i%3===0)) fmtStr = ch+','+fmtStr;
      else fmtStr = ch + fmtStr;
    }
    return fmtStr;
  }

  function downloadHTML(blob, wholeHTML, filename) {

    if (blob) {
      var totalSize = blob.size;
      try {
      	exportBlobHTML5(filename, blob);
      }
      catch (blobError) {
      	exportDocumentWrite(filename, wholeHTML);
      }
    }
    else {
      var totalSize = wholeHTML.length;
      exportDocumentWrite(filename, wholeHTML);
    }


    function exportBlobHTML5(filename, blob: Blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.setAttribute('download', filename);
        try {
          // safer save method, supposed to work with FireFox
          var evt = document.createEvent("MouseEvents");
          (<any>evt).initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
          a.dispatchEvent(evt);
    			console.log('saved ' + totalSize+' using Blob and A/dispatchEvent/click');
        }
        catch (e) {
          a.click();
    			console.log('saved ' + totalSize+' using Blob and A/click');
        }
      }

    function exportDocumentWrite(filename: string, content: string) {
      var win = document.createElement('iframe');
      win.style.width = '100px';
      win.style.height = '100px';
      win.style.display = 'none';
      document.body.appendChild(win);

      setTimeout(() => {
        var doc = win.contentDocument || (<any>win).document;
        doc.open();
        doc.write(content);
        doc.close();

        doc.execCommand('SaveAs', null, filename);
        console.log('saved ' + totalSize+' using document.write and execCommand');
      }, 200);

    }
  }

  function saveFileName() {

    if (window.location.protocol.toLowerCase() === 'blob:')
      return 'index.html';

    var urlParts = window.location.pathname.split('/');
    var currentFileName = decodeURI(urlParts[urlParts.length - 1]);
    var lastDot = currentFileName.indexOf('.');
    if (lastDot > 0) {
      currentFileName = (currentFileName.slice(0, lastDot) || 'index') + '.html';
    }
    else {
      currentFileName += '.html';
    }
    if (currentFileName==='.html') currentFileName = 'index.html';
    return currentFileName;
  }

}