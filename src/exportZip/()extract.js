var fs = require('fs');
var path = require('path');

run();

function run() {
  var file = process.argv[2];
  if (!file) {
    console.log('!extract.js  nonode-file  [output-nonode-file]');
    return;
  }

  console.log('Loading '+file+'...');
  var fullHtml = fs.readFileSync(file)+'';

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
  else {
    console.log('Extracted eq80 script['+eq80_script.length+'] '+eq80_script.split('\n').slice(0,2).join('; \\n ')+'...')
  }

  console.log('Initializing eq80 script...');
  (0,eval)('var noui = true, window = { eval: eval }, location = "dummy";'+eq80_script+' //'+'# '+'sourceURL=' + file); // TODO: inject necessary LFs to align line numbers
  console.log('eq80 ',typeof eq80);

  console.log('Extracting files...');
  var allFiles = findFiles(fullHtml);
  console.log((allFiles.length||'no')+' found.');
  
  var outputFile = process.argv[3];
  if (!outputFile) {
    console.log('Writing at '+path.resolve('.')+'...')
    for (var i = 0; i < allFiles.length; i++) {
      //console.log("fs.writeFileSync("+'.'+allFiles[i].path+", "+allFiles[i].content.length+");");
      var writeDir = path.resolve('.'+allFiles[i].path, '..');
      createDirRecursive(writeDir);
      fs.writeFileSync('.'+allFiles[i].path, allFiles[i].content);
    }
    console.log('All '+allFiles.length+'saved.');
  }
  else {
    console.log('Retrieving '+outputFile+'...');
    var outputFileHtml = fs.readFileSync(outputFile)+'';
    var existingOutputFiles = findFiles(outputFileHtml);
    console.log((existingOutputFiles.length||'no')+' found.');

    var concatChunks = [];
    var start = 0;
    for (var i = 0; i < existingOutputFiles.length; i++) {
      var exChunk = existingOutputFiles[i];
      if (exChunk.start===start) continue;
      concatChunks.push(outputFileHtml.slice(start, exChunk.start));
      start = exChunk.end;
    }
    if (start < outputFileHtml.length-1)
      concatChunks.push(outputFileHtml.slice(start));

    if (concatChunks.length===1) {
      var lastAngleBracket = outputFileHtml.lastIndexOf('<');
      concatChunks = [outputFileHtml.slice(0, lastAngleBracket), outputFileHtml.slice(lastAngleBracket)];
    }

    console.log('Formatting '+allFiles.length+' as DOM file records...');
    var inject = [];
    for (var i = 0; i < allFiles.length; i++) {
      var fi = new eq80.persistence.dom.DOMFile(/*node*/null, allFiles[i].path, null, 0, 0);
      var fiHTML = '<'+'!-- '+fi.write(allFiles[i].content) + '--'+'>';
      inject.push(fiHTML);
    }

    var preparedOutputParts = [concatChunks[0]].concat(inject).concat(concatChunks.slice(1));
    var preparedOutputHTML = preparedOutputParts.join('');
    console.log('Saving ['+preparedOutputHTML.length+']...');
    fs.writeFileSync(outputFile+'.updated', preparedOutputHTML);
  }

  function createDirRecursive(dir) {
    if (fs.existsSync(writeDir)) return;
    //console.log('...creating '+dir+'...');
    var parent = path.dirname(dir);
    if (parent && (parent !== dir)) {
      //console.log(parent+'!=='+dir);
      createDirRecursive(parent);
    }
    try {
      fs.mkdirSync(dir);
    }
    catch (error) { }
  }

  function findFiles(htmlContent) {
    var importedFiles = [];
    var pos = 0;
    while (true) {
      pos = htmlContent.indexOf('<!'+'--', pos);
      if (pos<0) break;
      var end = htmlContent.indexOf('--'+'>', pos+4);
      if (end<0) break;

      var cmnt = new eq80.persistence.dom.CommentHeader({ nodeValue: htmlContent.slice(pos+4, end) });
      var domFile = eq80.persistence.dom.DOMFile.tryParse(cmnt);
      if (domFile) {
        importedFiles.push({
          path: domFile.path,
          content: domFile.read(),
          start:pos,
          end:end+3
        });
      }

      pos = end+3;
    }
    return importedFiles;
  }


  function findScript(html, filter) {
    var pos = 0;
    var tolo = html.toLowerCase();
    while (true) {
      var spos = tolo.indexOf('<'+'script', pos);
      if (spos<pos) return;
      pos = spos + ('<'+'script').length;
      var clpos = tolo.indexOf('>', pos);
      if (clpos < pos) return;
      pos = spos+1;

      var epos = tolo.indexOf('</'+'script');
      if (epos<pos) return;
      pos = epos+('</'+'script').length;

      var jsText = html.slice(clpos+1, epos);
      var pass = filter(jsText);
      if (pass) return jsText;
    }
  }
}