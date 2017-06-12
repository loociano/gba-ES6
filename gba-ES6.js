(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _model = require('./ui/model');

var _model2 = _interopRequireDefault(_model);

var _view = require('./ui/view');

var _view2 = _interopRequireDefault(_view);

var _controller = require('./ui/controller');

var _controller2 = _interopRequireDefault(_controller);

var _mmu = require('./mmu');

var _mmu2 = _interopRequireDefault(_mmu);

var _arm7tdmi = require('./arm7tdmi');

var _arm7tdmi2 = _interopRequireDefault(_arm7tdmi);

var _gba = require('./gba');

var _gba2 = _interopRequireDefault(_gba);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var bios = new Uint8Array(0);
var rom = bios;
var mmu = new _mmu2.default(rom);
var cpu = new _arm7tdmi2.default(mmu);
var gba = new _gba2.default(cpu, bios, rom);
var model = new _model2.default(gba);

new _controller2.default(model, new _view2.default(window, new FileReader()));

},{"./arm7tdmi":2,"./gba":5,"./mmu":7,"./ui/controller":9,"./ui/model":10,"./ui/view":12}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _constants = require('./constants');

var c = _interopRequireWildcard(_constants);

var _decoder = require('./decoder');

var _decoder2 = _interopRequireDefault(_decoder);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * ARM7TDMI chip.
 */
var ARM7TDMI = function () {

  /**
   * @param {MMU} MMU
   */
  function ARM7TDMI(MMU) {
    _classCallCheck(this, ARM7TDMI);

    this._mmu = MMU;
    this._r = { r0: 0, r1: 0, r2: 0, r3: 0, r4: 0, r5: 0, r6: 0, r7: 0, r8: 0, r9: 0, r10: 0, r11: 0, r12: 0, r13: 0, r14: 0, pc: 0, cpsr: 0, sprs: 0 };
    this._opcodes = {
      '???': this._nop,
      'b': this._b,
      'cmp': this._cmp,
      'mov': this._mov,
      'ldr': this._ldr,
      'teq': this._teq
    };
    // {Array} [{number} pc, {number} word]
    this._fetched = null;
    // {Array} decoded instruction [{number} pc, {string} opcode, ...{number} operands]
    this._decoded = null;
  }

  _createClass(ARM7TDMI, [{
    key: 'getPC',
    value: function getPC() {
      return this._r.pc;
    }
  }, {
    key: 'getRegisters',
    value: function getRegisters() {
      return this._r;
    }
  }, {
    key: 'getNZCVQ',
    value: function getNZCVQ() {
      return this._r.cpsr >>> 27;
    }
  }, {
    key: 'setNZCVQ',
    value: function setNZCVQ(bits) {
      this._r.cpsr = (this._r.cpsr & 0x07ffffff | bits << 27) >>> 0;
    }
  }, {
    key: 'getIFT',
    value: function getIFT() {
      return this._r.cpsr >>> 5;
    }
  }, {
    key: 'setIFT',
    value: function setIFT(bits) {
      this._r.cpsr = (this._r.cpsr & 0xffffff1f | bits << 5) >>> 0;
    }

    /**
     * @param {Uint8Array} BIOS
     * @public
     */

  }, {
    key: 'setBIOS',
    value: function setBIOS(BIOS) {
      this._mmu.writeArray(BIOS, 0);
    }

    /**
     * Fills the fetched/decoded values
     */

  }, {
    key: 'boot',
    value: function boot() {
      this._fetch()._decode()._fetch();
    }

    /**
     * Executes one CPU cycle (execute + decode + fetch)
     * @public
     */

  }, {
    key: 'execute',
    value: function execute() {
      this._execute()._decode()._fetch();
    }

    /**
     * @return {ARM7TDMI}
     * @private
     */

  }, {
    key: '_fetch',
    value: function _fetch() {
      var readFrom = void 0;
      if (this._decoded !== null && this._decoded[1] === 'b') {
        readFrom = this._decoded[2];
      } else if (this._branched) {
        readFrom = this._r.pc + c.ARM_INSTR_LENGTH;
      } else {
        readFrom = this._r.pc;
      }
      if (this._branched) {
        this._branched = false;
        this._r.pc += 4;
      }
      this._fetched = [readFrom, this._mmu.readWord(readFrom)];
      _logger2.default.fetched.apply(_logger2.default, _toConsumableArray(this._fetched));
      this._r.pc += 4;
      return this;
    }

    /**
     * @return {ARM7TDMI}
     * @private
     */

  }, {
    key: '_decode',
    value: function _decode() {
      if (this._fetched === null) return this;
      this._decoded = _decoder2.default.decode.apply(_decoder2.default, _toConsumableArray(this._fetched));
      return this;
    }

    /**
     * @return {ARM7TDMI}
     * @private
     */

  }, {
    key: '_execute',
    value: function _execute() {
      if (this._decoded !== null) {
        var pc = this._decoded.splice(0, 1)[0];
        var op = this._decoded.splice(0, 1)[0];
        if (this._opcodes[op]) {
          _logger2.default.instr(pc, op, this._decoded);
          this._opcodes[op].apply(this, this._decoded);
        } else {
          _logger2.default.info(op + ' unimplemented');
        }
      }
      return this;
    }

    // Instructions

  }, {
    key: '_nop',
    value: function _nop() {}

    /**
     * Branch
     * @param {number} addr
     * @private
     */

  }, {
    key: '_b',
    value: function _b(addr) {
      this._r.pc = addr;
      this._branched = true;
    }

    /**
     * @param {number} Rd
     * @param {number} value Rn
     * @param {number} Op2
     * @private
     */

  }, {
    key: '_cmp',
    value: function _cmp(Rd /*unused*/, Rn, Op2) {
      var diff = Rn - Op2;
      this._setZ(diff);
    }

    /**
     * @param {string} Rd
     * @param {string} Rn
     * @param {number} Op2
     * @private
     */

  }, {
    key: '_mov',
    value: function _mov(Rd, Rn /*unused*/, Op2) {
      this._r[Rd] = Op2;
      this._setZ(Op2);
    }

    /**
     * @param {string} Rd
     * @param {string} Rn
     * @param {boolean} P pre-increment
     * @param {number} offset
     * @private
     */

  }, {
    key: '_ldr',
    value: function _ldr(Rd, Rn, P, offset) {
      if (P) {
        this._r[Rd] = this._mmu.readWord(this._r[Rn] + offset);
      } else {
        //TODO
      }
    }

    /**
     * @param {string} Rd
     * @param {string} Rn
     * @param {string} Op2
     * @private
     */

  }, {
    key: '_teq',
    value: function _teq(Rd /*unused*/, Rn, Op2) {
      var xor = (this._r[Rn] ^ Op2) >>> 0;
      this._setZ(xor);
    }

    /**
     * Sets flag Z according to value
     * @param {number} value
     * @private
     */

  }, {
    key: '_setZ',
    value: function _setZ(value) {
      if (value === 0) {
        this._r.cpsr |= 0x40000000;
      } else {
        this._r.cpsr &= 0xbfffffff;
      }
    }
  }]);

  return ARM7TDMI;
}();

