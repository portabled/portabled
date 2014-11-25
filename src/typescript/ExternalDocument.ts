module teapo.typescript {
  
  export interface ExternalDocument {
    
    text(): string;
    changes(): TypeScript.TextChangeRange[];
    
  }
  
}