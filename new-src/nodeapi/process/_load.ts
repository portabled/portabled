var _noprocess_: no_process;

function noprocess_load() {

  if (!_noprocess_)
    _noprocess_ = <no_process>{

      stdout: noprocess_stdout_load(),
      stderr: noprocess_stderr_load(),
      stdin: noprocess_stdin_load(),

      // these are taken from the real node ran on ubuntu
      argv: ['node'],
      execPath: '/usr/bin/nodejs',
      title: 'node',
      arch: 'ia32',
      platform: 'linux',

      memoryUsage: noprocess_memoryUsage,

      env: nodeprocess_env_load(),

      pid: noprocess_pid_load(),

      chdir: noprocess_chdir,
      cwd: noprocess_cwd,

      version: nodeprocess_version_load(),
      versions: nodeprocess_versions_load(),

      config: nodeprocess_config_load(),

      abort: noprocess_abort,
      exit: noprocess_exit,

      kill: nodeprocess_kill,

      getgid: nodeprocess_getgid,
      setgid: nodeprocess_setgid,
      getuid: nodeprocess_getgid,
      setuid: nodeprocess_setuid,

      nextTick: noprocess_nextTick,
      uptime: noprocess_uptime,

      umask: noprocess_umask
    };

  return _noprocess_;
}