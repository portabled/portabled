function updateBootStateProps() {
  for (var k in bootDrive) if (k && bootDrive.hasOwnProperty(k) && typeof bootDrive[k]!=='function' && k.charAt(0)!=='_') {
    bootState[k] = bootDrive[k];
  }

  if (!bootState.read)
    bootState.read = function(path) { return bootDrive.read(path); };
}
