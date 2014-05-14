module teapo.storage.attached {

  /**
   * Ultimate starting point for attached storage.
   * Allows detecting whether particular attached storage exists,
   * fails the callback if it doesn't
   * and preloads some crucial properties if it does.
   */
  export interface DetectStorage {

    /**
     * Detects whether this attached storage is supported by the browser.
     * @param uniqueKey Used to tell storage for different documents within the same domain apart from each other.
     * @callback Invoked either with an error object, or LoadStorage instance.
     */
    detectStorageAsync(uniqueKey: string, callback: (error: Error, load: LoadStorage) => void): void;

  }

}