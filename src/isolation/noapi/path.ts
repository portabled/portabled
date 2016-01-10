module noapi {

  export function createPath(process: Process): Path {

    var result: Path = {
      basename, extname,
      dirname,
      isAbsolute,
      normalize,
      join,
      relative, resolve,
      sep: '/',
      delimiter: ':'
    };
    return result;

    function isAbsolute(p: string): boolean {
      return /^\//.test(p);
    }

    function extname(p: string): string {

      var base = basename(p);
      var lastDot = base.lastIndexOf('.');
      if (lastDot >= 0)
        return base.slice(lastDot);
      else
        return '';

    }

    function join(...paths: any[]): string {
      return join_core(paths);
    }

    function join_core(paths: any[]): string {
      var parts: string[] = [];
      var trailSlash = false;
      for (var i = 0; i < paths.length; i++) {
        var part = paths[i];
        if (!part) continue;

        if (parts.length) {
          var wlead = part;
          part = part.replace(/^\/*/, '');
          if (!part) continue;
          if (wlead.length > part.length)
            parts.push('');
        }
        var wtrail = part;
        part = part.replace(/\/*$/, '');
        if (!part) continue;
        parts.push(part);

        trailSlash = wtrail.length > part.length;
      }

      if (trailSlash)
        parts.push('/');

      return parts.join('/');
    }

    function relative(from: string, to: string): string {
      throw new Error('path/relative is not implemented');
    }

    function resolve(...pathSegments: any[]): string {

      var path = join_core(pathSegments);

      if (typeof path !== 'string') throw new Error('Path must be a string. Received '+typeof path);
      if (!path || path === '.' || path === './') return process.cwd();

      if (/^\.\//.test(path))
        path = path.replace(/^\.\//, '');

      if (path.charCodeAt(0)!==47) { // starts with NO slash, neither . or ..
        var cwd = process.cwd();
        if (cwd.slice(-1)==='/')
          path = cwd + path;
        else
          path = cwd + '/' + path;
      }

      if (path==='/') return '/';

      if (!/^\.+$/.test(path) && !/^\.+\//.test(path) && !/\/\.+\//.test(path) && !/\/\.+$/.test(path))
        return path; // has no dot-directories such as . or ..  ?

      var trailingSlash = path.length && path.charCodeAt(path.length-1)===47;
      var parts = path.split('/');
      var newParts: string[] = [];
      for (var i = 0; i < parts.length; i++) {
        if (!parts[i]) continue;
        if (parts[i]==='.') continue;
        if (parts[i]==='..') {
          if (newParts.length) newParts.pop(); // going up beyond root returns root
        }
        else {
          newParts.push(parts[i]);
        }
      }

      return '/'+newParts.join('/')+(trailingSlash ? '/' : '');
    }
  }

  export function basename(p: string, ext?: string): string {

    p = normalize(p);
    if (p === '/')
      return '';

    var result: string;

    var lastSlash = p.lastIndexOf('/');
    if (lastSlash === p.length - 1) {
      var prevSlash = p.lastIndexOf('/', lastSlash - 1);
      if (prevSlash < 0)
        prevSlash = 0;
      result = p.slice(prevSlash + 1, lastSlash);
    }
    else {
      result = p.slice(lastSlash + 1);
    }

    if (ext && result.length >= ext.length && result.slice(-ext.length) === ext)
      result = result.slice(0, result.length - ext.length);
  }

  export function dirname(p: string): string {
    var p = normalize(p);
    if (p === '/') return '/';
    var lastSlash = p.lastIndexOf('/');
    if (lastSlash === p.length - 1)
      lastSlash = p.lastIndexOf('/', lastSlash - 1);
    return p.slice(0, lastSlash + 1);
  }

  export function normalize(p: string): string {
    return p;
  }

}
