export const MEMORY_SIZE = 0x08000000;
export const EXT_MEMORY_SIZE = 0x08000000;

export const ARM_INSTR_LENGTH = 4;

export const ROM_HEADER_ENTRYPOINT_START = 0;
export const ROM_HEADER_ENTRYPOINT_END = 4;
export const ROM_HEADER_LOGO_START = 4;
export const ROM_HEADER_LOGO_END = 0xa0;
export const ROM_HEADER_TITLE_START = 0xa0;
export const ROM_HEADER_TITLE_END = 0xac;

export const ALU_OPCODES = ['and', 'eor', 'sub', 'rsb', 'add', 'adc', 'sbc', 'rsc', 'tst', 'teq', 'cmp', 'cmn', 'orr', 'mov', 'bic', 'mvn'];
export const FLAG_BITS = {N: 4, Z: 3, C: 2, V: 1, Q: 0, I: 2, F: 1, T: 0};

// UI specific
export const INSTR_ON_UI = 20;
export const INSTR_ON_SCROLL = 8;
export const ENTER_KEYCODE = 13;