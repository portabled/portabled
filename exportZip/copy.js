var fs = require('fs');
var path = require('path');
var persistence = require('../persistence/lib/persistence.html');

run();

function run() {

  var input = collectInput();
  if (!input) return;

  var file = input.file;
  var allFiles = input.allFiles;
  var isInputDir = input.isInputDir;


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
      console.log('Extracting EQ80 files from '+outputFile+'...');
      var outputFileHtml = fs.readFileSync(outputFile)+'';
      var parsedOutputFile = persistence.parseHTML(outputFileHtml);
      console.log((parsedOutputFile.files.length||'none')+' found.');

      // map to find matchings
      var parsedMap = {};
      for (var i = 0; i < parsedOutputFile.files.length; i++) {
        parsedMap[parsedOutputFile.files[i].path] = parsedOutputFile.files[i];
      }

      // find matchings
      for (var i = 0; i < allFiles.length; i++) {
        var matchingParsedFile = parsedMap[allFiles[i].path];
        if (matchingParsedFile) {
          allFiles[i].matchingParsedFile = matchingParsedFile;
          matchingParsedFile.matchingSourceFile = allFiles[i];
        }
      }

      var resultHTML = outputFileHtml;

      // now go backwards through existing files, and patch them
      for (var i = parsedOutputFile.files.length-1; i >=0; i--) {
        var parsedFi = parsedOutputFile.files[i];
        if (parsedFi.matchingSourceFile) {
          resultHTML =
            resultHTML.slice(0, parsedFi.start)+
            '<!--'+
            persistence.formatFileInner(parsedFi.matchingSourceFile.path, parsedFi.matchingSourceFile.content)+
            '-->' +
            resultHTML.slice(parsedFi.end);
        }
      }

      var newFileInsertionOffset = resultHTML.lastIndexOf('-->');
      if (newFileInsertionOffset>=0) {
        newFileInsertionOffset += 3; // the length of end-comment
      }
      else {
        newFileInsertionOffset = resultHTML.lastIndexOf('</body');
        if (newFileInsertionOffset<0) {
        	newFileInsertionOffset = resultHTML.lastIndexOf('<');
          if (newFileInsertionOffset<0)
            newFileInsertionOffset = resultHTML.length;
        }
      }

      // now add new files
      for (var i = 0; i < allFiles.length; i++) {
        var newFile = allFiles[i];
        if (newFile.matchingParsedFile) continue; // that's already taken care of
        var insertChunk = '\n<!--'+persistence.formatFileInner(newFile.path, newFile.content)+'-->';
        resultHTML = resultHTML.slice(0, newFileInsertionOffset)+insertChunk+resultHTML.slice(newFileInsertionOffset);
        newFileInsertionOffset+=insertChunk.length;
      }


      console.log('Saving ['+resultHTML.length+']...');
      fs.writeFileSync(outputFile+'.updated.html', resultHTML);
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


function collectInput() {
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
    var scannedDirCount = 0;
    while (scanDirs.length) {
      var dir = scanDirs.pop();
      var dirFileList = fs.readdirSync(dir);
      scannedDirCount++;
      for (var i = 0; i < dirFileList.length; i++) {
        if (dirFileList[i]==='.'||dirFileList[i]==='..') continue;
        var dirFile = path.join(dir, dirFileList[i]);
        if (fs.statSync(dirFile).isFile()) {
          allFiles.push({path:dirFile.slice(file.length), content: fs.readFileSync(dirFile)+''});
          if (allFiles.length%100===0) {
            console.log('  ...'+allFiles.length+'. '+allFiles[allFiles.length-1].path+' in '+scannedDirCount+' directories');
          }
        }

        if (fs.statSync(dirFile).isDirectory()) scanDirs.push(dirFile);
      }
    }
  }

  console.log((allFiles.length||'none')+' found.');

  return { file: file, allFiles: allFiles, isInputDir: isInputDir };
}