exports.default = ARM7TDMI;

},{"./constants":3,"./decoder":4,"./logger":6}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var MEMORY_SIZE = exports.MEMORY_SIZE = 0x08000000;
var EXT_MEMORY_SIZE = exports.EXT_MEMORY_SIZE = 0x08000000;

var ARM_INSTR_LENGTH = exports.ARM_INSTR_LENGTH = 4;

var ROM_HEADER_ENTRYPOINT_START = exports.ROM_HEADER_ENTRYPOINT_START = 0;
var ROM_HEADER_ENTRYPOINT_END = exports.ROM_HEADER_ENTRYPOINT_END = 4;
var ROM_HEADER_LOGO_START = exports.ROM_HEADER_LOGO_START = 4;
var ROM_HEADER_LOGO_END = exports.ROM_HEADER_LOGO_END = 0xa0;
var ROM_HEADER_TITLE_START = exports.ROM_HEADER_TITLE_START = 0xa0;
var ROM_HEADER_TITLE_END = exports.ROM_HEADER_TITLE_END = 0xac;

var ALU_OPCODES = exports.ALU_OPCODES = ['and', 'eor', 'sub', 'rsb', 'add', 'adc', 'sbc', 'rsc', 'tst', 'teq', 'cmp', 'cmn', 'orr', 'mov', 'bic', 'mvn'];
var FLAG_BITS = exports.FLAG_BITS = { N: 4, Z: 3, C: 2, V: 1, Q: 0, I: 2, F: 1, T: 0 };

// UI specific
var INSTR_ON_UI = exports.INSTR_ON_UI = 20;
var INSTR_ON_SCROLL = exports.INSTR_ON_SCROLL = 8;
var ENTER_KEYCODE = exports.ENTER_KEYCODE = 13;

},{}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _constants = require('./constants');

var c = _interopRequireWildcard(_constants);

var _utils = require('./utils');

