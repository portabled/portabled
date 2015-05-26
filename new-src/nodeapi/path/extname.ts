function nopath_extname(p: string): string {

  var base = nopath_basename(p);
  var lastDot = base.lastIndexOf('.');
  if (lastDot >= 0)
    return base.slice(lastDot);
  else
    return '';

}