interface no_require {
  (id: string): any;
  resolve(id: string): string;
  cache: any;
  extensions: any;
  main: any;
}

interface no_module {
  exports: any;
  require(id: string): any;
  id: string;
  filename: string;
  loaded: boolean;
  parent: any;
  children: any[];
}

interface no_ErrnoError extends Error {
}

interface no_Buffer {
  [index: number]: number;
  write(string: string, offset?: number, length?: number, encoding?: string): number;
  toString(encoding?: string, start?: number, end?: number): string;
  toJSON(): any;
  length: number;
  copy(targetBuffer: no_Buffer, targetStart?: number, sourceStart?: number, sourceEnd?: number): number;
  slice(start?: number, end?: number): no_Buffer;
  readUInt8(offset: number, noAsset?: boolean): number;
  readUInt16LE(offset: number, noAssert?: boolean): number;
  readUInt16BE(offset: number, noAssert?: boolean): number;
  readUInt32LE(offset: number, noAssert?: boolean): number;
  readUInt32BE(offset: number, noAssert?: boolean): number;
  readInt8(offset: number, noAssert?: boolean): number;
  readInt16LE(offset: number, noAssert?: boolean): number;
  readInt16BE(offset: number, noAssert?: boolean): number;
  readInt32LE(offset: number, noAssert?: boolean): number;
  readInt32BE(offset: number, noAssert?: boolean): number;
  readFloatLE(offset: number, noAssert?: boolean): number;
  readFloatBE(offset: number, noAssert?: boolean): number;
  readDoubleLE(offset: number, noAssert?: boolean): number;
  readDoubleBE(offset: number, noAssert?: boolean): number;
  writeUInt8(value: number, offset: number, noAssert?: boolean): void;
  writeUInt16LE(value: number, offset: number, noAssert?: boolean): void;
  writeUInt16BE(value: number, offset: number, noAssert?: boolean): void;
  writeUInt32LE(value: number, offset: number, noAssert?: boolean): void;
  writeUInt32BE(value: number, offset: number, noAssert?: boolean): void;
  writeInt8(value: number, offset: number, noAssert?: boolean): void;
  writeInt16LE(value: number, offset: number, noAssert?: boolean): void;
  writeInt16BE(value: number, offset: number, noAssert?: boolean): void;
  writeInt32LE(value: number, offset: number, noAssert?: boolean): void;
  writeInt32BE(value: number, offset: number, noAssert?: boolean): void;
  writeFloatLE(value: number, offset: number, noAssert?: boolean): void;
  writeFloatBE(value: number, offset: number, noAssert?: boolean): void;
  writeDoubleLE(value: number, offset: number, noAssert?: boolean): void;
  writeDoubleBE(value: number, offset: number, noAssert?: boolean): void;
  fill(value: any, offset?: number, end?: number): void;
}