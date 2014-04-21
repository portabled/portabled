declare module zip {

  export var useWebWorkers: boolean;

  export function createReader(reader: Reader, callback: (reader: ZipReader) => void, onerror?);
  export function createWriter(writer: Writer, callback: (writer: ZipWriter) => void, onerror?);

  export interface Reader {
  }

  export interface Writer {
  }

  export interface ZipReader {
    getEntries(callback: (entries: Entry[]) => void);
    close(callback: () => void);
  }

  export interface ZipWriter {
    add(
      name: string,
      reader: Reader,
      onend,
      onprogress?: (index: number, max: number) => void,
      options?: { directory?: boolean; level?: number; comment?: string; lastModDate?: Date; version?: number; });

    close(callback);
  }

  export interface Entry {
    filename: string;
    directory: boolean;
    compressedSize: number;
    uncompressedSize: number;
    lastModDate: number;
    lastModDateRaw: number;
    comment: string;
    crc32: number;

    getData(writer: Writer, onend?, onprogress?: (index: number, maxValue: number) => void, checkCrc32?: boolean);
  }

  export class BlobWriter implements Writer {
  }
    
  export class TextWriter implements Writer {
  }

  export class TextReader implements Reader {
    constructor(text: string);
  }

  export class BlobReader implements Reader {
    constructor(arg: any);
  }
}