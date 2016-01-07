declare module noapi {

  export interface Path {

    normalize(p: string): string;
    join(...paths: any[]): string;
    resolve(...pathSegments: any[]): string;
    isAbsolute(p: string): boolean;
    relative(from: string, to: string): string;
    dirname(p: string): string;
    basename(p: string, ext?: string): string;
    extname(p: string): string;
    sep: string;
    delimiter: string;

    // new apis? definitely not in v0.10.38
    parse?(p: string): { root: string; dir: string; base: string; ext: string; name: string; };
    format?(pP: { root: string; dir: string; base: string; ext: string; name: string; }): string;

  }

}