var _utils2 = _interopRequireDefault(_utils);

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Decoder = function () {
  function Decoder() {
    _classCallCheck(this, Decoder);
  }

  _createClass(Decoder, null, [{
    key: 'decode',


    /**
     * @param {number} pc
     * @param {number} word
     * @param {boolean} toString
     * @return {Array|string}
     */
    value: function decode(pc, word) {
      var toString = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

      switch (word >>> 24 & 0xf) {
        case 0xa:
          // Branch
          return Decoder._decodeBranch(pc, word, toString);
        case 0: // DataProc
        case 1:
        case 2:
        case 3:
          return Decoder._decodeDataProc(pc, word, toString);
        case 4: // SingleDataTransfer
        case 5:
          return Decoder._decodeDataTransfer(pc, word, toString);
        default:
          return Decoder._decodeUnknown(pc, toString);
      }
    }

    /**
     * Decodes an instruction in a human readable way. Example: ldr r1,[r0,0x300]
     * @param {number} pc
     * @param {number} word
     * @return {string}
     */

  }, {
    key: 'decodeToString',
    value: function decodeToString(pc, word) {
      return Decoder.decode(pc, word, true);
    }

    /**
     * @param pc
     * @param {boolean} toString
     * @return {Array|string}
     * @private
     */

  }, {
    key: '_decodeUnknown',
    value: function _decodeUnknown(pc) {
      var toString = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

      if (toString) return '???';
      return [pc, '???'];
    }

    /**
     * @param {number} pc
     * @param {number} word
     * @param {boolean} toString
     * @return {Array|string}
     * @private
     */

  }, {
    key: '_decodeBranch',
    value: function _decodeBranch(pc, word) {
      var toString = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

      var offset = word & 0x00ffffff;
      var decoded = [pc, 'b', pc + c.ARM_INSTR_LENGTH * 2 + _utils2.default.toSigned(offset) * 4];
      if (toString) return decoded[1] + ' 0x' + _utils2.default.toHex(decoded[2]);
      return decoded;
    }

    /**
     * @param {number} pc
     * @param {number} word
     * @param {boolean} toString
     * @return {Array|string} instruction parameters
     * @private
     */

  }, {
    key: '_decodeDataProc',
    value: function _decodeDataProc(pc, word) {
      var toString = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

      var op = void 0,
          Rd = void 0,
          Rn = void 0,
          Op2 = 0;
      var immediate = word >>> 25 & 1 === 1;
      var opcode = word >>> 21 & 0xf;
      Rn = 'r' + (word >>> 16 & 0xf);
      Rd = 'r' + (word >>> 12 & 0xf);
      if (immediate) {
        Op2 = _utils2.default.ror(word & 0xff, (word >>> 8 & 0xf) * 2);
      } else {
        var R = word >>> 4 & 1 === 1;
        var Rm = 'r' + (word & 0xf);
        if (!R) {
          var Is = word >>> 7 & 0x1f;
          if (Is === 0) {
            Op2 = Rm;
          } else {
            //TODO
          }
        } else {
            //TODO
          }
      }
      op = c.ALU_OPCODES[opcode];
      if (toString) {
        var prefix = '';
        if (typeof Op2 === 'number') prefix = '0x';
        switch (opcode) {
          case 8:
          case 9:
          case 0xa:
          case 0xb:
            return op + ' ' + Rn + ',' + prefix + _utils2.default.toHex(Op2);
          case 0xd:
          case 0xf:
            return op + ' ' + Rd + ',' + prefix + _utils2.default.toHex(Op2);
          default:
            return op + ' ' + Rd + ',' + Rn + ',' + prefix + _utils2.default.toHex(Op2);
        }
      }
      return [pc, op, Rd, Rn, Op2];
    }

    /**
     * @param {number} pc
     * @param {number} word
     * @param {boolean} toString
     * @return {Array|string}
     * @private
     */

  }, {
    key: '_decodeDataTransfer',
    value: function _decodeDataTransfer(pc, word) {
      var toString = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

      var Rn = void 0,
          Rd = void 0,
          offset = void 0;
      var op = 'str';
      var I = (word >>> 25 & 1) === 1;
      var P = (word >>> 24 & 1) === 1;
      var U = (word >>> 23 & 1) === 1;
      if ((word >>> 20 & 1) === 1) op = 'ldr';
      Rn = 'r' + (word >>> 16 & 0xf);
      Rd = 'r' + (word >>> 12 & 0xf);
      if (Rn === 'r15') Rn = 'pc';
      if (Rd === 'r15') Rd = 'pc';
      if (!I) {
        offset = word & 0xfff;
      } else {
        throw new Error('Shifted register');
      }
      if (!U) offset = -offset;
      if (toString) {
        if (P) {
          return op + ' ' + Rd + ',[' + Rn + ',0x' + _utils2.default.toHex(offset) + ']';
        } else {
          return op + ' ' + Rd + ',[' + Rn + '],0x' + _utils2.default.toHex(offset);
        }
      }
      return [pc, op, Rd, Rn, P, offset];
    }
  }]);

  return Decoder;
}();

exports.default = Decoder;

},{"./constants":3,"./logger":6,"./utils":13}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _constants = require('./constants');

var c = _interopRequireWildcard(_constants);

var _arm7tdmi = require('./arm7tdmi');

var _arm7tdmi2 = _interopRequireDefault(_arm7tdmi);

var _mmu = require('./mmu');

var _mmu2 = _interopRequireDefault(_mmu);

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * GBA system
 */
var GBA = function () {

  /**
   * @param {ARM7TDMI} cpu
   * @param BIOS
   * @param ROM
   */
  function GBA(cpu, BIOS, ROM) {
    _classCallCheck(this, GBA);

    if (cpu === undefined) throw new Error('Missing CPU');
    if (BIOS === undefined) throw new Error('Missing BIOS');
    if (ROM === undefined) throw new Error('Missing ROM');
    this._cpu = cpu;
    this._cpu.setBIOS(BIOS);
    this._rom = ROM;
  }

  _createClass(GBA, [{
    key: 'getCPU',
    value: function getCPU() {
      return this._cpu;
    }
  }, {
    key: 'start',
    value: function start() {
      this._cpu.boot();
      try {
        while (true) {
          this._cpu.execute();
        }
      } catch (error) {
        _logger2.default.error(error);
      }
    }

    /**
     * @return {Object} CartridgeHeader
     */

  }, {
    key: 'getCartridgeHeader',
    value: function getCartridgeHeader() {
      return {
        _rom: this._rom,
        /**
         * @return {Array}
         */
        getEntryPoint: function getEntryPoint() {
          return Array.from(this._rom.subarray(c.ROM_HEADER_ENTRYPOINT_START, c.ROM_HEADER_ENTRYPOINT_END)).reverse();
        },
        /**
         * @return {Array}
         */
        getNintendoLogo: function getNintendoLogo() {
          var ROM_HEADER_LENGTH = c.ROM_HEADER_LOGO_END - c.ROM_HEADER_LOGO_START;
          var array = [];
          for (var i = 0; i < ROM_HEADER_LENGTH; i += 4) {
            array.push(this._rom[c.ROM_HEADER_LOGO_START + i + 3]);
            array.push(this._rom[c.ROM_HEADER_LOGO_START + i + 2]);
            array.push(this._rom[c.ROM_HEADER_LOGO_START + i + 1]);
            array.push(this._rom[c.ROM_HEADER_LOGO_START + i + 0]);
          }
          return array;
        },
        /**
         * @return {string} title
         */
        getGameTitle: function getGameTitle() {
          return Array.from(this._rom.subarray(c.ROM_HEADER_TITLE_START, c.ROM_HEADER_TITLE_END)).map(function (i) {
            return String.fromCharCode(i);
          }).join('');
        }
      };
    }
  }]);

  return GBA;
}();

