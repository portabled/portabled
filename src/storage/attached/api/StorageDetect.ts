module teapo.storage.attached {

  export interface StorageDetect {

   detect(
     uniqueKey: string,
     callback: (
       error: Error,
       metadata: StorageDetect.BootState,
       access: StorageAccess) => void): void;

  }

  export module StorageDetect {

    export interface BootState {
      editedUTC: number;
      files: string[];
    }
    
  }
  
}
