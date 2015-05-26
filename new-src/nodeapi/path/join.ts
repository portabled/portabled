function nopath_join(...paths: any[]): string {
  return nopath_join_core(paths);
}

function nopath_join_core(paths: any[]): string {
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