exports.default = GBA;

},{"./arm7tdmi":2,"./constants":3,"./logger":6,"./mmu":7}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _utils = require('./utils');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Logger = function () {
  function Logger() {
    _classCallCheck(this, Logger);
  }

  _createClass(Logger, null, [{
    key: 'error',
    value: function error(msg) {
      console.log(msg);
    }
  }, {
    key: 'info',
    value: function info(msg) {
      console.info(msg);
    }

    /**
     * @param {number} pc
     * @param {number} opcode
     * @param {Array} operands
     */

  }, {
    key: 'instr',
    value: function instr(pc, opcode, operands) {
      console.info(' ' + _utils2.default.to32hex(pc) + '  ' + opcode + ' ' + operands.map(function (operand) {
        return _utils2.default.toHex(operand);
      }).toString());
    }

    /**
     * @param {number} pc
     * @param {number} word
     */

  }, {
    key: 'fetched',
    value: function fetched(pc, word) {
      console.info('(' + _utils2.default.to32hex(pc) + ') -> ' + _utils2.default.to32hex(word));
    }
  }]);

  return Logger;
}();

exports.default = Logger;

},{"./utils":13}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _constants = require('./constants');

var c = _interopRequireWildcard(_constants);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var MMU = function () {

  /**
   * @param {Uint8Array} rom
   */
  function MMU(rom) {
    _classCallCheck(this, MMU);

    this._memory = new Uint8Array(c.MEMORY_SIZE);
    this._rom = rom;
  }

  /**
   * @param {number} offset
   * @return {boolean} true if address is valid
   */


  _createClass(MMU, [{
    key: 'readByte',


    /**
     * @param {number} offset
     * @return {number} value
     */
    value: function readByte(offset) {
      if (!MMU.isValidAddress(offset)) throw new Error('ReadByteOutOfBounds');
      if (offset < c.MEMORY_SIZE) {
        return this._memory[offset];
      } else {
        return this._rom[offset - c.MEMORY_SIZE];
      }
    }

    /**
     * @param {number} value
     * @param {number} offset
     */

  }, {
    key: 'writeByte',
    value: function writeByte(value, offset) {
      if (value < 0 || value > 0xff) throw new Error('WriteByteInvalidValue');
      if (offset < 0 || offset >= c.MEMORY_SIZE) throw new Error('WriteByteOutOfBounds');
      this._memory[offset] = value;
    }

    /**
     * @param {number} word
     * @param {number} offset
     */

  }, {
    key: 'writeWord',
    value: function writeWord(word) {
      var offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

      if (word < 0 || word > 0xffffffff) throw new Error('WriteWordInvalidValue');
      if (offset < 0 || offset >= c.MEMORY_SIZE) throw new Error('ReadWordOutOfBounds');
      this._memory[offset++] = word >> 24 & 0xff;
      this._memory[offset++] = word >> 16 & 0xff;
      this._memory[offset++] = word >> 8 & 0xff;
      this._memory[offset] = word & 0xff;
    }

    /**
     * @param {number} offset
     * @return {number} word
     */

  }, {
    key: 'readWord',
    value: function readWord(offset) {
      if (!MMU.isValidAddress(offset)) throw new Error('ReadWordOutOfBounds');
      if (offset < c.MEMORY_SIZE) {
        return (this._memory[offset + 3] << 24 >>> 0) + (this._memory[offset + 2] << 16 >>> 0) + (this._memory[offset + 1] << 8 >>> 0) + (this._memory[offset] >>> 0);
      } else {
        var base = offset - c.MEMORY_SIZE;
        return (this._rom[base + 3] << 24 >>> 0) + (this._rom[base + 2] << 16 >>> 0) + (this._rom[base + 1] << 8 >>> 0) + (this._rom[base] >>> 0);
      }
    }

    /**
     * @param {Uint8Array} array
     * @param {number} offset
     */

  }, {
    key: 'writeArray',
    value: function writeArray(array, offset) {
      this._memory.set(array, offset);
    }

    /**
     * @param offset
     * @param length
     * @return {Array}
     */

  }, {
    key: 'readArray',
    value: function readArray(offset, length) {
      var result = [];
      for (var i = 0; i < length; i++) {
        result.push(this.readWord(offset + i * c.ARM_INSTR_LENGTH));
      }
      return result;
    }
  }], [{
    key: 'isValidAddress',
    value: function isValidAddress(offset) {
      return offset >= 0 && offset < c.MEMORY_SIZE + c.EXT_MEMORY_SIZE;
    }
  }]);

  return MMU;
}();

