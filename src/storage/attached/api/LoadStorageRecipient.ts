module teapo.storage.attached {

  export interface LoadStorageRecipient {

    file(name: string, values: { [name: string]: string; });
    completed(updater: UpdateStorage);
    failed(error: Error);

  }

}