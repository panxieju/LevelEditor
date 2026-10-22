const locations = {};
const database = () => new Promise((resolve, reject) => {
  const request = indexedDB.open('puppetgo-file-locations', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('handles');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
export async function restoreFileLocations() {
  try {
    const db = await database();
    await Promise.all(['import', 'export'].map(key => new Promise(resolve => {
      const request = db.transaction('handles').objectStore('handles').get(key);
      request.onsuccess = () => { locations[key] = request.result; resolve(); };
      request.onerror = () => resolve();
    })));
    db.close();
  } catch { /* Browser picker IDs still retain the last directory when storage is unavailable. */ }
}
async function remember(key, handle) {
  locations[key] = handle;
  try {
    const db = await database();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('handles', 'readwrite');
      tx.objectStore('handles').put(handle, key);
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch { /* Saving a file does not depend on persistent handle storage. */ }
}
const types = [{ description: 'PuppetGo 关卡 JSON', accept: { 'application/json': ['.json'] } }];
export async function pickJson() {
  const [handle] = await window.showOpenFilePicker({ id: 'puppetgo-import', types, multiple: false, ...(locations.import ? { startIn: locations.import } : {}) });
  const file = await handle.getFile();
  await remember('import', handle);
  return file;
}
export async function saveJson(text, suggestedName) {
  const handle = await window.showSaveFilePicker({ id: 'puppetgo-export', suggestedName, types, ...(locations.export ? { startIn: locations.export } : {}) });
  const writer = await handle.createWritable();
  try { await writer.write(text); await writer.close(); }
  catch (error) { await writer.abort().catch(() => {}); throw error; }
  await remember('export', handle);
}
