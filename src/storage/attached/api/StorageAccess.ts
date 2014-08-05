module teapo.storage.attached {
  
  export interface StorageAccess {

    update(
      byFullPath: PropertiesByFullPath,
      timestamp: number,
      callback: (error: Error) => void): void;

    read(
      fullPaths: string[],
      callback: (error: Error, byFullPath: PropertiesByFullPath) => void): void;

  }

}