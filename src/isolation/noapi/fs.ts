module noapi {

  export function createFS(
    drive: persistence.Drive,
    modules: { path: Path; }) {

    var fs: FS = {

      renameSync: renameSync,
      rename: wrapAsync(renameSync),

      statSync: statSync,
      lstatSync: statSync,
      stat: wrapAsync(statSync),
      lstat: wrapAsync(statSync),
      fstat: null, fstatSync: null, // TODO: implement fstat using fstab


      existsSync: existsSync,
      exists: wrapAsyncNoError(existsSync),

      openSync: openSync,
      open: wrapAsync(openSync),
      close: null, closeSync: () => { },
      fsync: null, fsyncSync: null,



      readFileSync: readFileSync,
      readFile: wrapAsync(readFileSync),
      createReadStream: null,

      writeFileSync: writeFileSync,
      writeFile: wrapAsync(writeFileSync),
      appendFile: null, appendFileSync: null,
      createWriteStream: null,


      readSync: readSync,
      read: wrapAsync(readSync),

      writeSync: writeSync,
      write: wrapAsync(writeSync),



      truncate: null, truncateSync: null,
      ftruncate: null, ftruncateSync: null,

      chown: null, chownSync: null,
      fchown: null, fchownSync: null,
      lchown: null, lchownSync: null,

      chmod: null, chmodSync: null,
      fchmod: null, fchmodSync: null,
      lchmod: null, lchmodSync: null,

      link: null, linkSync: null,
      readlink: null, readlinkSync: null,

      symlink: null, symlinkSync: null,
      unlink: null, unlinkSync: null,

      realpath: null, realpathSync: null,

      mkdir: wrapAsync(mkdirSync), mkdirSync: mkdirSync,
      rmdir: null, rmdirSync: null,

      readdir: wrapAsync(readdirSync), readdirSync: readdirSync,

      utimes: null, utimesSync: null,
      futimes: null, futimesSync: null,


      watch: watch, watchFile: watchFile, unwatchFile: unwatchFile
    };

    return { fs: fs, filesChanged: onfilesChanged };

    var _cache: { all: FNode; root: FNode; };
    var _cache_timestamp;
    function get_cache() {
			if (!_cache && _cache_timestamp !== drive.timestamp)
      	_cache = fs_cache_structure(drive.files());
      return _cache;
    }

    function readdirSync(path: string): string[] {
      var fullPath = modules.path.resolve(path);
      var plusSlash = fullPath.charCodeAt(fullPath.length-1)===47 ? 0 : 1; // 47 is forwardslash

      var result: string[] = [];
      var files = drive.files();
      var resultMap: any = [];
      for (var i = 0; i < files.length; i++) {
        var fname = files[i];
        if (fname.length<=path.length
            || (fullPath.length>1 && fname.charCodeAt(1)!==fullPath.charCodeAt(1)) // first letter doesn't match (where more than 1 letter)
            || fname.charCodeAt(fullPath.length+plusSlash-1)!==47
            || fname.slice(0, fullPath.length)!==fullPath)
          continue;

        var nextSlash = fname.indexOf('/', fullPath.length+plusSlash);
        if (nextSlash > 0)
          fname = fname.slice(0, nextSlash);

        if (resultMap[fname]) continue;
        resultMap[fname] = 1;
        result.push(fname);
      }

      return result;
    }

    function onfilesChanged(files: string[]) {
      _cache = null;
      // TODO: fire watches!
    }

    function existsSync(file: string): boolean {
      var fileFull = modules.path.resolve(file);
      return !!fileOrDir(fileFull);
    }

    function fileOrDir(file: string) {
      var content = drive.read(file);
      if (content || (content !== null && typeof content === 'undefined'))
        return 1;

      var files = drive.files();
      var normPath = modules.path.normalize(file);
      if (normPath.slice(-1) !== '/') normPath += '/';
      var leadMatch = getStartMatcher(file);
      for (var i = 0; i < files.length; i++) {
        if (leadMatch(files[i])) return 2; // directory exists
      }

      return 0;
    }

    function mkdirSync(path: string, mode?: any): void {
      var normPath = modules.path.resolve(path);
      if (normPath.slice(-1) !== '/') normPath += '/';

      if (existsSync(path)) throw new Error('Directory \'' + path + '\'');

      drive.write(normPath, '');
    }

    function renameSync(oldPath: string, newPath: string): void {

      var norm_oldPath = modules.path.resolve(oldPath);
      var norm_newPath = modules.path.resolve(newPath);

      var oldContent = drive.read(norm_oldPath);
      if (oldContent !== null) {
        // TODO: check if directory is in the way
        // if (nofs
        drive.write(norm_newPath, oldContent);
        drive.write(norm_oldPath, null);
        return;
      }

      if (drive.read(norm_newPath) !== null) {
        // node actually reports oldPath here, but let's be reasonable
        throw new Error('ENOTDIR, not a directory \'' + newPath + '\'');
      }

      if (norm_oldPath === '/')
        throw new Error('EBUSY, resource busy or locked \'/\'');
      else
        norm_oldPath += '/';

      if (norm_newPath === '/')
        throw new Error('EBUSY, resource busy or locked \'/\'');
      else
        norm_newPath += '/';


      var files = drive.files();

      var startAsOld = getStartMatcher(norm_oldPath);

      for (var i = 0; i < files.length; i++) {
        var fi = files[i];
        if (startAsOld(fi)) {
          var oldContent = drive.read(fi);
          var restPath = fi.slice(norm_newPath.length);
          var newFiPath = norm_newPath + restPath;
          drive.write(newFiPath, oldContent);
          drive.write(newFiPath, null);
        }
      }

    }



    function statSync(path: string): Stats {

      var norm_path = modules.path.resolve(path);
      if (/.\/$/.test(norm_path)) norm_path = norm_path.slice(0, norm_path.length-1);
      var cache = get_cache();
      var fnode = cache.all[norm_path];

      if (!fnode)
        throw new Error('ENOENT, no such file or directory \''+path+'\'');
      var content = drive.read(norm_path);
      var isDir = typeof fnode === 'object';
      var sz = isDir?0:content.length;

      var tm = new Date(drive.timestamp);

      var st = {
        isFile: () => !isDir,
        isDirectory: () => isDir,
        isBlockDevice: () => false,
        isCharacterDevice: () => true,
        isSymbolicLink: () => false,
        isFIFO: () => false,
        isSocket: () => false,
        dev: 234245,
        ino: 938450,
        mode: 0,
        nlink: 1,
        uid: 430534953,
        gid: 348274,
        rdev: 50953455,
        size: sz,
        blksize: -1,
        blocks: -1,
        atime: tm,
        mtime: tm,
        ctime: tm
      };
      return st;
    }
    /*
      stat(path: string, callback?: (err: no_ErrnoError, stats: nofs_Stats) => any): void;
      lstat(path: string, callback?: (err: no_ErrnoError, stats: nofs_Stats) => any): void;
      fstat(fd: number, callback?: (err: no_ErrnoError, stats: nofs_Stats) => any): void;
      statSync(path: string): nofs_Stats;
      lstatSync(path: string): nofs_Stats;
      fstatSync(fd: number): nofs_Stats;
    */



    function readFileSync(filename: string, options?: { encoding?: string; flag?: string; }): any {

      // TODO: handle encoding and other
      return drive.read(modules.path.resolve(filename));

    }

    function readSync(fd: number, buffer: Buffer, offset: number, length: number, position: number): number {

      // TODO: consider also std handles
      //var path = nofs_fdtable()[fd];

      throw new Error('Buffer-aware API fs.readSync is not implemented.');
    }



    function writeFileSync(filename: string, content: string) {

      drive.write(modules.path.resolve(filename), content);

    }


    function writeSync(fd: number, buffer: Buffer, offset: number, length: number, position: number): number {

      if (fd === 1) {
        if (typeof console !== 'undefined')
          console.log(buffer);

        return length;
      }

      var path = get_fdtable()[fd];

      writeFileSync(path, buffer);
    }




    function openSync(path: string, flags: string, mode?: number): number;
    function openSync(path: string, flags: string, mode?: string): number;
    function openSync(path: string, flags?: string, mode?: any): number {

      var fdtable = get_fdtable();

      for (var fd in fdtable) {
        var fpath = fdtable[fd];
        if (fpath === path) {
          return Number(fd);
        }
      }

      var newFD = _fdbase_++;
      fdtable[newFD] = path;
      return newFD;
    }

    var _fdbase_;
    var _fdtable_: string[];

    function get_fdtable() {
      if (!_fdtable_) {
        _fdtable_ = [];
        _fdbase_ = 34957346;
      }
      return _fdtable_;
    }
  }





  function getStartMatcher(oldPath: string) {

    if (!oldPath) return (txt: string) => !txt;

    return (txt: string) => {
      if (!txt) return false;
      if (txt.length < oldPath.length) return false;
      return txt.slice(0, oldPath.length) === oldPath;
    };
  }

  var _watchFileListener: any;

  function watchFile(filename: string, listener: (curr: Stats, prev: Stats) => void): void;
  function watchFile(filename: string, options: { persistent?: boolean; interval?: number; }, listener: (curr: Stats, prev: Stats) => void): void;
  function watchFile(filename: string, arg1: any, arg2?: any) {
    throw new Error('not implemented');
  }

  function unwatchFile(filename: string, listener ?: (curr: Stats, prev: Stats) => void): void {
    throw new Error('not implemented');
  }

  function watch(filename: string, listener?: (event: string, filename: string) => any): Watcher;
  function watch(filename: string, options: { persistent?: boolean; }, listener?: (event: string, filename: string) => any): Watcher;
  function watch(filename: string, arg1?: any, arg2?: any): Watcher {
    throw new Error('not implemented');
  }

}