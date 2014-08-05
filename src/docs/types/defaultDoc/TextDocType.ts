module teapo.docs.types.defaultDoc {

  export class TextDocType implements DocType {

    loadDocument(
      fullPath: string,
      properties: { [property: string]: string; },
      updateProperty: (property: string, value: string) => void): DocState {
      return null;
    }


  }

}