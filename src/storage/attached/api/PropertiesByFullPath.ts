module teapo.storage.attached {

  export interface PropertiesByFullPath {

    [fullPath: string]: { [property: string]: string; };

  }

}