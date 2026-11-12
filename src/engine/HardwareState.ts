/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Hardware Architecture State — "The Architect's Core"
 * Hardware registers (x86-64), physical memory address map,
 * bitwise bridge states, and system telemetry.
 */

export interface RegisterMap {
  RAX: bigint;
  RBX: bigint;
  RCX: bigint;
  RDX: bigint;
  RSI: bigint;
  RDI: bigint;
  RSP: bigint;
  RBP: bigint;
  R8: bigint;
  R9: bigint;
  R10: bigint;
  R11: bigint;
  R12: bigint;
  R13: bigint;
  R14: bigint;
  R15: bigint;
}

export type ZoneId = 'REGISTERS' | 'CACHE_MATRIX' | 'PAGE_ABYSS';

export interface HardwareTelemetry {
  clockGhz: number;
  vcore: number;
  temperatureC: number;
  tdpWatts: number;
  cacheHitRatio: number;
  isThrottled: boolean;
  hasMemoryLeak: boolean;
  kernelStatus: 'OPERATIONAL' | 'KERNEL_PANIC' | 'SEGFAULT' | 'SYNTAX_OVERHEAT';
  activeZone: ZoneId;
  totalInstructionsCompiled: number;
}

export interface MemoryEntry {
  address: number;
  hexAddress: string;
  value: number; // 8-bit or 16-bit physical register value
  description: string;
  tag: string;
}

export type HardwareListener = (telemetry: HardwareTelemetry) => void;

class HardwareController {
  // 64-bit general purpose registers
  public registers: RegisterMap = {
    RAX: 0x0000000000000000n,
    RBX: 0x0000000000000008n,
    RCX: 0x0000000000000042n,
    RDX: 0x0000000000000000n,
    RSI: 0x00007FFF00A10000n,
    RDI: 0x00007FFF00C40000n,
    RSP: 0x00007FFFFFFFE000n,
    RBP: 0x00007FFFFFFFE020n,
    R8:  0x0000000000000001n,
    R9:  0x0000000000000002n,
    R10: 0x0000000000000004n,
    R11: 0x0000000000000008n,
    R12: 0x0000000000000010n,
    R13: 0x0000000000000020n,
    R14: 0x0000000000000040n,
    R15: 0x0000000000000080n,
  };

  // Physical memory addresses mapped to hardware devices in the CPU micro-world
  public memory: Map<number, number> = new Map([
    // Laser barricade in L3 Cache: 1 = Lethal/Active, 0 = Bypassed/Deactivated
    [0x7FFF00A1, 0x01],
    // L3 Cache Matrix Sector Lock
    [0x7FFF00B0, 0xAA],
    // Page Fault Abyss 8-Bit Bridge Alignment: 01101100 (108 dec).
    // Target is 10110000 (176 dec, achieved by SHL 2 or writing 0xB0)
    [0x7FFF00C4, 0b01101100],
    // CPU Voltage Regulator Register: 0x1E = 1.25V normal
    [0x7FFF00D8, 0x1E],
    // Watchdog Security Daemon: 0x01 = Enforcing
    [0x7FFF0100, 0x01],
  ]);

  public telemetry: HardwareTelemetry = {
    clockGhz: 5.42,
    vcore: 1.28,
    temperatureC: 62.4,
    tdpWatts: 142.0,
    cacheHitRatio: 98.7,
    isThrottled: false,
    hasMemoryLeak: false,
    kernelStatus: 'OPERATIONAL',
    activeZone: 'REGISTERS',
    totalInstructionsCompiled: 0,
  };

  public kernelLogs: string[] = [
    '[0.000000] Linux version 6.12.0-core-architect (Enes Öztürk@silicon-foundry)',
    '[0.000004] x86/fpu: Supporting XSAVE feature 0x001: \'x87 floating point registers\'',
    '[0.000010] Microcode: Revision 0x42 loaded for Architect Quantum Core',
    '[0.000120] ACPI: Core registers RAX..R15 initialized and grounded to VDD',
    '[0.000245] MMU: Physical page tables mapped. Page Fault Abyss monitoring active',
    '[0.000380] Hardware Lock: Laser Barricade armed at 0x7FFF00A1 [STATUS: LETHAL]',
    '[0.000512] Enes Engine v26.04: Real-time JIT compiler online. Ready for machine code.',
  ];

  private listeners: Set<HardwareListener> = new Set();

