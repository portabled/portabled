function createProcess(
	modules: { fs: FS; path: Path; },
 	options: {
    argv: string[];
    cwd: string;
    env: any;
    console: any;
   	versions: any;
  },
  extra: {
    exitCode: number;
    shutdown: () => void;
  }): Process {

  var evt = new EventEmitter();

  return <Process><any>{
    abort, exit, kill,
    nextTick,
    chdir, cwd,

    title: 'node',
    arch: 'ia32',
    platform: 'linux',
    execPath: '/usr/bin/nodejs',

    getgid, setgid, getuid, setuid,

    stdout: load_stdout(), stderr: load_stderr(), stdin: load_stdin(),

    memoryUsage,

    uptime: load_uptime(),
    hrtime: <any>function() { throw new Error('High resultion time is not implemenetd yet.'); },

    pid: load_pid(),
    umask: load_umask(),
    config: load_config(),
    versions: load_versions(),
    version: load_versions().node,

    argv: options.argv,
    env: options.env,

    addListener: (e,c) => evt.addListener(e,c),
    on: (e, c) => evt.on(e,c),
    once: (e, c) => evt.once(e,c),
    removeListener: (e,c) => evt.removeListener(e,c),
    removeAllListeners: e => evt.removeAllListeners(e),
    setMaxListeners: (n) => evt.setMaxListeners(n),
    listeners: e => evt.listeners(e),
    emit: (e,v) => evt.emit(e,v)

  };

  function abort() {
    if (extra.shutdown) extra.shutdown();
  }

  function exit(code?: number) {
    extra.exitCode = code;
    if (extra.shutdown) extra.shutdown();
  }

  function kill(pid: number, signal?: string) {
    // when we emulate processes, implement process termination
  }




  function chdir(directory: string) {
    var normDirectory = modules.path.normalize(directory);
    var dirStat = modules.fs.statSync(normDirectory);
    if (dirStat && dirStat.isDirectory()) {
      if (normDirectory !== cwd()) {
        options.cwd = normDirectory;
      }
    }
    else {
      // TODO: throw a node-shaped error instead
      throw new Error('ENOENT, no such file or directory');
    }
  }

  function cwd(): string {
    return options.cwd;
  }



  function getgid() {
    // taken from node running on ubuntu
    return 1000;
  }

  function setgid(id: any) {
    // TODO: use node-shaped error
    throw new Error('EPERM, Operation not permitted');
  }

  function getuid(): number {
    // taken from node running on ubuntu
    return 1000;
  }

  function setuid(id: any) {
    // TODO: use node-shaped error
    throw new Error('EPERM, Operation not permitted');
  }



  function load_uptime() {
    var _uptime_start_ = typeof Date.now === 'function' ? Date.now() : +(new Date());
    return uptime;

    function uptime() {
      var now = typeof Date.now === 'function' ? Date.now() : +(new Date());
      return now - _uptime_start_;
    }
  }



  function load_stdout() {
    return <WritableStream>{
      write(msg) {
        options.console.log(msg);
      }
    };
  }

  function load_stderr() {
    return <WritableStream>{
    };
  }

  function load_stdin() {
    return <ReadableStream>{
    };
  }



  function memoryUsage(): { rss: number; heapTotal: number; heapUsed: number; } {
    return {
      rss: 13225984 + ((Math.random() * 3000) | 0),
      heapTotal: 7130752 + ((Math.random() * 3000) | 0),
      heapUsed: 2449612 + ((Math.random() * 3000) | 0)
    };
  }



  function load_pid() {
    return 32754 + ((Math.random() * 500) | 0);
  }

  function load_umask() {
    var _umask_;
    return umask;

    function umask(mask?: number): number {
      if (typeof _umask_ !== 'number') {
        _umask_ = 2;
      }

      if (typeof mask === 'number') {
        var res = _umask_;
        _umask_ = mask;
        return res;
      }

      return _umask_;
    }
  }

  function load_versions() {
    // real node running on ubuntu as of Friday 22 of May 2015
    // (these might not be properly implemented when hosted in browser)
    var versions = {
      http_parser: '1.0',
      node: '0.10.38',
      v8: '3.14.5.9',
      ares: '1.9.0-DEV',
      uv: '0.10.36',
      zlib: '1.2.8',
      modules: '11',
      openssl: '1.0.1m',
      mi: '0.71n'
    };

    if (options.versions) {
      for (var k in options.versions) if (options.versions.hasOwnProperty(k)) {
        versions[k] = options.versions[k];
      }
    }

    return versions;
  }


  function load_config() {
    return {
      target_defaults:
      {
        cflags: [],
        default_configuration: 'Release',
        defines: [],
        include_dirs: [],
        libraries: []
      },
      variables:
      {
        clang: 0,
        gcc_version: 48,
        host_arch: 'ia32',
        node_install_npm: true,
        node_prefix: '/usr',
        node_shared_cares: false,
        node_shared_http_parser: false,
        node_shared_libuv: false,
        node_shared_openssl: false,
        node_shared_v8: false,
        node_shared_zlib: false,
        node_tag: '',
        node_unsafe_optimizations: 0,
        node_use_dtrace: false,
        node_use_etw: false,
        node_use_openssl: true,
        node_use_perfctr: false,
        node_use_systemtap: false,
        openssl_no_asm: 0,
        python: '/usr/bin/python',
        target_arch: 'ia32',
        v8_enable_gdbjit: 0,
        v8_no_strict_aliasing: 1,
        v8_use_snapshot: false,
        want_separate_host_toolset: 0
      }
    };
  }
}