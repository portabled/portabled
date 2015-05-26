function nopath_basename(p: string, ext?: string): string {

  p = nopath_normalize(p);
  if (p === '/')
    return '';

  var result: string;

  var lastSlash = p.lastIndexOf('/');
  if (lastSlash===p.length-1) {
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