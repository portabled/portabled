module portabled.typescript {
  
  export interface ExternalDocument {
    
    text(): string;
    changes(): ts.TextChangeRange[];
    
  }
  
}