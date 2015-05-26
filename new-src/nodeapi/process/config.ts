var _nodeprocess_config_;

function nodeprocess_config_load() {
  if (!_nodeprocess_config_) {
    _nodeprocess_config_ = {
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
  return _nodeprocess_config_;
}