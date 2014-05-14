module teapo.docs {
  
  export module Document {
    
    export interface Type {

      createDocument(fullPath: string, storage: Document.Storage): Document;
      
    }
    
  }
  
}