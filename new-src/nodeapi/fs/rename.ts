function nofs_renameSync(oldPath: string, newPath: string): void {

  var oldContent = no_drive.read(oldPath);
  if (oldContent !== null) {
    // TODO: check if directory is in the way
    // if (nofs
    no_drive.write(newPath, oldContent);
    no_drive.write(oldPath, null);
    return;
  }

  if (no_drive.read(newPath) !== null) {
    // node actually reports oldPath here, but let's be reasonable
    throw new Error('ENOTDIR, not a directory \'' + newPath + '\'');
  }

  var norm_oldPath = nopath_resolve(oldPath);
  if (norm_oldPath === '/')
    throw new Error('EBUSY, resource busy or locked \'/\'');
  else
    norm_oldPath += '/';

  var norm_newPath = nopath_resolve(newPath);
  if (norm_newPath === '/')
    throw new Error('EBUSY, resource busy or locked \'/\'');
  else
    norm_newPath += '/';


  var files = no_drive.files();


  var startAsOld = no_getStartMatcher(norm_oldPath);

  for (var i = 0; i < files.length; i++) {
    var fi = files[i];
    if (startAsOld(fi)) {
      var oldContent = no_drive.read(fi);
      var restPath = fi.slice(norm_newPath.length);
      var newFiPath = norm_newPath + restPath;
      no_drive.write(newFiPath, oldContent);
      no_drive.write(newFiPath, null);
    }
  }

}