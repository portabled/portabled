function nofs_readFileSync(filename: string, options?: { encoding?: string; flag?: string; }) {

  // TODO: handle encoding and other
  return no_drive.read(filename);

}