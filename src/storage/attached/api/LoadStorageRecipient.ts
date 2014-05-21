module teapo.storage.attached {

  export interface LoadStorageRecipient {

    files(fileCount: number): void;
    file(fullPath: string, values: { [name: string]: string; }): void;
    completed(updater: UpdateStorage): void;
    failed(error: Error): void;

  }

}