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
const model = new Model(gba);

new Controller(model, new View(window, new FileReader()));