exports.default = MMU;

},{"./constants":3}],8:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var AnimationFrame = function () {
  function AnimationFrame() {
    _classCallCheck(this, AnimationFrame);
  }

  _createClass(AnimationFrame, null, [{
    key: 'frame',

    /**
     * Method will be called with this=Window
     * @param callback
     */
    value: function frame(callback) {
      if (typeof callback === 'function') {
        window.callback = callback;
      }
      window.callback();
      window.requestAnimationFrame(window.frame);
    }
  }, {
    key: 'stop',
    value: function stop() {}
  }]);

  return AnimationFrame;
}();

exports.default = AnimationFrame;

},{}],9:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _view = require('./view');

var _view2 = _interopRequireDefault(_view);

var _utils = require('../utils');

var _utils2 = _interopRequireDefault(_utils);

var _model = require('./model');

var _model2 = _interopRequireDefault(_model);

var _constants = require('../constants');

var c = _interopRequireWildcard(_constants);

var _animationFrame = require('./animationFrame');

var _animationFrame2 = _interopRequireDefault(_animationFrame);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Controller = function () {

  /**
   * @param {Model} model
   * @param {View} view
   */
  function Controller(model, view) {
    var _this = this;

    _classCallCheck(this, Controller);

    this._model = model;
    this._view = view;
    // Bindings
    this._view.bind('setFlag', function (flag, value) {
      return _this.setFlag(flag, value);
    });
    this._view.bind('load', function (bios) {
      return _this.load(bios);
    });
    this._view.bind('execute', function () {
      return _this.execute();
    });
    this._view.bind('run', function () {
      return _this.run();
    });
    this._view.bind('onProgramScroll', function (delta) {
      return _this.onProgramScroll(delta);
    });
    this._view.bind('setProgramLine', function (line) {
      return _this.setProgramLine(line);
    });
    this._view.bind('onKeyDownProgramLine', function (line) {
      return _this.setProgramLine(line);
    });
    // Renderings
    this.renderProgram();
    this._renderMemory();
    this._view.render('controls', { run: false, step: false });
  }

  /**
   * @param {Uint8Array} bios
   */


  _createClass(Controller, [{
    key: 'load',
    value: function load(bios) {
      var _this2 = this;

      this._model.setBIOS(bios);
      this._model.boot(function (registers) {
        _this2._view.render('controls', { run: true, step: true });
        _this2.renderState(registers);
      });
    }

    /**
     * Executes one instruction
     */

  }, {
    key: 'execute',
    value: function execute() {
      var _this3 = this;

      this._model.execute(function (registers) {
        return _this3.renderState(registers);
      });
    }

    /**
     * Toggles program execution: either runs the program indefinitely or pauses.
     */

  }, {
    key: 'run',
    value: function run() {
      var _this4 = this;

      this._model.toggleRunning(function (running) {
        _this4._view.render('running', running);
        _this4._view.render('controls', { run: true, step: !running });
        _this4._view.requestFrame(running);
        _animationFrame2.default.frame(function () {
          return _this4.execute();
        });
      });
    }

    /**
     * @param flag
     * @param value
     */

  }, {
    key: 'setFlag',
    value: function setFlag(flag, value) {
      this._model.setFlag(flag, value);
    }

    /**
     * @param {Object} registers
     */

  }, {
    key: 'renderState',
    value: function renderState(registers) {
      this.renderProgram();
      this._renderMemory();
      this._view.render('cpu', registers);
    }
  }, {
    key: 'renderProgram',
    value: function renderProgram() {
      var pc = this._model.getPC();
      var offset = this._model.getProgramLine();
      var instrs = this._model.getInstrs();
      this._view.render('program', { instrs: instrs, offset: offset });
      this._view.render('currentInstr', { offset: offset, pc: pc });
    }

    /**
     * @param {number} delta
     */

  }, {
    key: 'onProgramScroll',
    value: function onProgramScroll(delta) {
      var _this5 = this;

      var programLine = this._model.getProgramLine();
      var newLine = programLine + delta;
      if (newLine < 0) {
        if (programLine > 0) {
          newLine = 0;
        } else {
          return;
        }
      }
      if (!_model2.default.isValidAddress(newLine + c.INSTR_ON_UI * c.ARM_INSTR_LENGTH - 1)) return;
      this._model.setProgramLine(newLine, function () {
        return _this5.renderProgram();
      });
    }

    /**
     * @param {string} hexString
     */

  }, {
    key: 'setProgramLine',
    value: function setProgramLine(hexString) {
      var _this6 = this;

      var line = _utils2.default.hexStrToNum(hexString);
      if (line < 0 || isNaN(line)) {
        return;
      }
      var programLine = Math.floor(line / 4) * 4;
      if (!_model2.default.isValidAddress(programLine + c.INSTR_ON_UI * c.ARM_INSTR_LENGTH - 1)) {
        programLine = c.MEMORY_SIZE + c.EXT_MEMORY_SIZE - c.INSTR_ON_UI * c.ARM_INSTR_LENGTH; // default to max
      }
      this._model.setProgramLine(programLine, function () {
        return _this6.renderProgram();
      });
    }

    /**
     * @private
     */

  }, {
    key: '_renderMemory',
    value: function _renderMemory() {
      this._view.render('memory', this._model.getMemory());
    }
  }]);

  return Controller;
}();

