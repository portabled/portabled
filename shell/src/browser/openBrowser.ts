declare namespace openBrowser {

  type Options = {
    path: string;
    hash: string;
    drive: {
    	read(path: string): string;
  	};
  }

}

function openBrowser(options: openBrowser.Options) {

  return resolveAndEmbed();


  function resolveAndEmbed(): string {

    var content = htmlSpotExternals(options.drive.read(options.path));
    var result = '';
    for (var i = 0; i < content.length; i++) {
      if (typeof content[i]==='string') {
        result += content[i];
      }
      else {
        var inject = options.drive.read((content[i] as htmlSpotExternals.Redirect).src);
        if (typeof inject==='string') {
          if ((content[i] as htmlSpotExternals.Redirect).type==='script' || (content[i] as htmlSpotExternals.Redirect).type==='style') {
            inject += '\n//# sourceURL='+options.path;
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