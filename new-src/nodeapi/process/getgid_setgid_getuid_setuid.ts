function nodeprocess_getgid() {
  // taken from node running on ubuntu
  return 1000;
}

function nodeprocess_setgid(id: any) {
  // TODO: use node-shaped error
  throw new Error('EPERM, Operation not permitted');
}

function nodeprocess_getuid(): number {
  // taken from node running on ubuntu
  return 1000;
}

function nodeprocess_setuid(id: any) {
  // TODO: use node-shaped error
  throw new Error('EPERM, Operation not permitted');
}
