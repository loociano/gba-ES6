import fs from 'fs';
import GBA from './gba';

(function cli(bios, rom){
  if (!bios || !rom) {
    console.error('Missing BIOS. Use: gba-cli <BIOS> <ROM>');
    return;
  }
  const gba = new GBA(
    new Uint8Array(fs.readFileSync(bios)),
    new Uint8Array(fs.readFileSync(rom))
  );
  gba.start();
})(process.argv[2], process.argv[3]);