interface nostream_ReadableStream extends noevents_EventEmitter {
  readable: boolean;
  read(size?: number): string|no_Buffer;
  setEncoding(encoding: string): void;
  pause(): void;
  resume(): void;
  pipe<T extends nostream_WritableStream>(destination: T, options?: { end?: boolean; }): T;
  unpipe<T extends nostream_WritableStream>(destination?: T): void;
  unshift(chunk: string): void;
  unshift(chunk: no_Buffer): void;
  wrap(oldStream: nostream_ReadableStream): nostream_ReadableStream;
}

interface nostream_WritableStream extends noevents_EventEmitter {
  writable: boolean;
  write(buffer: no_Buffer, cb?: Function): boolean;
  write(str: string, cb?: Function): boolean;
  write(str: string, encoding?: string, cb?: Function): boolean;
  end(): void;
  end(buffer: no_Buffer, cb?: Function): void;
  end(str: string, cb?: Function): void;
  end(str: string, encoding?: string, cb?: Function): void
}

interface nostream_Stream extends noevents_EventEmitter {
  pipe<T extends nostream_WritableStream>(destination: T, options?: { end?: boolean; }): T;
}

interface nostream_ReadableOptions {
  highWaterMark?: number;
  encoding?: string;
  objectMode?: boolean;
}

  interface nostream_Readable extends noevents_EventEmitter, nostream_ReadableStream {
  readable: boolean;
  //constructor(opts?: ReadableOptions)
  _read(size: number): void;

  read(size?: number): string|no_Buffer;

	setEncoding(encoding: string): void;

  pause(): void;

  resume(): void;

  pipe<T extends nostream_WritableStream>(destination: T, options?: { end?: boolean; }): T;

  unpipe(destination?: nostream_WritableStream): void;

	unshift(chunk: string): void;

  unshift(chunk: no_Buffer): void;

  wrap(oldStream: nostream_ReadableStream): nostream_ReadableStream;

  push(chunk: any, encoding?: string): boolean;

}

interface nostream_WritableOptions {
  highWaterMark?: number;
  decodeStrings?: boolean;
}

interface nostream_Writable extends noevents_EventEmitter, nostream_WritableStream {
  writable: boolean;
  // constructor(opts?: WritableOptions)

  _write(data: no_Buffer, encoding: string, callback: Function): void;

  _write(data: string, encoding: string, callback: Function): void;

  write(buffer: no_Buffer, cb?: Function): boolean;

  write(str: string, cb?: Function): boolean;

  write(str: string, encoding?: string, cb?: Function): boolean;

  end(): void;

  end(buffer: no_Buffer, cb?: Function): void;

  end(str: string, cb?: Function): void;

  end(str: string, encoding?: string, cb?: Function): void;

}

interface nostream_DuplexOptions extends nostream_ReadableOptions, nostream_WritableOptions {
  allowHalfOpen?: boolean;
}

  /**
   * Note: Duplex extends both Readable and Writable.
   */
  interface nostream_Duplex extends nostream_Readable {
  writable: boolean;
  // constructor(opts?: DuplexOptions);

  _write(data: no_Buffer, encoding: string, callback: Function);
  _write(data: string, encoding: string, callback: Function): void;

  write(buffer: no_Buffer, cb?: Function);
  write(str: string, cb?: Function);
  write(str: string, encoding?: string, cb?: Function): boolean;

  end(): void;
  end(buffer: no_Buffer, cb?: Function): void;
  end(str: string, cb?: Function): void;
  end(str: string, encoding?: string, cb?: Function): void;

}

interface nostream_TransformOptions extends nostream_ReadableOptions, nostream_WritableOptions { }

/**
   * Note: Transform lacks the _read and _write methods of Readable/Writable.
   */
interface nostream_Transform extends noevents_EventEmitter {
  readable: boolean;
  writable: boolean;
  // constructor(opts?: TransformOptions)

  _transform(chunk: no_Buffer, encoding: string, callback: Function): void;
  _transform(chunk: string, encoding: string, callback: Function): void;

  _flush(callback: Function): void;

  read(size?: number): any;

	setEncoding(encoding: string): void;

  pause(): void;

  resume(): void;

  pipe<T extends nostream_WritableStream>(destination: T, options?: { end?: boolean; }): T;

  unpipe(destination?: nostream_WritableStream): void;

	unshift(chunk: string): void;

  unshift(chunk: no_Buffer): void;

  wrap(oldStream: nostream_ReadableStream): nostream_ReadableStream;

  push(chunk: any, encoding?: string): boolean;

  write(buffer: no_Buffer, cb?: Function): boolean;
  write(str: string, cb?: Function): boolean;
  write(str: string, encoding?: string, cb?: Function): boolean;

  end(): void;
  end(buffer: no_Buffer, cb?: Function): void;
  end(str: string, cb?: Function): void;
  end(str: string, encoding?: string, cb?: Function): void;

}