namespace noapi {

  export function fs_cache_structure(files: string[]) {

    var all: FNode = {};
    var root: FNode = {};

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
        all[fi] = parent[fi] = fi.slice(nextSlash+1);
        return;
      }

      var dirPath = fi.slice(0, nextSlash);

      if (typeof parent[dirPath]!=='object')
        parent[dirPath] = {};
      parent = all[dirPath] = parent[dirPath];

      parentSlash = nextSlash;
    }
  }

  type FNode = { [path: string]: FNode; } | string;

}