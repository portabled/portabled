module shell {

  export function globRegExp(glob: string, baseDir: string): RegExp {

    // TODO: handle ..
		var pattern = glob.replace(/[\[\]\\\"\'\-\.\-\$\&\*\?]/,
          x =>
            x === '*' ? '[\\s\\S]*' :
              x === '?' ? '[\\s\\S]' :
              '\\' + x);

    if (glob.charAt(0)==='/') {
      pattern = '^' + pattern;
  	}
    else {
      var lead: string;
      if (!baseDir || baseDir === '/')
        lead = '^';
      else {
        if(baseDir.charAt(0)==='/')
          lead = '^' + baseDir;
        else
          lead = '^/' + baseDir;
      }

      if (lead.slice(-1) !== '/')
        lead += '/';

      pattern = lead + pattern;
    }

    var match = new RegExp(pattern);
    return match;

  }

}