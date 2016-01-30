var fs = require('fs');

function run() {
  var file = process.argv[2];
  if (!file) {
    console.log('!extract.js  [nonode-file]');
    return;
  }

  var fullHtml = fs.readFileSync(file);

  var eq80_script = findScript(fullHtml, function(js) {
    return js.indexOf('indexedDB')>=0 &&
      js.indexOf('openDatabase')>=0 &&
      js.indexOf('localStorage')>=0 &&
      js.indexOf('persistence')>=0;
  });

  if (!eq80_script) {
    console.log('No nonode recognized.');
    return;
  }

  var eq80;
  (0,eval)('var noui = true;'+eq80_script+'//'+'# '+'sourceURL=' + file); // TODO: inject necessary LFs to align line numbers

  var allComments = findComments(fullHtml);
  var storage = eq80.persistence.dom.parseDomStorage(); // TODO: pass in a mock document
  var drive = storage.finishParsing();
  var allFiles = drive.files();
  console.log(allFiles.length+' files to extract...');
  for (var i = 0; i < allFiles.length; i++) {
    fs.writeFileSync('.'+allFiles[i], drive.read(allFiles[i]));
  }
  console.log('saved.');

  function findComments(html) {
    var pos = 0;
    var result = [];
    while (true) {
      var spos = html.indexOf('<'+'!'+'--');
      if (spos<pos) break;
      var clpos = pos = spos + ('<'+'!'+'--').length;
      var epos = html.indexOf('--'+'>');
      if (epos<pos) break;
      pos = epos + ('--'+'>').length;
      var commnt = html.slice(clpos,epos);
      result.push(commnt);
    }
    return result;
  }


  function findScript(html, filter) {
    var pos = 0;
    var tolo = html.toLowerCase();
    while () {
      var spos = tolo.indexOf('<'+'script', pos);
      if (spos<pos) return;
      pos = spos + ('<'+'script').length;
      var clpos = tolo.indexOf('>', pos);
      if (clpos < pos) return;
      pos = spos+1;

      var epos = tolo.indexOf('</'+'script');
      if (epos<pos) return;
      pos = epos+('</'+'script').length;

      var jsText = html.slice(clpos, epos);
      var pass = filter(jsText);
      if (pass) return pass;
    }
  }
}