function getFiles(filelist) {

  var list = [];
  var map = {};
  var redirects = {};

  // iterate and populate list/map
  // (this also eliminates duplicates)
  addFiles(filelist);


  return {
    files: function() { return list; },
    read: function(fi) {
      var content = map[fi];
      if (typeof content==='function') {
        content=content();
      }
      else if (typeof content!=='string') {
        content = fs.readFileSync(redirects[fi] || fi);
      }
      return content;
    }
  };

  function addFiles(files) {
    if (!files) return;

    if (typeof files==='string') {
      addFileStr(files);
      return;
    }

    if (typeof files==='function') {
      addFiles(files());
      return;
    }

    if (files.length && typeof files.length==='number') {
      for (var i = 0; i < files.length; i++) {
        addFiles(files[i]);
      }
    }

    if (typeof files==='object') {
      for (var k in files) if (k.charCodeAt(0)===47 && files.hasOwnProperty(k)) { // k is path thus starts with slash
        var content = files[k];
        if (typeof content==='string' || typeof content==='function') {
          addFileContent(k,content);
        }
        else if (content && typeof content.length==='number') {
          for (var i = 0; i < content.length; i++) {
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

  function addFileContent(file: string, content?: any) {
    delete redirects[file];
    if (!map[file]) list.push(file);
    map[file] = content;
  }

  function addFileContentRead(file: string, skipPathStrLength: number, redirectRoot: string) {
    if (redirectRoot) {
      var newPath = path.join(redirectRoot, file.slice(skipPathStrLength));
      if (newPath.charCodeAt(0)!==47) newPath = '/'+newPath;
      if (filelist.filterFiles) {
        if (!filelist.filterFiles(file, newPath)) return;
      }

      addFileContent(newPath);
      redirects[newPath] = file;
    }
    else {
      if (filelist.filterFiles) {
        if (!filelist.filterFiles(file, file)) return;
      }
      addFileContent(file);
    }
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
