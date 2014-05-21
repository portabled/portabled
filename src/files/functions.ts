module teapo.files {

  /**
   * Convert string path into an array of path parts,
   * processing '..' as necessary.
   */
  export function normalizePath(path: string): string[] {
    if (!path) return [];

    var pathMid = stripOuterSlashes(path);
    var split = pathMid.split('/');

    var result: string[] = [];
    for (var i = 0; i < split.length; i++) {
      if (split[i] === '..') {
        if (result.length)
          result.length--;
        continue;
      }
      else if (split[i] === '.' || split[i] === '') {
        continue;
      }
      else {
        result.push(split[i]);
      }
    }
    return result;
  }

  function stripOuterSlashes(path: string) {
    var start = 0;
    while (path.charAt(start) === '/')
      start++;

    var end = Math.max(start, path.length - 1);
    while (end > start && path.charAt(end) === '/')
      end--;

    var pathMid = start === 0 && end === path.length - 1 ? path : path.slice(start, end + 1);
    return pathMid;
  }

}