exports.default = Controller;

},{"../constants":3,"../utils":13,"./animationFrame":8,"./model":10,"./view":12}],10:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _constants = require('../constants');

var c = _interopRequireWildcard(_constants);

var _mmu = require('../mmu');

var _mmu2 = _interopRequireDefault(_mmu);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Model = function () {
  _createClass(Model, null, [{
    key: 'isValidAddress',
    value: function isValidAddress(address) {
      return _mmu2.default.isValidAddress(address);
    }

    /**
     * @param {GBA} GBA
     */

  }]);

  function Model(GBA) {
    _classCallCheck(this, Model);

    if (!GBA) throw new Error('MissingGBA');
    this._gba = GBA;
    this._programLine = 0;
    this._running = false;
  }

  /**
   * @param {function} callback
   */


  _createClass(Model, [{
    key: 'toggleRunning',
    value: function toggleRunning(callback) {
      this._running = !this._running;
      if (typeof callback === 'function') {
        callback.call(this, this._running);
      }
    }

    /**
     * @return {number} programLine
     */

  }, {
    key: 'getProgramLine',
    value: function getProgramLine() {
      return this._programLine;
    }

    /**
     * @param line
     * @param {function} callback
     */

  }, {
    key: 'setProgramLine',
    value: function setProgramLine(line, callback) {
      this._programLine = line;
      if (typeof callback === 'function') {
        callback.call(this, this._programLine);
      }
    }

    /**
     * //TODO: parametrize method
     * @param {function} callback
     */

  }, {
    key: 'boot',
    value: function boot(callback) {
      var oldRegisters = Object.assign({}, this.getRegisters()); // clone
      this._gba.getCPU().boot();
      this._programLine = this._gba.getCPU()._decoded[0];
      if (typeof callback === 'function') {
        callback.call(this, this._updatedRegisters(oldRegisters));
      }
    }

    /**
     * @param {function} callback
     */

  }, {
    key: 'execute',
    value: function execute(callback) {
      var oldRegisters = Object.assign({}, this.getRegisters()); // clone
      this._gba.getCPU().execute();
      this._programLine = this._gba.getCPU()._decoded[0];
      if (typeof callback === 'function') {
        callback.call(this, this._updatedRegisters(oldRegisters));
      }
    }

    /**
     * @param {Uint8Array} bios
     */

  }, {
    key: 'setBIOS',
    value: function setBIOS(bios) {
      this._gba.getCPU().setBIOS(bios);
    }

    /**
     * @param {string} flag
     * @param {boolean} value
     */

  }, {
    key: 'setFlag',
    value: function setFlag(flag, value) {
      var cpu = this._gba.getCPU();
      var nzcvq = this._gba.getCPU().getNZCVQ();
      var ift = this._gba.getCPU().getIFT();
      var bit = value ? 1 : 0;
      switch (flag) {
        case 'N':case 'Z':case 'C':case 'V':case 'Q':
          return cpu.setNZCVQ(nzcvq & (~(1 << c.FLAG_BITS[flag]) & 0x1f) | bit << c.FLAG_BITS[flag]);
        case 'I':case 'F':case 'T':
          return cpu.setIFT(ift & (~(1 << c.FLAG_BITS[flag]) & 7) | bit << c.FLAG_BITS[flag]);
        default:
          throw new Error('SetUnknownFlag ' + flag);
      }
    }

    /**
     * @param {string} flag
     * @return {boolean} value
     */

  }, {
    key: 'getFlag',
    value: function getFlag(flag) {
      var cpu = this._gba.getCPU();
      var nzcvq = cpu.getNZCVQ();
      var ift = cpu.getIFT();

      switch (flag) {
        case 'N':case 'Z':case 'C':case 'V':case 'Q':
          return nzcvq >>> c.FLAG_BITS[flag] === 1;
        case 'I':case 'F':case 'T':
          return ift >>> c.FLAG_BITS[flag] === 1;
        default:
          throw new Error('GetUnknownFlag ' + flag);
      }
    }

    /**
     * @return {Uint8Array} memory
     */

  }, {
    key: 'getMemory',
    value: function getMemory() {
      return this._gba._cpu._mmu._memory;
    }

    /**
     * @return {Array}
     */

  }, {
    key: 'getInstrs',
    value: function getInstrs() {
      return this._gba._cpu._mmu.readArray(this._programLine, c.INSTR_ON_UI);
    }

    /**
     * @return {Object} registers
     */

  }, {
    key: 'getRegisters',
    value: function getRegisters() {
      return this._gba.getCPU().getRegisters();
    }

    /**
     * @return {number} pc
     */

  }, {
    key: 'getPC',
    value: function getPC() {
      return this._gba.getCPU().getPC();
    }

    /**
     * @param {Object} oldRegisters
     * @return {Object} updatedRegisters
     * @private
     */

  }, {
    key: '_updatedRegisters',
    value: function _updatedRegisters(oldRegisters) {
      var newRegisters = this.getRegisters();
      var updatedRegisters = {};
      for (var r in oldRegisters) {
        if (oldRegisters[r] !== newRegisters[r]) {
          updatedRegisters[r] = newRegisters[r];
        }
      }
      return updatedRegisters;
    }
  }]);

  return Model;
}();

