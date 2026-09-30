import { copyFile } from 'node:fs/promises';

// A finished build should be easy to find when I open the project folder.
await copyFile('src-tauri/target/release/atlas.exe', 'ATLAS.exe');
console.log('ATLAS.exe is ready in the project root.');
