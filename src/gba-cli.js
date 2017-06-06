import fs from 'fs';
import GBA from './gba';
import ARM7TDMI from './arm7tdmi';
import MMU from './mmu';

(function cli(bios, rom){
  if (!bios || !rom) {
    console.error('Missing BIOS. Use: gba-cli <BIOS> <ROM>');
    return;
  }
  const rom = new Uint8Array(fs.readFileSync(rom));
  const bios = new Uint8Array(fs.readFileSync(bios));
  const gba = new GBA(new ARM7TDMI(new MMU(rom)), bios, rom);
  gba.start();
})(process.argv[2], process.argv[3]);