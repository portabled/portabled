declare namespace openBrowser {

  type Options = {
    path: string;
    hash: string;
    drive: {
    	read(path: string): string;
  	};
  	window: Window;
  	showDialog(elem: HTMLElement);
  	onopen();
  }

}

function openBrowser(options: openBrowser.Options) {

  var html = resolveAndEmbed();
  try {
    var blankWindow = options.window.open('about:blank');
  }
  catch (err) {
    // cannot open a window
  }

  var showUsingBlob = () => {
    var blob = new Blob([html], { type: 'text/html' });
    var url = URL.createObjectURL(blob);
    blankWindow.location.replace(url);
  }

  var showUsingDocumentWrite = () => {
    blankWindow.document.open();
    blankWindow.document.write(html);
    blankWindow.document.close();
  }

  if (!blankWindow || (!blankWindow.location&&!blankWindow.document)) {
    var dlgBody = options.window.document.createElement('div');
    dlgBody.style.cssText =
      'position: absolute; left: 10%; top: 10%; height: 80%; width: 80%; padding: 2px;'+
      'background: white; color: black; border: solid 1px white;';

    dlgBody.innerHTML =
      '<iframe src="about:blank" style="width: 100%; height: 100%; opacity: 0.001;">'+
      '</iframe>';

    var hostIframe = dlgBody.getElementsByTagName('iframe')[0];

    var dlg = options.showDialog(dlgBody);

    blankWindow = hostIframe.contentWindow || (<any>hostIframe).window;
  }


  if (typeof Blob==='function'
      && typeof URL!=='undefined'
      && typeof URL.createObjectURL==='function') {
    try {
      showUsingBlob();
    }
    catch (blobError) {
      showUsingDocumentWrite();
    }
  }
  else {
    showUsingDocumentWrite();
  }

  if (hostIframe) {
    hostIframe.style.opacity = '1';
    hostIframe.focus();
  }



  function resolveAndEmbed(): string {

    var content = htmlSpotExternals(options.drive.read(options.path));
    var result = '';
    for (var i = 0; i < content.length; i++) {
      if (typeof content[i]==='string') {
        result += content[i];
      }
      else {
        var src = (content[i] as htmlSpotExternals.Redirect).src;
        var inject = options.drive.read(src);
        if (typeof inject==='string') {
          if ((content[i] as htmlSpotExternals.Redirect).type==='script' || (content[i] as htmlSpotExternals.Redirect).type==='style') {
            inject += '\n//# sourceURL='+src.replace(/\r|\n|<\//g, '');
          }

          result +=
            (content[i] as htmlSpotExternals.Redirect).substituteLead +
            inject +
            (content[i] as htmlSpotExternals.Redirect).substituteTrail;
        }
        else {
          result += (content[i] as htmlSpotExternals.Redirect).original;
        }
      }
    }

    return result;

  }

}