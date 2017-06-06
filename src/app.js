import Model from './ui/model';
import View from './ui/view';
import Controller from './ui/controller';

import MMU from './mmu';
import ARM7TDMI from './arm7tdmi';
import GBA from './gba';

const bios = new Uint8Array(new Buffer('180000ea040000ea4c0000ea020000ea010000ea000000ea420000eaa0d19fe500502de900c04fe100e00fe100502de902c3a0e39ce0dce5a5005ee30400001a', 'hex'));
const rom = bios;
const mmu = new MMU(rom);
const cpu = new ARM7TDMI(mmu);
const gba = new GBA(cpu, bios, rom);
gba.getMemory = () => gba._cpu._mmu._memory;
const model = new Model(gba);

new Controller(model, new View(window.document));