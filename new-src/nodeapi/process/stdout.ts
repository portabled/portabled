var _noprocess_stdout_: nostream_WritableStream;
var _noprocess_stderr_: nostream_WritableStream;
var _noprocess_stdin_: nostream_ReadableStream;

function noprocess_stdout_load() {
  if (!_noprocess_stdout_) {

    // TODO: init stdout, stderr, stdin
    _noprocess_stdout_ = <nostream_WritableStream>{
    };
    _noprocess_stderr_ = <nostream_WritableStream>{
    };
    _noprocess_stdin_ = <nostream_ReadableStream>{
    };
  }

  return _noprocess_stdout_;
}

function noprocess_stderr_load() {
  noprocess_stdout_load();
  return _noprocess_stderr_;
}

function noprocess_stdin_load() {
  noprocess_stdout_load();
  return _noprocess_stdin_;
}