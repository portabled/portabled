module teapo.storage.attached { 

  /**
   * Persisting changes induced after loading the storage.
   */
  export interface UpdateStorage { 

    /**
     * Update one property of one file.
     * @param file Full path to the file.
     * @param property Property to update.
     * @param value Value of the property.
     * By convention, null value is considered as a request to remove the property.
     * @param callback Optional callback to invoke when the update is complete (or failed with an error).
     */
    update(file: string, property: string, value: string, callback?: (error: Error) => void);

    /**
     * Remove the file and all its properties.
     * @param file Full path to the file.
     * @param callback Optional callback to invoke when the removal is complete (or failed with an error).
     */
    remove(file: string, callback?: (error: Error) => void);
    
  }

}