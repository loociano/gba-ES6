// MMU
export const MEMORY_SIZE = 0x08000000;
export const EXT_MEMORY_SIZE = 0x08000000;
export const ADDR_POSTFLG = 0x04000300;

// Rom
export const ROM_HEADER_ENTRYPOINT_START = 0;
export const ROM_HEADER_ENTRYPOINT_END = 4;
export const ROM_HEADER_LOGO_START = 4;
export const ROM_HEADER_LOGO_END = 0xa0;
export const ROM_HEADER_TITLE_START = 0xa0;
export const ROM_HEADER_TITLE_END = 0xac;

// CPU
export const ARM_INSTR_LENGTH = 4;
export const ALU_OPCODES = ['and', 'eor', 'sub', 'rsb', 'add', 'adc', 'sbc', 'rsc', 'tst', 'teq', 'cmp', 'cmn', 'orr', 'mov', 'bic', 'mvn'];
export const FLAG_BITS = {N: 3, Z: 2, C: 1, V: 0, I: 2, F: 1, T: 0};
export const CONDS = ['eq', 'ne', 'cs', 'cc', 'mi', 'pl', 'vs', 'vc', 'hi', 'ls', 'ge', 'lt', 'gt', 'le', 'al', 'nv'];

// UI specific
export const INSTR_ON_UI = 20;
export const INSTR_ON_SCROLL = 8;
export const MEMORY_PAGE_LINES = 16;
export const BYTES_PER_MEMORY_LINE = 16;

// Browser
export const ENTER_KEYCODE = 13;