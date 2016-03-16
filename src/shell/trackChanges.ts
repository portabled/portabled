namespace shell {

  export function trackChanges(drive: persistence.Drive): { drive: persistence.Drive; onchanges: (changedFiles: string[]) => void; } {

    var delayTimeout = 300;
    var _changedFileMap: any = {};
    var _changedFiles: string[] = [];
    var _reportChangesTimeout = 0;
    var _reportChangesFirst = 0;
    var backslashCode = ('/').charCodeAt(0);

    var result = {
      drive: {
        timestamp: drive.timestamp,
        files: () => {
          var list = drive.files();
          result.drive.timestamp = drive.timestamp;
          return list;
        },
        read: (file: string) => {
          var content = drive.read(file);
          result.drive.timestamp = drive.timestamp;
          return content;
        },
        write: (origFile: string, content) => {
          drive.timestamp = result.drive.timestamp;
          drive.write(origFile, content);
          var file = origFile; // normalizePath(origFile);   <--- should already be normalized, no?
          if (file.charCodeAt(0) === backslashCode) {
            if (_changedFileMap[file]) return;
            _changedFileMap[file] = true;
            _changedFiles.push(file);
            var now = Date.now ? Date.now() : +new Date();
            if (!_reportChangesFirst)
              _reportChangesFirst = now;

            if (now - _reportChangesFirst < 1) {
              clearTimeout(_reportChangesTimeout);
              if (!_reportChangesFirst) _reportChangesFirst = +new Date();
              _reportChangesTimeout = setTimeout(reportChanges, delayTimeout);
            }
          }
        }
      },
      onchanges: null
    };
    if (drive.storedSize)
      (<persistence.Drive>result.drive).storedSize = (file: string) => drive.storedSize(file);
    return result;

    function reportChanges() {
      _reportChangesFirst = 0;
      if (result.onchanges) {
        var list = _changedFiles;
        _changedFiles = [];
        _changedFileMap = {};
        result.onchanges(list);
      }
    }
  }

}