interface Module {
  exports: any;
  require(id: string): any;
  id: string;
  filename: string;
  loaded: boolean;
  parent: any;
  children: any[];
}