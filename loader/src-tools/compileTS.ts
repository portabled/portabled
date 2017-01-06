declare var fs, path, require, process;




declare namespace compileTS {

  type CompileResult = {
    [file: string]: string;
  } & {
    files: { file: string; data: string; }[];
  };

}

function compileTS(...args: string[]): compileTS.CompileResult {
  function readDirectory(dir, extension, exclude) {
    var result = [];
    var expExclude = [], excludeMap = {};
    for (var i = 0; i < exclude.length; i++) {
      excludeMap[expExclude[i] = path.resolve(dir, exclude[i])] = true;
    }
    addDir(dir);
    return result;

    function addDir(dir) {
      var files = fs.readdirSync(dir || ".").sort();
      var directories = [];

      for (var i = 0; i < files.length; i++) {
        var f = path.resolve(dir, files[i]);
        if (!excludeMap[f]) {
          var stat = fs.statSync(f);
          if (stat.isFile() && (!extension || f.slice(-extension.length)===extension)) result.push(f);
          if (stat.isDirectory()) directories.push(f);
        }
      }

      for (var i = 0; i < directories.length; i++) addDir(directories[i]);
    }
  }

  var tscPath = require.resolve('typescript/lib/tsc.js');
  var tscScript = '(function(){ return function (ChakraHost) { '+fs.readFileSync(tscPath)+'\n}})() //# '+'sourceURL='+tscPath+'@wrapped';

  var result = {files:[]} as compileTS.CompileResult;

  var chakraHost = {
    newLine: '\n',
    args: args,
    useCaseSensitiveFileNames: true,
    echo: function(text) {
      console.log(text);
    },
    readFile: function (path, encoding) {
      return fs.readFileSync(path)+'';
    },
    writeFile: function (file, data, writeByteOrderMark) {
      //console.log('writeFile(',file,',',data.length);
      result[file] = data;
      result.files.push({file:file, data:data});
    },
    resolvePath: function(file) { return path.resolve(file); },
    fileExists: function(file) { return fs.existsSync(file) && fs.statSync(file).isFile(); },
    directoryExists: function(file) {
      return path.resolve(file) === '/' || fs.existsSync(file) && fs.statSync(file).isDirectory();
    },
    createDirectory: function() { },
    executingFile: tscPath,
    currentDirectory: process.cwd(),
    readDirectory: readDirectory,
    quit: function() { }
  };

  var tsc = eval(tscScript);
  tsc(chakraHost);

  return result;
}
