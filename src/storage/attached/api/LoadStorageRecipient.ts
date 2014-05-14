module teapo.storage.attached {

  export interface LoadStorageRecipient {

    file(fullPath: string, values: { [name: string]: string; });
    completed(updater: UpdateStorage);
    failed(error: Error);

  }

}