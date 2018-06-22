function getFiles(
  filelist: (string | (string[]) | {[file: string]: any} | (() => string | string[])) & { filterFiles?: (logicalName: string, file: string) => void }) {

  var logicalPathList: string[] = [];
  var map = {};
  var logicalPathToFilesystemPath: { [logicalFile: string]: string } = {};

  // iterate and populate list/map
  // (this also eliminates duplicates)
  addFiles(filelist);

  var filesList: string[] = [];

  return {
    files: function() { return logicalPathList; },
    read: function(fi) {
      var content = map[fi];
      if (typeof content==='function') {
        content=content();
      }
      else if (typeof content!=='string') {
        content = fs.readFileSync(logicalPathToFilesystemPath[fi] || fi)+'';
      }
      return content;
    }
  };

  function addFiles(
    files: (string | (string[]) | { [file: string]: any } | (() => string | string[])) & { filterFiles?: (logicalName: string, file: string) => void },
    skipPathStrLength?: number) {
    if (!files) return;

    if (typeof files === 'string') {
      addFileStr(files, skipPathStrLength);

      return;
    }

    if (typeof files==='function') {
      addFiles(files());
      return;
    }

    if ((files as any[]).length && typeof (files as any[]).length==='number') {
      for (var i = 0; i < (files as any[]).length; i++) {
        addFiles(files[i], skipPathStrLength);
      }
    }

    if (typeof files==='object') {
      for (var k in files) if (k.charCodeAt(0)===47 && files.hasOwnProperty(k)) { // k is path thus starts with slash
        var content = files[k];
        if (typeof content==='string' || typeof content==='function') {
          addFileContent(k,content);
        }
        else if (content && typeof (content as any[]).length==='number') { // array inside property
          for (var i = 0; i < (content as any).length; i++) {
            var subcontent = content[i];
            if (typeof subcontent==='string') {
              subcontent = path.resolve(subcontent);
              addFileStr(subcontent, subcontent.length, k);
            }
          }
        }
      }
    }
  }

  function addFileContent(logicalPath: string, content?: any) {
    delete logicalPathToFilesystemPath[logicalPath];
    if (!map[logicalPath]) logicalPathList.push(logicalPath);
    map[logicalPath] = content;
  }

  function addFileContentRead(file: string, skipPathStrLength: number, redirectRoot: string) {
    let newPath: string;
    if (redirectRoot) {
      newPath = path.join(redirectRoot, file.slice(skipPathStrLength || 0));
    }
    else if (typeof skipPathStrLength === 'number') {
      newPath = file.slice(skipPathStrLength);
    }
    else {
      newPath = file.replace(/^.+(\/[^/]+)$/, '$1');
    }

    if (newPath.charCodeAt(0) !== 47) newPath = '/' + newPath;

    if (filelist.filterFiles) {
      if (!filelist.filterFiles(newPath, file)) return;
    }

    addFileContent(newPath);
    logicalPathToFilesystemPath[newPath] = file;
  }

  function addFileStr(file: string, skipPathStrLength?: number, redirectRoot?: string) {
    if (file!=='/' && !fs.existsSync(file)) {
      // TODO: handle globs??
      return;
    }

    var stat = file === '/' ? null : fs.statSync(file);
    if (stat && stat.isFile()) {
      addFileContentRead(file, skipPathStrLength, redirectRoot);
    }

    if (stat && !stat.isDirectory()) return;

    if (!skipPathStrLength && !redirectRoot) {
      skipPathStrLength = /\/$/.test(file) ? file.length - 1 : file.length;
    }

    var dirs = [file];
    while (dirs.length) {
      var d = dirs.pop();
      var files = fs.readdirSync(d);
      for (var i = 0; i <files.length; i++) {
        if (files[i]==='.' || files[i]==='..') continue;
        var f = path.join(d, files[i]);
        var stat = fs.statSync(f);

        if (stat.isFile()) {
          addFileContentRead(f, skipPathStrLength, redirectRoot);
        }

        if (stat.isDirectory()) {
          dirs.push(f);
        }
      }
    }
  }
}
