/** Preserve a file's format during rename; changing an extension is not a conversion. */
export function renameDestination(from:string,requested:string,folder=false):string {
  if(folder)return requested;
  const extension=from.split('/').pop()!.match(/\.[^.]+$/)?.[0];
  if(!extension)return requested;
  const name=requested.split('/').pop()!;
  if(name.toLowerCase().endsWith(extension.toLowerCase()))return requested;
  if(/\.(?:md|markdown|canvas|base|txt|csv|json|css|pdf|png|jpe?g|gif|webp|svg|mp3|wav|webm|ogg|mp4)$/i.test(name))throw new Error(`Renaming cannot change ${extension} into another file type. Keep the original extension.`);
  return requested+extension;
}
