declare namespace substitute {

  type Replacements =
    { [token: string]: string }
    |
    { (token: string): string };

}

function substitute(bodyText: string, replacements: substitute.Replacements) {
  if (typeof replacements==='function') {
    var update = bodyText.replace(
      /\"\#([\S]+)\#\"/g,
      function(str, token) {
        return (replacements as Function)(token)||'';
      });
  }
  else {
    var update = bodyText.replace(
      /\"\#([\S]+)\#\"/g,
      function(str, token) {
        var r = replacements[token];
        if (typeof r==='function') return r()||'';
        else return r||'';
      });
  }
  return update;
}
