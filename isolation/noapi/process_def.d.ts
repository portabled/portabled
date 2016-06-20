interface Process extends EventEmitter {

  stdout: WritableStream;
  stderr: WritableStream;
  stdin: ReadableStream;

  argv: string[];

  execPath: string;

  abort(): void;

  chdir(directory: string): void;
  cwd(): string;

  env: any;

  exit(code?: number): void;

  getgid(): number;
  setgid(id: number): void;
  setgid(id: string): void;

  getuid(): number;
  setuid(id: number): void;
  setuid(id: string): void;

  version: string;
  versions: {
    http_parser: string;
    node: string;
    v8: string;
    ares: string;
    uv: string;
    zlib: string;
    openssl: string;
  };

  config: {
    target_defaults: {
      cflags: any[];
      default_configuration: string;
      defines: string[];
      include_dirs: string[];
      libraries: string[];
    };
    variables: {
      clang?: number;
      host_arch?: string;
      target_arch?: string;
      visibility?: string;
    };
  };

  kill(pid: number, signal?: string): void;

  pid: number;

  title: string;

  arch: string;
  platform: string;

  memoryUsage(): { rss: number; heapTotal: number; heapUsed: number; };

  nextTick(callback: Function): void;

  umask(mask?: number): number;

  uptime(): number;
  hrtime(time?: number[]): number[];

  // Worker
  send?(message: any, sendHandle?: any): void;
}