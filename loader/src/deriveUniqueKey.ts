function deriveUniqueKey(locationSeed) {

  var key = (locationSeed + '').split('?')[0].split('#')[0].toLowerCase();

  var posIndexTrail = key.search(/\/index\.html$/);
  if (posIndexTrail > 0) key = key.slice(0, posIndexTrail);

  if (key.charAt(0) === '/')
    key = key.slice(1);
  if (key.slice(-1) === '/')
    key = key.slice(0, key.length - 1);

  // extract readable part
  var colonSplit = key.split(':');
  var readableKey = colonSplit[colonSplit.length-1].replace(/[^a-zA-Z0-9\/]/g, '').replace(/\/\//g, '/').replace(/^\//, '').replace(/\/$/, '').replace(/\.html$/, '');
  var readableSlashPos = readableKey.indexOf('/');
  if (readableSlashPos>0 && readableSlashPos < readableKey.length/2)
    readableKey = readableKey.slice(readableSlashPos+1);
  readableKey = readableKey.replace('/', '_');
  if (!readableKey)
    readableKey = 'po';

  return readableKey+'_'+smallHash(key) + 'H' + smallHash(key.slice(1) + 'a');

  function smallHash(key) {
    for (var h = 0, i = 0; i < key.length; i++) {
      h = Math.pow(31, h + 31 / key.charCodeAt(i));
      h -= h | 0;
    }
    return (h * 2000000000) | 0;
  }

}
