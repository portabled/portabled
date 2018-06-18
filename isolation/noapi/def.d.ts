interface RequireFunction {
  (id: string): any;
  resolve(id: string): string;
  cache: any;
  extensions: any;
  main: any;
}

interface Global {
  module: Module;
  process: Process;
  require: RequireFunction;
  exports?: any;
  __filename?: string;
  __dirname?: string;
  console?: { log: Function; };
}

interface ErrnoError extends Error {
}

