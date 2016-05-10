namespace panels {

  export function fsDirectoryService(fs: any) {

    return (path: string) => {
      var result = [];
      var files = fs.readdirSync(path);
      var pathPrefix = path.charCodeAt(path.length-1)===47 ? path : path + '/';

      for (var i = 0; i < files.length; i++) {
        var fi = files[i];

        var name: string;
        var entryPath = pathPrefix + fi;
        try {
        	var stat = fs.statSync(entryPath);
        }
        catch (error) {
          throw new Error('fsDir('+path+') calling statSync('+entryPath+') getting '+error.message);
        }
        name = fi;// fi.slice(pathPrefix.length);

        var entry = {
          path: entryPath,
          name,
          flags: stat.isDirectory() ? Panel.EntryFlags.Directory : 0,
          size: stat.size
        };
        result.push(entry);
      }

      return result;
    };

  }

}