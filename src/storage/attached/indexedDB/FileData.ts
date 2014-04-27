module teapo.storage.attached.indexedDB {

  export interface FileData {
    path: string;
    properties: { [name: string]: string; };
  }

}