function nopath_dirname(p: string): string {
  var p = nopath_normalize(p);
  if (p === '/') return '/';
  var lastSlash = p.lastIndexOf('/');
  if (lastSlash === p.length - 1)
    lastSlash = p.lastIndexOf('/', lastSlash - 1);
  return p.slice(0, lastSlash + 1);
}
