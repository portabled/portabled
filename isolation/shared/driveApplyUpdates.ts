interface DriveUpdateMessage {
  timestamp: number;
  driveUpdates: ({deleteFile: string;}|{updateFile: string; content: any})[];
}

function driveApplyUpdates(tmDrive, msg: DriveUpdateMessage) {
  tmDrive.timestamp = Math.max(tmDrive.timestamp, msg.timestamp);
  for (var i = 0; i < msg.driveUpdates.length; i++) {
    var up = msg.driveUpdates[i];
    if ((<any>up).deleteFile) {
      tmDrive.write((<any>up).deleteFile, null);
    }
    else if ((<any>up).updateFile) {
      tmDrive.write((<any>up).updateFile, (<any>up).content);
    }
  }
}