module teapo.docs {
  
  export module Document {
    
    export interface Storage {

      getProperty(name: string): string;
      setProperty(name: string, value: string): void;
      
    }
    
  }
  
}