var _nodeprocess_version_: string;
var _nodeprocess_versions_;

function nodeprocess_version_load() {

  // real node running on ubuntu as of Friday 22 of May 2015
  if (!_nodeprocess_version_) {
    _nodeprocess_version_ = 'v0.10.38';
  }
  return _nodeprocess_version_;
}

function nodeprocess_versions_load() {
  if (!_nodeprocess_versions_) {

    // real node running on ubuntu as of Friday 22 of May 2015
    // (these might not be properly implemented when hosted in browser)
    _nodeprocess_versions_ = {
      http_parser: '1.0',
      node: '0.10.38',
      v8: '3.14.5.9',
      ares: '1.9.0-DEV',
      uv: '0.10.36',
      zlib: '1.2.8',
      modules: '11',
      openssl: '1.0.1m'
    };

  }
  return _nodeprocess_versions_;
}