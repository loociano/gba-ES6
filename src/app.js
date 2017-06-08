import Model from './ui/model';
import View from './ui/view';
import Controller from './ui/controller';

import MMU from './mmu';
import ARM7TDMI from './arm7tdmi';
import GBA from './gba';

const bios = new Uint8Array(0);
const rom = bios;
const mmu = new MMU(rom);
const cpu = new ARM7TDMI(mmu);
const gba = new GBA(cpu, bios, rom);
gba.getMemory = () => gba._cpu._mmu._memory;
gba.getProgram = () => gba._cpu._mmu.readArray(0, 1000);
const model = new Model(gba);

new Controller(model, new View(window.document, new FileReader()));