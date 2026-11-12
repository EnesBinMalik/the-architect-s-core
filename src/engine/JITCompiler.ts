/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * JIT Compiler & x86-64 Machine Code Parser — "The Architect's Core"
 * Handcrafted JIT execution engine for Enes Öztürk's System Architect Terminal.
 * Performs real-time lexical analysis, AST generation, and microcode dispatch.
 */

import { hardware, RegisterMap } from './HardwareState';
import { soundEngine } from '../audio/AnalogFoleySynthesizer';

export interface CompilationResult {
  success: boolean;
  rawInput: string;
  opcodesHex: string;
  cycles: number;
  message: string;
  errorLine?: number;
  memoryChanged?: { address: number; prevVal: number; newVal: number };
}

export class JITCompiler {
  /**
   * Parse and compile an assembly instruction line in real-time
   */
  public static compile(line: string): CompilationResult {
    const trimmed = line.trim();
    if (!trimmed) {
      return {
        success: true,
        rawInput: line,
        opcodesHex: '',
        cycles: 0,
        message: 'EMPTY_LINE: 0 cycles consumed.',
      };
    }

    // Handle high-level commands
    const upper = trimmed.toUpperCase();
    if (upper === 'HELP') {
      return this.handleHelp();
    }
    if (upper === 'STATUS') {
      return this.handleStatus();
    }
    if (upper.startsWith('INSPECT')) {
      return this.handleInspect(trimmed.substring(7).trim());
    }
    if (upper.startsWith('PEEK')) {
      return this.handlePeek(trimmed.substring(4).trim());
    }
    if (upper.startsWith('POKE')) {
      return this.handlePoke(trimmed.substring(4).trim());
    }
    if (upper.startsWith('DISASM')) {
      return this.handleDisasm(trimmed.substring(6).trim());
    }

    // Try parsing as standard x86-64 / Enes Engine assembly instruction
    // Format: OPCODE OPERAND1 [, OPERAND2]
    const match = trimmed.match(/^([A-Za-z]+)(?:\s+(.+))?$/);
    if (!match) {
      return this.failCompilation(trimmed, 'SYNTAX_ERROR: Malformed instruction token stream.');
    }

    const opcode = match[1].toUpperCase();
    const argsStr = match[2] ? match[2].trim() : '';

    try {
      switch (opcode) {
        case 'NOP':
          soundEngine.playJitSuccess();
          hardware.telemetry.totalInstructionsCompiled++;
          hardware.notify();
          return {
            success: true,
            rawInput: trimmed,
            opcodesHex: '90',
            cycles: 1,
            message: '[0x90] NOP executed. CPU idle pipeline delay. (1 cycle)',
          };

        case 'MOV':
          return this.executeMov(trimmed, argsStr);

        case 'XOR':
          return this.executeXor(trimmed, argsStr);

        case 'AND':
          return this.executeAnd(trimmed, argsStr);

        case 'OR':
          return this.executeOr(trimmed, argsStr);

        case 'NOT':
          return this.executeNot(trimmed, argsStr);

        case 'SHL':
          return this.executeShl(trimmed, argsStr);

        case 'SHR':
          return this.executeShr(trimmed, argsStr);

        case 'CMP':
          return this.executeCmp(trimmed, argsStr);

        default:
          return this.failCompilation(
            trimmed,
            `ILLEGAL_INSTRUCTION: Unknown mnemonic '${opcode}'. Supported: MOV, XOR, AND, OR, NOT, SHL, SHR, NOP, CMP, PEEK, POKE, INSPECT, DISASM, STATUS, HELP`
          );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return this.failCompilation(trimmed, `COMPILER_CRASH: ${msg}`);
    }
  }

  private static parseOperand(raw: string): { type: 'REGISTER' | 'MEMORY' | 'IMMEDIATE'; key: string; value: bigint; address?: number } {
    const clean = raw.trim();

    // Memory dereference: [0x7FFF00A1] or [RAX]
    if (clean.startsWith('[') && clean.endsWith(']')) {
      const inner = clean.slice(1, -1).trim();
      const addr = this.parseNumeric(inner);
      if (addr === null) {
        // Could be register dereference
        const regKey = inner.toUpperCase() as keyof RegisterMap;
        if (regKey in hardware.registers) {
          const regVal = Number(hardware.registers[regKey] & 0xFFFFFFFFn);
          return { type: 'MEMORY', key: clean, value: BigInt(hardware.readMemory(regVal)), address: regVal };
        }
        throw new Error(`Invalid memory address operand: '${inner}'`);
      }
      return { type: 'MEMORY', key: clean, value: BigInt(hardware.readMemory(addr)), address: addr };
    }

    // General purpose register
    const regKey = clean.toUpperCase() as keyof RegisterMap;
    if (regKey in hardware.registers) {
      return { type: 'REGISTER', key: regKey, value: hardware.registers[regKey] };
    }

    // Immediate numeric literal (hex 0x..., bin 0b..., or dec)
    const num = this.parseNumeric(clean);
    if (num !== null) {
      return { type: 'IMMEDIATE', key: clean, value: BigInt(num) };
    }

    throw new Error(`Unrecognized operand token '${clean}'. Expected Register (e.g. RAX), Memory [0x...], or Numeric literal.`);
  }

  private static parseNumeric(raw: string): number | null {
    const s = raw.trim();
    if (/^0x[0-9a-fA-F]+$/i.test(s)) {
      return parseInt(s, 16);
    }
    if (/^0b[01]+$/i.test(s)) {
      return parseInt(s.substring(2), 2);
    }
    if (/^-?[0-9]+$/.test(s)) {
      return parseInt(s, 10);
    }
    return null;
  }

  private static executeMov(raw: string, argsStr: string): CompilationResult {
    const parts = this.splitArgs(argsStr);
    if (parts.length !== 2) {
      throw new Error(`MOV requires exactly 2 operands: MOV <destination>, <source>. Given: '${argsStr}'`);
    }

    const dst = this.parseOperand(parts[0]);
    const src = this.parseOperand(parts[1]);

    if (dst.type === 'IMMEDIATE') {
      throw new Error(`Cannot MOV into immediate constant '${dst.key}'. Destination must be Register or Memory.`);
    }

    let memChanged = undefined;
    let opcodeHex = '48 C7 C0';

    if (dst.type === 'MEMORY') {
      if (!dst.address) throw new Error('Unresolved memory write pointer');
      const prev = hardware.readMemory(dst.address);
      const valToWrite = Number(src.value & 0xFFn);
      hardware.writeMemory(dst.address, valToWrite);
      memChanged = { address: dst.address, prevVal: prev, newVal: valToWrite };
      opcodeHex = `C6 04 25 ${dst.address.toString(16).padStart(8, '0')} ${valToWrite.toString(16).padStart(2, '0')}`;
    } else {
      hardware.registers[dst.key as keyof RegisterMap] = src.value;
      opcodeHex = `48 89 C${(dst.key.charCodeAt(1) % 8)}`;
    }

    soundEngine.playJitSuccess();
    hardware.telemetry.totalInstructionsCompiled++;
    hardware.notify();

    return {
      success: true,
      rawInput: raw,
      opcodesHex: opcodeHex,
      cycles: dst.type === 'MEMORY' ? 3 : 1,
      message: `MOV ${dst.key}, 0x${src.value.toString(16).toUpperCase()} compiled successfully. ${memChanged ? `[Written 0x${memChanged.newVal.toString(16).padStart(2, '0')} to MMU]` : ''}`,
      memoryChanged: memChanged,
    };
  }

  private static executeXor(raw: string, argsStr: string): CompilationResult {
    const parts = this.splitArgs(argsStr);
    if (parts.length !== 2) {
      throw new Error(`XOR requires 2 operands: XOR <destination>, <source>. Given: '${argsStr}'`);
    }

    const dst = this.parseOperand(parts[0]);
    const src = this.parseOperand(parts[1]);

    if (dst.type === 'IMMEDIATE') {
      throw new Error(`Cannot XOR immediate destination '${dst.key}'.`);
    }

    let memChanged = undefined;
    const result = dst.value ^ src.value;

    if (dst.type === 'MEMORY') {
      if (!dst.address) throw new Error('Unresolved memory write pointer');
      const prev = hardware.readMemory(dst.address);
      const valToWrite = Number(result & 0xFFn);
      hardware.writeMemory(dst.address, valToWrite);
      memChanged = { address: dst.address, prevVal: prev, newVal: valToWrite };
    } else {
      hardware.registers[dst.key as keyof RegisterMap] = result;
    }

    soundEngine.playJitSuccess();
    hardware.telemetry.totalInstructionsCompiled++;
    hardware.notify();

    return {
      success: true,
      rawInput: raw,
      opcodesHex: '48 31 C0',
      cycles: 1,
      message: `XOR ${dst.key} result: 0x${result.toString(16).toUpperCase()} (0b${result.toString(2)}). Handcrafted bitwise operation verified.`,
      memoryChanged: memChanged,
    };
  }

  private static executeAnd(raw: string, argsStr: string): CompilationResult {
    const parts = this.splitArgs(argsStr);
    if (parts.length !== 2) throw new Error('AND requires 2 operands: AND <destination>, <source>');

    const dst = this.parseOperand(parts[0]);
    const src = this.parseOperand(parts[1]);
    if (dst.type === 'IMMEDIATE') throw new Error('Cannot AND into immediate constant');

    const result = dst.value & src.value;
    let memChanged = undefined;

    if (dst.type === 'MEMORY') {
      if (!dst.address) throw new Error('Unresolved memory pointer');
      const prev = hardware.readMemory(dst.address);
      const val = Number(result & 0xFFn);
      hardware.writeMemory(dst.address, val);
      memChanged = { address: dst.address, prevVal: prev, newVal: val };
    } else {
      hardware.registers[dst.key as keyof RegisterMap] = result;
    }

    soundEngine.playJitSuccess();
    hardware.telemetry.totalInstructionsCompiled++;
    hardware.notify();

    return {
      success: true,
      rawInput: raw,
      opcodesHex: '48 21 C0',
      cycles: 1,
      message: `AND ${dst.key} result: 0x${result.toString(16).toUpperCase()}`,
      memoryChanged: memChanged,
    };
  }

  private static executeOr(raw: string, argsStr: string): CompilationResult {
    const parts = this.splitArgs(argsStr);
    if (parts.length !== 2) throw new Error('OR requires 2 operands: OR <destination>, <source>');

    const dst = this.parseOperand(parts[0]);
    const src = this.parseOperand(parts[1]);
    if (dst.type === 'IMMEDIATE') throw new Error('Cannot OR into immediate constant');

    const result = dst.value | src.value;
    let memChanged = undefined;

    if (dst.type === 'MEMORY') {
      if (!dst.address) throw new Error('Unresolved memory pointer');
      const prev = hardware.readMemory(dst.address);
      const val = Number(result & 0xFFn);
      hardware.writeMemory(dst.address, val);
      memChanged = { address: dst.address, prevVal: prev, newVal: val };
    } else {
      hardware.registers[dst.key as keyof RegisterMap] = result;
    }

    soundEngine.playJitSuccess();
    hardware.telemetry.totalInstructionsCompiled++;
    hardware.notify();

    return {
      success: true,
      rawInput: raw,
      opcodesHex: '48 09 C0',
      cycles: 1,
      message: `OR ${dst.key} result: 0x${result.toString(16).toUpperCase()}`,
      memoryChanged: memChanged,
    };
  }

  private static executeNot(raw: string, argsStr: string): CompilationResult {
    const dst = this.parseOperand(argsStr);
    if (dst.type === 'IMMEDIATE') throw new Error('Cannot NOT immediate operand');

    let memChanged = undefined;
    if (dst.type === 'MEMORY') {
      if (!dst.address) throw new Error('Unresolved memory pointer');
      const prev = hardware.readMemory(dst.address);
      const val = (~prev) & 0xFF;
      hardware.writeMemory(dst.address, val);
      memChanged = { address: dst.address, prevVal: prev, newVal: val };
    } else {
      hardware.registers[dst.key as keyof RegisterMap] = ~hardware.registers[dst.key as keyof RegisterMap];
    }

    soundEngine.playJitSuccess();
    hardware.telemetry.totalInstructionsCompiled++;
    hardware.notify();

    return {
      success: true,
      rawInput: raw,
      opcodesHex: 'F7 D0',
      cycles: 1,
      message: `NOT ${dst.key} completed. Bits inverted.`,
      memoryChanged: memChanged,
    };
  }

  private static executeShl(raw: string, argsStr: string): CompilationResult {
    const parts = this.splitArgs(argsStr);
    if (parts.length !== 2) throw new Error('SHL requires 2 operands: SHL <dest>, <shiftCount>');

    const dst = this.parseOperand(parts[0]);
    const shiftCount = Number(this.parseNumeric(parts[1]) ?? 1);

    let memChanged = undefined;
    if (dst.type === 'MEMORY') {
      if (!dst.address) throw new Error('Unresolved memory pointer');
      const prev = hardware.readMemory(dst.address);
      const val = (prev << shiftCount) & 0xFF;
      hardware.writeMemory(dst.address, val);
      memChanged = { address: dst.address, prevVal: prev, newVal: val };
    } else {
      hardware.registers[dst.key as keyof RegisterMap] = hardware.registers[dst.key as keyof RegisterMap] << BigInt(shiftCount);
    }

    soundEngine.playJitSuccess();
    hardware.telemetry.totalInstructionsCompiled++;
    hardware.notify();

    return {
      success: true,
      rawInput: raw,
      opcodesHex: `C1 E0 ${shiftCount.toString(16).padStart(2, '0')}`,
      cycles: 2,
      message: `SHL ${dst.key}, ${shiftCount} => Shifted left ${shiftCount} bits. ${memChanged ? `New binary: ${memChanged.newVal.toString(2).padStart(8, '0')} (0x${memChanged.newVal.toString(16).toUpperCase()})` : ''}`,
      memoryChanged: memChanged,
    };
  }

  private static executeShr(raw: string, argsStr: string): CompilationResult {
    const parts = this.splitArgs(argsStr);
    if (parts.length !== 2) throw new Error('SHR requires 2 operands: SHR <dest>, <shiftCount>');

    const dst = this.parseOperand(parts[0]);
    const shiftCount = Number(this.parseNumeric(parts[1]) ?? 1);

    let memChanged = undefined;
    if (dst.type === 'MEMORY') {
      if (!dst.address) throw new Error('Unresolved memory pointer');
      const prev = hardware.readMemory(dst.address);
      const val = (prev >>> shiftCount) & 0xFF;
      hardware.writeMemory(dst.address, val);
      memChanged = { address: dst.address, prevVal: prev, newVal: val };
    } else {
      hardware.registers[dst.key as keyof RegisterMap] = hardware.registers[dst.key as keyof RegisterMap] >> BigInt(shiftCount);
    }

    soundEngine.playJitSuccess();
    hardware.telemetry.totalInstructionsCompiled++;
    hardware.notify();

    return {
      success: true,
      rawInput: raw,
      opcodesHex: `C1 E8 ${shiftCount.toString(16).padStart(2, '0')}`,
      cycles: 2,
      message: `SHR ${dst.key}, ${shiftCount} => Shifted right ${shiftCount} bits.`,
      memoryChanged: memChanged,
    };
  }

  private static executeCmp(raw: string, argsStr: string): CompilationResult {
    const parts = this.splitArgs(argsStr);
    if (parts.length !== 2) throw new Error('CMP requires 2 operands');
    const op1 = this.parseOperand(parts[0]);
    const op2 = this.parseOperand(parts[1]);
    const diff = op1.value - op2.value;
    const zf = diff === 0n ? 1 : 0;
    const sf = diff < 0n ? 1 : 0;

    soundEngine.playJitSuccess();
    return {
      success: true,
      rawInput: raw,
      opcodesHex: '48 39 C3',
      cycles: 1,
      message: `CMP ${op1.key}, ${op2.key} => Flags set: ZF=${zf}, SF=${sf}`,
    };
  }

  private static handlePeek(arg: string): CompilationResult {
    const addr = this.parseNumeric(arg);
    if (addr === null) throw new Error(`Invalid address for PEEK: '${arg}'`);
    const val = hardware.readMemory(addr);
    soundEngine.playJitSuccess();
    return {
      success: true,
      rawInput: `PEEK ${arg}`,
      opcodesHex: '8A 04 25',
      cycles: 2,
      message: `[0x${addr.toString(16).toUpperCase()}] => 0x${val.toString(16).toUpperCase().padStart(2, '0')} (dec: ${val}, bin: ${val.toString(2).padStart(8, '0')})`,
    };
  }

  private static handlePoke(arg: string): CompilationResult {
    const parts = arg.split(/\s+/);
    if (parts.length < 2) throw new Error('POKE requires <address> <value>');
    const addr = this.parseNumeric(parts[0]);
    const val = this.parseNumeric(parts[1]);
    if (addr === null || val === null) throw new Error('Invalid numeric parameters in POKE');
    const prev = hardware.writeMemory(addr, val);
    soundEngine.playJitSuccess();
    return {
      success: true,
      rawInput: `POKE ${arg}`,
      opcodesHex: 'C6 04 25',
      cycles: 3,
      message: `POKE [0x${addr.toString(16).toUpperCase()}] <= 0x${(val & 0xFF).toString(16).toUpperCase().padStart(2, '0')} (overwritten prev: 0x${(prev ?? 0).toString(16)})`,
      memoryChanged: { address: addr, prevVal: prev ?? 0, newVal: val & 0xFF },
    };
  }

  private static handleInspect(target: string): CompilationResult {
    const t = target.toUpperCase();
    soundEngine.playJitSuccess();
    if (t === 'REGISTERS' || t === 'REGS') {
      const dump = Object.entries(hardware.registers)
        .slice(0, 8)
        .map(([k, v]) => `${k}=0x${v.toString(16).toUpperCase().padStart(16, '0')}`)
        .join(' | ');
      return {
        success: true,
        rawInput: `INSPECT ${target}`,
        opcodesHex: '',
        cycles: 1,
        message: `REGISTER DUMP:\n${dump}`,
      };
    }
    if (t === 'LASER' || t === 'BARRICADE' || t === '0X7FFF00A1') {
      const state = hardware.readMemory(0x7FFF00A1);
      return {
        success: true,
        rawInput: `INSPECT ${target}`,
        opcodesHex: '',
        cycles: 1,
        message: `DEVICE [0x7FFF00A1] LASER BARRICADE: ${state === 0 ? 'DISABLED (BEAM COLLAPSED - SAFE TO PASS)' : 'ACTIVE (LETHAL IONIC FLUX FIELD)'}`,
      };
    }
    if (t === 'BRIDGE' || t === '0X7FFF00C4') {
      const byte = hardware.getBridgeByte();
      const aligned = hardware.isBridgeAligned();
      return {
        success: true,
        rawInput: `INSPECT ${target}`,
        opcodesHex: '',
        cycles: 1,
        message: `DEVICE [0x7FFF00C4] QUANTUM BRIDGE:\nCurrent Byte: 0b${byte.toString(2).padStart(8, '0')} (0x${byte.toString(16).toUpperCase()})\nTarget Alignment: 0b10110000 (0xB0)\nStatus: ${aligned ? 'LOCKED & ALIGNED (BRIDGE SOLID)' : 'MISALIGNED (PLATFORMS FLOATING UNSTABLE)'}`,
      };
    }
    return {
      success: true,
      rawInput: `INSPECT ${target}`,
      opcodesHex: '',
      cycles: 1,
      message: `Hardware target '${target}' mapped to bus controller. Specify: REGISTERS, LASER, BRIDGE, CACHE, or ADDRESS [0x...]`,
    };
  }

  private static handleDisasm(addrStr: string): CompilationResult {
    soundEngine.playJitSuccess();
    return {
      success: true,
      rawInput: `DISASM ${addrStr}`,
      opcodesHex: '55 48 89 E5',
      cycles: 4,
      message: `DISASSEMBLY at ${addrStr || 'RIP'}:\n0x7FFF00A0: C6 04 25 A1 00 FF 7F 01   mov byte ptr [0x7FFF00A1], 1\n0x7FFF00A8: 48 8B 05 10 00 00 00      mov rax, qword ptr [rip+0x10]\n0x7FFF00B0: 48 83 F8 00               cmp rax, 0`,
    };
  }

  private static handleStatus(): CompilationResult {
    soundEngine.playJitSuccess();
    const t = hardware.telemetry;
    return {
      success: true,
      rawInput: 'STATUS',
      opcodesHex: '',
      cycles: 1,
      message: `ARCHITECT CORE STATUS:\nCPU: ${t.clockGhz.toFixed(2)} GHz | VCORE: ${t.vcore.toFixed(2)}V | TEMP: ${t.temperatureC.toFixed(1)}°C | TDP: ${t.tdpWatts.toFixed(0)}W\nKERNEL: ${t.kernelStatus} | ACTIVE ZONE: ${t.activeZone}\nLASER [0x7FFF00A1]: ${hardware.isLaserBarricadeDisabled() ? 'OFF' : 'LETHAL'}\nBRIDGE [0x7FFF00C4]: ${hardware.isBridgeAligned() ? 'ALIGNED (0xB0)' : 'UNALIGNED'}`,
    };
  }

  private static handleHelp(): CompilationResult {
    soundEngine.playJitSuccess();
    return {
      success: true,
      rawInput: 'HELP',
      opcodesHex: '',
      cycles: 0,
      message: `ENES ÖZTÜRK — "THE ARCHITECT'S CORE" COMMAND REFERENCE:\n
[x86-64 HARDWARE INSTRUCTIONS]
  MOV [0x7FFF00A1], 0        - Disable lethal laser barricade
  MOV [0x7FFF00C4], 0xB0     - Align Page Fault Abyss Bridge
  SHL [0x7FFF00C4], 2        - Shift bridge byte left 2 bits (01101100 -> 10110000)
  XOR [0x7FFF00A1], [0x7FFF00A1] - Zero memory address via XOR
  AND [0x7FFF00C4], 0xF0     - Bitwise AND mask
  OR  [0x7FFF00C4], 0x80     - Bitwise OR set bit
  NOT [0x7FFF00C4]           - Invert all 8 bridge bits
  NOP                        - No operation delay
\n[SYSTEM & MMU TOOLS]
  PEEK <hex_address>         - Read byte from memory (e.g. PEEK 0x7FFF00A1)
  POKE <hex_addr> <hex_val>  - Write byte directly (e.g. POKE 0x7FFF00A1 0x00)
  INSPECT LASER | BRIDGE | REGS - Query physical device telemetry
  STATUS                     - Full clock, voltage & kernel health
  CLEAR                      - Wipe terminal backlog`,
    };
  }

  private static failCompilation(rawInput: string, errorReason: string): CompilationResult {
    soundEngine.playSyntaxError();
    hardware.reportSyntaxFault(errorReason);

    return {
      success: false,
      rawInput,
      opcodesHex: '?? ?? ??',
      cycles: 0,
      message: `[JIT COMPILATION FAILED: SYNTAX ERROR]\n--> ${rawInput}\n${errorReason}\n\n[HARDWARE FAULT]: Microcode decoder faulted! Thermal spike detected, terminal capacitors discharged!`,
      errorLine: 1,
    };
  }

  private static splitArgs(argsStr: string): string[] {
    const result: string[] = [];
    let current = '';
    let inBracket = false;

    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];
      if (char === '[') inBracket = true;
      if (char === ']') inBracket = false;

      if (char === ',' && !inBracket) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) {
      result.push(current.trim());
    }
    return result;
  }
}
