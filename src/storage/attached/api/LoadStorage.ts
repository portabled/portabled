module teapo.storage.attached {

  /**
   * Result of feature detection for a particular attached storage technology.
   * Contains a timestamp and methods to proceed further with loading the data.
   */
  export interface LoadStorage {

    /**
     * Timestamp of when the state was saved.
     */
    editedUTC: number;

    /**
     * Load all the data from the storage,
     * returning an instance of UpdateStorage in the end.
     * @param recipient object containing callbacks {file,completed,failed}:
     * 'file' reporting a file from the storage,
     * 'competed' finishing loading and passing an instance of UpdateStorage,
     * 'failed' finishing loading with an error.
     */
    load(recipient: LoadStorageRecipient): void;

    /**
     * Destroy the state in the storage, and load another state instead.
     * After that return an instance of UpdateStorage.
     * @param editedUTC New value to store as a timestamp of when this state was saved.
     * @param filesByName Map of filename/properties representing the new state of the storage.
     * @param callback Should be invoked on competion of loading of the storage,
     * may be passed either an error or an instance of UpdateStorage.
     */
    migrate(
      editedUTC: number,
      filesByName: { [fullPath: string]: { [propertyName: string]: string; }; },
      callback: (error: Error, updater: attached.UpdateStorage) => void): void;

  }

}