namespace noapi {

  export namespace fs_cache {

    export function fs_cache_structure(files: string[]) {

      var all: { [fullPath: string]: FNode; } = {};
      var root: FNode = {name: '/', files: null};

      files.sort();
      for (var i = 0; i < files.length; i++) {

        var fi = files[i];

        pushFile(fi, all, root);
      }

      return { all, root };
    }

    function pushFile(fi: string, all: FNode, root: FNode) {
      var parent = root;
      var parentSlash = 0;
      if (fi.charCodeAt(0)!==47) fi = '/'+fi;

      while (true) {

        var nextSlash = fi.indexOf('/', parentSlash+1);
        if (nextSlash<0) {
          all[fi] = parent[fi] = fi.slice(parentSlash +1);
          return;
        }

        var dirPath = fi.slice(0, nextSlash);

        if (typeof parent[dirPath]!=='object')
          parent[dirPath] = {name: fi.slice(parentSlash+1, nextSlash),files:null};
        parent = all[dirPath] = parent[dirPath];

        parentSlash = nextSlash;
      }
    }

    export type FNode = any | string;

  }

}