exports.default = Model;

},{"../constants":3,"../mmu":7}],11:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var RUN = exports.RUN = 'Run';
var PAUSE = exports.PAUSE = 'Pause';
var STEP = exports.STEP = 'Step';

},{}],12:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _utils = require('../utils');

var _utils2 = _interopRequireDefault(_utils);

var _decoder = require('../decoder');

var _decoder2 = _interopRequireDefault(_decoder);

var _constants = require('../constants');

var c = _interopRequireWildcard(_constants);

var _strings = require('./strings');

var s = _interopRequireWildcard(_strings);

var _animationFrame = require('./animationFrame');

var _animationFrame2 = _interopRequireDefault(_animationFrame);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var View = function () {

  /**
   * @param {Window} window
   * @param {FileReader} reader
   */
  function View(window, reader) {
    _classCallCheck(this, View);

    if ((typeof window === 'undefined' ? 'undefined' : _typeof(window)) !== 'object') throw new Error('MissingDocument');
    if ((typeof reader === 'undefined' ? 'undefined' : _typeof(reader)) !== 'object') throw new Error('MissingReader');
    this._window = window;
    this._document = window.document;
    this._reader = reader;
    this.$memory = this._document.querySelector('#memory textarea');
    this.$cpu = this._document.querySelector('#cpu ul');
    this.$program = this._document.getElementById('program');
    this.$programInstrs = null; // will hold all the instr li
    this.$lineInput = this._document.querySelector('input[name="programLine"]');
    this.$registers = this._document.querySelectorAll('#cpu span');
    this.$runButton = this._document.querySelector('#controls button[name="run"]');
    this._initDOM();
    this.requestFrame(true);
  }

  _createClass(View, [{
    key: 'requestFrame',
    value: function requestFrame(request) {
      this._window.frame = request ? _animationFrame2.default.frame : _animationFrame2.default.stop;
    }

    /**
     * @param target
     * @param type
     * @param callback
     */

  }, {
    key: 'bind',


    /**
     * @param {string} event
     * @param {Function} handler
     * @public
     */
    value: function bind(event, handler) {
      var _this = this;

      switch (event) {
        case 'setFlag':
          var $flags = this._document.querySelectorAll('#flags input[type="checkbox"]');
          $flags.forEach(function ($flag) {
            return View.on($flag, 'click', function () {
              return handler($flag.id, $flag.checked);
            });
          });
          break;
        case 'load':
          View.on(this._document.getElementById('load'), 'change', function (evt) {
            return _this.load(evt, handler);
          });
          break;
        case 'execute':
          View.on(this._document.querySelector('#controls button[name="step"]'), 'click', handler);
          break;
        case 'run':
          View.on(this._document.querySelector('#controls button[name="run"]'), 'click', handler);
          break;
        case 'onProgramScroll':
          View.on(this.$program, 'wheel', function (evt) {
            return View.onMouseWheel(evt, handler);
          });
          break;
        case 'setProgramLine':
          View.on(this._document.querySelector('button[name="setProgramLine"]'), 'click', function () {
            handler(_this.$lineInput.value);
          });
          break;
        case 'onKeyDownProgramLine':
          View.on(this.$lineInput, 'keydown', function (evt) {
            if (evt.keyCode === c.ENTER_KEYCODE) handler(_this.$lineInput.value);
          });
          break;
      }
    }

    /**
     * @param {Event} evt
     * @param {Function} handler
     */

  }, {
    key: 'load',


    /**
     * @param {Event} evt
     * @param {Function} handler
     */
    value: function load(evt, handler) {
      var file = evt.target.files[0]; // FileList object
      this._reader.onload = function (evt) {
        return handler(new Uint8Array(evt.target.result));
      };
      if (file) this._reader.readAsArrayBuffer(file);
    }

    /**
     * @param {string} command
     * @param {Object} args
     */

  }, {
    key: 'render',
    value: function render(command, args) {
      if (!command) return;
      switch (command) {
        case 'cpu':
          return this._renderCpu(args);
        case 'controls':
          return this._renderControls(args);
        case 'currentInstr':
          return this._highlightCurrentInstr(args.offset, args.pc);
        case 'memory':
          return this._renderMemoryPage(args);
        case 'program':
          return this._renderProgramPage(args.instrs, args.offset);
        case 'running':
          return this._renderRunning(args);
      }
    }

    /**
     * @param {boolean} running
     * @private
     */

  }, {
    key: '_renderRunning',
    value: function _renderRunning(running) {
      this.$runButton.textContent = running ? s.PAUSE : s.RUN;
    }

    /**
     * @param args
     * @private
     */

  }, {
    key: '_renderControls',
    value: function _renderControls(args) {
      for (var prop in args) {
        var button = this._document.querySelector('#controls button[name="' + prop + '"]');
        if (button) {
          button.disabled = !args[prop];
        }
      }
    }

    /**
     * @private
     */

  }, {
    key: '_initDOM',
    value: function _initDOM() {
      var $programUl = this._document.querySelector('#program ul');
      for (var i = 0; i < c.INSTR_ON_UI; i++) {
        var $li = this._document.createElement('li');
        $programUl.appendChild($li);
      }
      this.$programInstrs = this._document.querySelectorAll('#program li');

      // Strings
      this.$runButton.textContent = s.RUN;
      this._document.querySelector('#controls button[name="step"]').textContent = s.STEP;
    }

    /**
     * @param {number} offset
     * @param {number} pc
     * @private
     */

  }, {
    key: '_highlightCurrentInstr',
    value: function _highlightCurrentInstr(offset, pc) {
      var $old = this._document.getElementsByClassName('selected')[0];
      if ($old) $old.className = '';
      var highlight = pc - 8;
      if (highlight < offset || highlight >= offset + c.INSTR_ON_UI * 4) return;
      this.$programInstrs[(highlight - offset) / 4].className = 'selected';
    }

    /**
     * @param {Object} registers
     * @private
     */

  }, {
    key: '_renderCpu',
    value: function _renderCpu(registers) {
      for (var r = 0; r < this.$registers.length; r++) {
        switch (r) {
          case 15:
            if (registers['pc'] !== undefined) {
              this.$registers[r].innerText = _utils2.default.to32hex(registers['pc']);
              this.$registers[r].className = 'updated';
            } else {
              this.$registers[r].className = '';
            }
            break;
          case 16:
            if (registers['cpsr'] !== undefined) {
              this.$registers[r].innerText = _utils2.default.to32hex(registers['cpsr']);
              this.$registers[r].className = 'updated';
            } else {
              this.$registers[r].className = '';
            }
            break;
          case 17:
            if (registers['sprs'] !== undefined) {
              this.$registers[r].innerText = _utils2.default.to32hex(registers['sprs']);
              this.$registers[r].className = 'updated';
            } else {
              this.$registers[r].className = '';
            }
            break;
          default:
            if (registers['r' + r] !== undefined) {
              this.$registers[r].innerText = _utils2.default.to32hex(registers['r' + r]);
              this.$registers[r].className = 'updated';
            } else {
              this.$registers[r].className = '';
            }
        }
      }
    }

    /**
     * @param {Array} memory
     * @param {number} offset
     * @private
     */

  }, {
    key: '_renderProgramPage',
    value: function _renderProgramPage(memory, offset) {
      for (var i = 0; i < this.$programInstrs.length; i++) {
        var $li = this.$programInstrs[i];
        var pc = i * 4 + offset;
        $li.innerText = _utils2.default.to32hex(pc) + ' ' + _utils2.default.to32hex(memory[i]) + '  ' + _decoder2.default.decodeToString(pc, memory[i]);
      }
    }

    /**
     * @param {Uint8Array} memory
     * @private
     */

  }, {
    key: '_renderMemoryPage',
    value: function _renderMemoryPage(memory) {
      var lines = [];
      for (var i = 0; i < 0x100; i += 0x10) {
        var values = [];
        for (var j = i; j < i + 0x10; j++) {
          values.push(_utils2.default.toHex(memory[j]));
        }
        lines.push(_utils2.default.to32hex(i) + ' ' + values.join(' '));
      }
      this.$memory.textContent = lines.join('\n');
    }
  }], [{
    key: 'on',
    value: function on(target, type, callback) {
      target.addEventListener(type, callback);
    }
  }, {
    key: 'onMouseWheel',
    value: function onMouseWheel(evt, handler) {
      var delta = evt.wheelDeltaY > 0 ? -c.INSTR_ON_SCROLL : c.INSTR_ON_SCROLL;
      handler(delta);
    }
  }]);

  return View;
}();