  public subscribe(listener: HardwareListener): () => void {
    this.listeners.add(listener);
    listener(this.telemetry);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public notify() {
    this.listeners.forEach((fn) => fn({ ...this.telemetry }));
  }

  public log(msg: string) {
    const timestamp = (performance.now() / 1000).toFixed(6);
    this.kernelLogs.push(`[${timestamp.padStart(10, ' ')}] ${msg}`);
    if (this.kernelLogs.length > 80) {
      this.kernelLogs.shift();
    }
  }

  public readMemory(addr: number): number {
    return this.memory.get(addr) ?? 0x00;
  }

  public writeMemory(addr: number, val: number) {
    const prev = this.memory.get(addr);
    const maskedVal = val & 0xFF;
    this.memory.set(addr, maskedVal);

    this.log(`MMU POKE: [0x${addr.toString(16).toUpperCase()}] <= 0x${maskedVal.toString(16).toUpperCase().padStart(2, '0')} (binary: ${maskedVal.toString(2).padStart(8, '0')})`);

    // Check reactive hardware effects
    if (addr === 0x7FFF00A1) {
      if (maskedVal === 0x00) {
        this.log('HARDWARE SUCCESS: Laser Barricade [0x7FFF00A1] power supply disconnected! Beam collapsed.');
      } else {
        this.log('HARDWARE ALERT: Laser Barricade [0x7FFF00A1] energized to 100%. LETHAL BARRIER ACTIVE.');
      }
    }

    if (addr === 0x7FFF00C4) {
      const isAligned = this.isBridgeAligned();
      if (isAligned) {
        this.log('HARDWARE SUCCESS: Page Fault Abyss Bridge quantum lock engaged! Platforms aligned.');
      } else {
        this.log(`HARDWARE NOTICE: Bridge orientation shifted. Current byte: 0x${maskedVal.toString(16).toUpperCase().padStart(2, '0')}`);
      }
    }

    this.notify();
    return prev;
  }

  /**
   * Check if laser barricade is disabled
   */
  public isLaserBarricadeDisabled(): boolean {
    return (this.memory.get(0x7FFF00A1) ?? 1) === 0;
  }

  /**
   * Target alignment for the bridge is 0b10110000 (0xB0 / 176)
   * Starting value is 0b01101100 (0x6C / 108).
   * Notice: 0b01101100 << 2 = 0b110110000 & 0xFF = 0b10110000 = 0xB0!
   */
  public isBridgeAligned(): boolean {
    const val = (this.memory.get(0x7FFF00C4) ?? 0) & 0xFF;
    return val === 0b10110000 || val === 0xB0;
  }

  public getBridgeByte(): number {
    return (this.memory.get(0x7FFF00C4) ?? 0) & 0xFF;
  }

  public setBridgeBit(bitIndex: number, bitValue: 0 | 1) {
    let current = this.getBridgeByte();
    if (bitValue === 1) {
      current |= (1 << (7 - bitIndex));
    } else {
      current &= ~(1 << (7 - bitIndex));
    }
    this.writeMemory(0x7FFF00C4, current);
  }

  public shiftBridge(direction: 'LEFT' | 'RIGHT', count: number = 1) {
    let current = this.getBridgeByte();
    if (direction === 'LEFT') {
      current = (current << count) & 0xFF;
    } else {
      current = (current >>> count) & 0xFF;
    }
    this.writeMemory(0x7FFF00C4, current);
  }

  /**
   * Trigger syntax error or thermal fault
   */
  public reportSyntaxFault(errorMsg: string) {
    this.telemetry.temperatureC = Math.min(99.8, this.telemetry.temperatureC + 18.5);
    this.telemetry.vcore = Math.min(1.48, this.telemetry.vcore + 0.08);
    this.telemetry.tdpWatts = Math.min(240, this.telemetry.tdpWatts + 45);
    this.telemetry.isThrottled = true;
    this.telemetry.kernelStatus = 'SYNTAX_OVERHEAT';
    this.log(`COMPILER PANIC: Syntax error triggered hardware thermal spike! ${errorMsg}`);
    this.notify();

    // Gradual cool down
    setTimeout(() => {
      this.telemetry.isThrottled = false;
      this.telemetry.temperatureC = Math.max(62.0, this.telemetry.temperatureC - 10);
      this.telemetry.kernelStatus = 'OPERATIONAL';
      this.notify();
    }, 4000);
  }

  /**
   * Trigger laser lethal contact / segfault
   */
  public reportSegFault(addressHex: string) {
    this.telemetry.kernelStatus = 'SEGFAULT';
    this.telemetry.vcore = 1.45;
    this.log(`KERNEL PANIC: Segmentation fault (core dumped) at ${addressHex}! Invalid memory read/write protection ring breach.`);
    this.notify();

    setTimeout(() => {
      if (this.telemetry.kernelStatus === 'SEGFAULT') {
        this.telemetry.kernelStatus = 'OPERATIONAL';
        this.notify();
      }
    }, 3500);
  }

  public setActiveZone(zone: ZoneId) {
    if (this.telemetry.activeZone !== zone) {
      this.telemetry.activeZone = zone;
      this.log(`ZONE TRANSIT: Enes Öztürk entered [${zone}]. Architecture sub-bus synchronized.`);
      this.notify();
    }
  }

  public triggerCacheMiss() {
    this.telemetry.cacheHitRatio = Math.max(12.4, this.telemetry.cacheHitRatio - 25);
    this.telemetry.temperatureC = Math.min(95, this.telemetry.temperatureC + 8);
    this.log('L3 CACHE MISS: Sector mismatch! Line invalidated, memory pipeline stalled. Intrusion anomalies active!');
    this.notify();

    setTimeout(() => {
      this.telemetry.cacheHitRatio = 98.2;
      this.notify();
    }, 5000);
  }
}

export const hardware = new HardwareController();
