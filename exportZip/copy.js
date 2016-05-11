var fs = require('fs');
var path = require('path');
var persistence = require('../persistence/lib/persistence.html');

run();

function run() {
  var file = process.argv[2];
  if (!file) {
    console.log('copy.js  nonode-file|directory  [output-nonode-file|directory]');
    return;
  }
  if (!fs.existsSync(file)) {
    console.log('File not found: '+file);
    return;
  }

  var isInputDir = fs.statSync(file).isDirectory();
  if (!isInputDir) {
    console.log('Loading '+file+'...');
    var fullHtml = fs.readFileSync(file)+'';

    console.log('Extracting files...');
    var parsedHTML = persistence.parseHTML(fullHtml);
    var allFiles = parsedHTML.files;
  }
  else {
    console.log('Searching for files in '+file+'...');
    var allFiles = [];
    var scanDirs = [file];
    while (scanDirs.length) {
      var dir = scanDirs.pop();
      var dirFileList = fs.readdirSync(dir);
      for (var i = 0; i < dirFileList.length; i++) {
        if (dirFileList[i]==='.'||dirFileList[i]==='..') continue;
        var dirFile = path.join(dir, dirFileList[i]);
        if (fs.statSync(dirFile).isFile()) allFiles.push({path:dirFile.slice(file.length), content: fs.readFileSync(dirFile)+''});
        if (fs.statSync(dirFile).isDirectory()) scanDirs.push(dirFile);
      }
    }
  }

  console.log((allFiles.length||'none')+' found.');


  var outputFile = process.argv[3] || path.basename(file)+'-files';
  var isOutputDir = fs.existsSync(outputFile) ? fs.statSync(outputFile).isDirectory() : !isInputDir;

  if (isOutputDir) {
    console.log('Writing at '+path.resolve(outputFile)+'...')
    for (var i = 0; i < allFiles.length; i++) {
      //console.log("fs.writeFileSync("+'.'+allFiles[i].path+", "+allFiles[i].content.length+");");
      var writeDir = path.resolve('.'+allFiles[i].path, '..');
      createDirRecursive(writeDir);
      fs.writeFileSync(path.join(file,allFiles[i].path), allFiles[i].content);
    }
    console.log('All '+allFiles.length+'saved.');
  }
  else {
    if (fs.existsSync(outputFile)) {
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
        var matchTrail = /(<\/body>\s*)?<\/html>\s*$/.exec(outputFileHtml);
        if (matchTrail) {
          concatChunks = [outputFileHtml.slice(0, matchTrail.index), outputFileHtml.slice(matchTrail.indexOf)];
        }
        else {
          concatChunks.push('');
        }
      }

      console.log('Formatting '+allFiles.length+' as DOM file records...');
      var inject = [];
      for (var i = 0; i < allFiles.length; i++) {
        var fiHTML = '<'+'!-- '+new persistence.formatFileInner(allFiles[i].path, allFiles[i].content) + '--'+'>';
        inject.push(fiHTML);
      }

      var preparedOutputParts = [concatChunks[0]].concat(inject).concat(concatChunks.slice(1));
      var preparedOutputHTML = preparedOutputParts.join('');
      console.log('Saving ['+preparedOutputHTML.length+']...');
      fs.writeFileSync(outputFile+'.updated', preparedOutputHTML);
    }
    else {
      var totalSize= 0;
      var manufacturedHTML = '';
      for (var i = 0; i < allFiles.length; i++) {
        totalSize += allFiles[i].content.length;
        manufacturedHTML+='<!--'+persistence.formatFileInner(allFiles[i].path, allFiles[i].content)+'-->\n';
      }
      manufacturedHTML =
        '<!doctype html><html><head><meta charset="utf-8"><title>'+file+' EXPORT</title>\n'+
        '<!--'+persistence.formatTotalsInner(+new Date(), totalSize)+'-->\n'+
        '</head><body>\n'+
        manufacturedHTML+
        '</body></html>';
      fs.writeFileSync(outputFile, manufacturedHTML);
    }
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