exports.default = View;

},{"../constants":3,"../decoder":4,"../utils":13,"./animationFrame":8,"./strings":11}],13:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Utils = function () {
  function Utils() {
    _classCallCheck(this, Utils);
  }

  _createClass(Utils, null, [{
    key: 'reverseBytes',

    /**
     * @param {number} number
     * @param {number} number of bytes in output
     * @return {number} number with reversed bytes
     */
    value: function reverseBytes(number) {
      var numOutputBytes = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

      var output = number.toString(16).replace(/^(.(..)*)$/, "0$1").match(/../g).reverse().join('');
      if (numOutputBytes > 0) {
        output += '0'.repeat(numOutputBytes * 2 - output.length);
      }
      return parseInt(output, 16);
    }

    /**
     * @param unsigned byte
     * @return {number} signed byte (two's complement).
     */

  }, {
    key: 'toSigned',
    value: function toSigned(unsigned) {
      var mask = 1 << unsigned.toString(16).replace(/^(.(..)*)$/, "0$1").length * 4 /*bits/digit*/ - 1;
      return -(unsigned & mask) + (unsigned & ~mask);
    }

    /**
     * @param {number} number
     * @return {string} hex string
     */

  }, {
    key: 'toHex',
    value: function toHex(number) {
      return number.toString(16).replace(/^(.(..)*)$/, "0$1");
    }

    /**
     * @param hexString {string}
     * @return {number}
     */

  }, {
    key: 'hexStrToNum',
    value: function hexStrToNum(hexString) {
      return parseInt('0x' + hexString);
    }

    /**
     * @param {number} number
     * @return {string} padded hex string (32 bits)
     */

  }, {
    key: 'to32hex',
    value: function to32hex(number) {
      var hex = number.toString(16);
      if (hex.length < 8) {
        return '' + '0'.repeat(8 - hex.length) + hex;
      } else {
        return hex;
      }
    }

    /**
     * @param {number} word
     * @param {number} shift
     * @return {number} rotated word
     */

  }, {
    key: 'ror',
    value: function ror(word, shift) {
      return (word >>> shift | word << 32 - shift) >>> 0;
    }
  }]);

  return Utils;
}();

exports.default = Utils;

},{}]},{},[1]);
