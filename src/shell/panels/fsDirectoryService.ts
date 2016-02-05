module shell.panels {

  export function fsDirectoryService(fs: noapi.FS) {

    return (path: string) => {
      var result = [];
      var files = fs.readdirSync(path);
      var pathPrefix = path.charCodeAt(path.length-1)===47 ? path : path + '/';

      for (var i = 0; i < files.length; i++) {
        var fi = files[i];

        var name: string;
        var entryPath = pathPrefix + fi;
        try {
        var isDirectory = fs.statSync(entryPath).isDirectory();
        }
        catch (error) {
          throw new Error('fsDir('+path+') calling statSync('+entryPath+') getting '+error.message);
        }
        name = fi;// fi.slice(pathPrefix.length);

        var entry = { path: entryPath, name, flags: isDirectory ? Panel.EntryFlags.Directory : 0 };
        result.push(entry);
      }

      return result;
    };

  }

}