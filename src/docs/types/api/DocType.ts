module teapo.docs.types {

  export interface DocType {

    loadDocument(
      fullPath: string,
      properties: { [property: string]: string; },
      updateProperty: (property: string, value: string) => void): DocState;

  }

}