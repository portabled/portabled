interface FS {

  rename(oldPath: string, newPath: string, callback?: (err?: ErrnoError) => void): void;
  renameSync(oldPath: string, newPath: string): void;


  truncate(path: string, callback?: (err?: ErrnoError) => void): void;
  truncate(path: string, len: number, callback?: (err?: ErrnoError) => void): void;
  truncateSync(path: string, len?: number): void;

  ftruncate(fd: number, callback?: (err?: ErrnoError) => void): void;
  ftruncate(fd: number, len: number, callback?: (err?: ErrnoError) => void): void;
  ftruncateSync(fd: number, len?: number): void;


  chown(path: string, uid: number, gid: number, callback?: (err?: ErrnoError) => void): void;
  chownSync(path: string, uid: number, gid: number): void;

  fchown(fd: number, uid: number, gid: number, callback?: (err?: ErrnoError) => void): void;
  fchownSync(fd: number, uid: number, gid: number): void;

  lchown(path: string, uid: number, gid: number, callback?: (err?: ErrnoError) => void): void;
  lchownSync(path: string, uid: number, gid: number): void;


  chmod(path: string, mode: number, callback?: (err?: ErrnoError) => void): void;
  chmod(path: string, mode: string, callback?: (err?: ErrnoError) => void): void;
  chmodSync(path: string, mode: number): void;
  chmodSync(path: string, mode: string): void;

  fchmod(fd: number, mode: number, callback?: (err?: ErrnoError) => void): void;
  fchmod(fd: number, mode: string, callback?: (err?: ErrnoError) => void): void;
  fchmodSync(fd: number, mode: number): void;
  fchmodSync(fd: number, mode: string): void;

  lchmod(path: string, mode: number, callback?: (err?: ErrnoError) => void): void;
  lchmod(path: string, mode: string, callback?: (err?: ErrnoError) => void): void;
  lchmodSync(path: string, mode: number): void;
  lchmodSync(path: string, mode: string): void;


  stat(path: string, callback?: (err: ErrnoError, stats: Stats) => any): void;
  lstat(path: string, callback?: (err: ErrnoError, stats: Stats) => any): void;
  fstat(fd: number, callback?: (err: ErrnoError, stats: Stats) => any): void;
  statSync(path: string): Stats;
  lstatSync(path: string): Stats;
  fstatSync(fd: number): Stats;


  link(srcpath: string, dstpath: string, callback?: (err?: ErrnoError) => void): void;
  linkSync(srcpath: string, dstpath: string): void;

  symlink(srcpath: string, dstpath: string, type?: string, callback?: (err?: ErrnoError) => void): void;
  symlinkSync(srcpath: string, dstpath: string, type?: string): void;


  readlink(path: string, callback?: (err: ErrnoError, linkString: string) => any): void;
  readlinkSync(path: string): string;


  realpath(path: string, callback?: (err: ErrnoError, resolvedPath: string) => any): void;
  realpath(path: string, cache: { [path: string]: string }, callback: (err: ErrnoError, resolvedPath: string) => any): void;
  realpathSync(path: string, cache?: { [path: string]: string }): string;


  unlink(path: string, callback?: (err?: ErrnoError) => void): void;
  unlinkSync(path: string): void;


  rmdir(path: string, callback?: (err?: ErrnoError) => void): void;
  rmdirSync(path: string): void;


  mkdir(path: string, callback?: (err?: ErrnoError) => void): void;
  mkdir(path: string, mode: number, callback?: (err?: ErrnoError) => void): void;
  mkdir(path: string, mode: string, callback?: (err?: ErrnoError) => void): void;
  mkdirSync(path: string, mode?: number): void;
  mkdirSync(path: string, mode?: string): void;


  readdir(path: string, callback?: (err: ErrnoError, files: string[]) => void): void;
  readdirSync(path: string): string[];


  close(fd: number, callback?: (err?: ErrnoError) => void): void;
  closeSync(fd: number): void;


  open(path: string, flags: string, callback?: (err: ErrnoError, fd: number) => any): void;
  open(path: string, flags: string, mode: number, callback?: (err: ErrnoError, fd: number) => any): void;
  open(path: string, flags: string, mode: string, callback?: (err: ErrnoError, fd: number) => any): void;
  openSync(path: string, flags: string, mode?: number): number;
  openSync(path: string, flags: string, mode?: string): number;


  utimes(path: string, atime: number, mtime: number, callback?: (err?: ErrnoError) => void): void;
  utimes(path: string, atime: Date, mtime: Date, callback?: (err?: ErrnoError) => void): void;
  utimesSync(path: string, atime: number, mtime: number): void;
  utimesSync(path: string, atime: Date, mtime: Date): void;

  futimes(fd: number, atime: number, mtime: number, callback?: (err?: ErrnoError) => void): void;
  futimes(fd: number, atime: Date, mtime: Date, callback?: (err?: ErrnoError) => void): void;
  futimesSync(fd: number, atime: number, mtime: number): void;
  futimesSync(fd: number, atime: Date, mtime: Date): void;


  fsync(fd: number, callback?: (err?: ErrnoError) => void): void;
  fsyncSync(fd: number): void;


  read(fd: number, buffer: Buffer, offset: number, length: number, position: number, callback?: (err: ErrnoError, bytesRead: number, buffer: Buffer) => void): void;
  readSync(fd: number, buffer: Buffer, offset: number, length: number, position: number): number;

  readFile(filename: string, encoding: string, callback: (err: ErrnoError, data: string) => void): void;
  readFile(filename: string, options: { encoding: string; flag?: string; }, callback: (err: ErrnoError, data: string) => void): void;
  readFile(filename: string, options: { flag?: string; }, callback: (err: ErrnoError, data: Buffer) => void): void;
  readFile(filename: string, callback: (err: ErrnoError, data: Buffer) => void): void;
  readFileSync(filename: string, encoding: string): Buffer;
  readFileSync(filename: string, options: { encoding: string; flag?: string; }): Buffer;
  readFileSync(filename: string, options?: { flag?: string; }): Buffer;

  write(fd: number, buffer: Buffer, offset: number, length: number, position: number, callback?: (err: ErrnoError, written: number, buffer: Buffer) => void): void;
  writeSync(fd: number, buffer: Buffer, offset: number, length: number, position: number): number;

  writeFile(filename: string, data: any, callback?: (err: ErrnoError) => void): void;
  writeFile(filename: string, data: any, options: { encoding?: string; mode?: number; flag?: string; }, callback?: (err: ErrnoError) => void): void;
  writeFile(filename: string, data: any, options: { encoding?: string; mode?: string; flag?: string; }, callback?: (err: ErrnoError) => void): void;
  writeFileSync(filename: string, data: any, options?: { encoding?: string; mode?: number; flag?: string; }): void;
  writeFileSync(filename: string, data: any, options?: { encoding?: string; mode?: string; flag?: string; }): void;


  appendFile(filename: string, data: any, options: { encoding?: string; mode?: number; flag?: string; }, callback?: (err: ErrnoError) => void): void;
  appendFile(filename: string, data: any, options: { encoding?: string; mode?: string; flag?: string; }, callback?: (err: ErrnoError) => void): void;
  appendFile(filename: string, data: any, callback?: (err: ErrnoError) => void): void;
  appendFileSync(filename: string, data: any, options?: { encoding?: string; mode?: number; flag?: string; }): void;
  appendFileSync(filename: string, data: any, options?: { encoding?: string; mode?: string; flag?: string; }): void;


  watchFile(filename: string, listener: (curr: Stats, prev: Stats) => void): void;
  watchFile(filename: string, options: { persistent?: boolean; interval?: number; }, listener: (curr: Stats, prev: Stats) => void): void;

  unwatchFile(filename: string, listener?: (curr: Stats, prev: Stats) => void): void;

  watch(filename: string, listener?: (event: string, filename: string) => any): Watcher;
  watch(filename: string, options: { persistent?: boolean; }, listener?: (event: string, filename: string) => any): Watcher;


  exists(path: string, callback?: (exists: boolean) => void): void;
  existsSync(path: string): boolean;


  createReadStream(path: string, options?: { flags?: string; encoding?: string; fd?: string; mode?: number; bufferSize?: number; }): ReadStream;
  createReadStream(path: string, options?: { flags?: string; encoding?: string; fd?: string; mode?: string; bufferSize?: number; }): ReadStream;

  createWriteStream(path: string, options?: { flags?: string; encoding?: string; string?: string; }): WriteStream;

}

interface Stats {
  isFile(): boolean;
  isDirectory(): boolean;
  isBlockDevice(): boolean;
  isCharacterDevice(): boolean;
  isSymbolicLink(): boolean;
  isFIFO(): boolean;
  isSocket(): boolean;
  dev: number;
  ino: number;
  mode: number;
  nlink: number;
  uid: number;
  gid: number;
  rdev: number;
  size: number;
  blksize: number;
  blocks: number;
  atime: Date;
  mtime: Date;
  ctime: Date;
}

interface Watcher extends EventEmitter {
  close(): void;
}

interface ReadStream extends Readable {
  close(): void;
}

interface WriteStream extends Writable {
  close(): void;
}