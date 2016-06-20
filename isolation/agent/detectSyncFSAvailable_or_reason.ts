declare var requestFileSystemSync, webkitRequestFileSystemSync, mozRequestFileSystemSync, oRequestFileSystemSync, msRequestFileSystemSync;

function detectSyncFSAvailable_or_reason() {
  var reqFS: any;
  var reqFS_variant_name: string;

  try {
    reqFS_variant_name = 'requestFileSystemSync';
    if (typeof requestFileSystemSync==='function') reqFS = requestFileSystemSync;
    else { reqFS_variant_name = 'webkitRequestFileSystemSync';
          if (typeof webkitRequestFileSystemSync==='function') reqFS = webkitRequestFileSystemSync;
          else { reqFS_variant_name = 'mozRequestFileSystemSync';
                if (typeof mozRequestFileSystemSync==='function') reqFS = mozRequestFileSystemSync;
                else { reqFS_variant_name = 'oRequestFileSystemSync';
                      if (typeof oRequestFileSystemSync==='function') reqFS = oRequestFileSystemSync;
                      else { reqFS_variant_name = 'msRequestFileSystemSync';
                            if (typeof msRequestFileSystemSync==='function') reqFS = msRequestFileSystemSync;
                            else return 'requestFileSystemSync and its prefixed variants are unavailable'; } } } }
  }
  catch (error) { return error.message+' - probing typeof '+reqFS_variant_name; }

  try {
    var fs = reqFS('TEMPORARY', 1024)
    return fs;
  }
  catch (error) {
    return error.message+' - invoking '+reqFS_variant_name;
  }
}
