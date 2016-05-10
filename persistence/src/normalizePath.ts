function normalizePath(path: string) : string {

  if (!path) return '/'; // empty paths converted to root

  if (path.charAt(0) !== '/') // ensuring leading slash
    path = '/' + path;

  path = path.replace(/\/\/*/g, '/'); // replacing duplicate slashes with single

  return path;
}