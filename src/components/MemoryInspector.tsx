/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Memory Map & MMU Inspector — "The Architect's Core"
 * Live hex viewer and register status for CPU architecture debugging.
 */

import React from 'react';
import { hardware, RegisterMap } from '../engine/HardwareState';
import { soundEngine } from '../audio/AnalogFoleySynthesizer';
import { Database, ShieldAlert, Cpu } from 'lucide-react';

export const MemoryInspector: React.FC = () => {
  const [, setTick] = React.useState(0);

  React.useEffect(() => {
    const unsub = hardware.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  const memoryAddresses = [
    {
      addr: 0x7FFF00A1,
      name: 'LASER_BARRIER_GATE',
      desc: 'Lethal optical fence. 0x01 = ARMED, 0x00 = DISARMED',
      zone: 'L3 Cache Matrix',
    },
    {
      addr: 0x7FFF00B0,
      name: 'L3_SECTOR_ROUTER',
      desc: 'Routing tag for crystal SRAM cache hierarchy',
      zone: 'L3 Cache Matrix',
    },
    {
      addr: 0x7FFF00C4,
      name: 'ABYSS_BRIDGE_ALIGN',
      desc: '8-bit bridge alignment. Target: 0b10110000 (0xB0 / 176)',
      zone: 'Page Fault Abyss',
    },
    {
      addr: 0x7FFF00D8,
      name: 'VCORE_VOLTAGE_DAC',
      desc: 'Analog voltage regulator trim. Default: 0x1E (1.28V)',
      zone: 'Power Delivery',
    },
    {
      addr: 0x7FFF0100,
      name: 'WATCHDOG_DAEMON',
      desc: 'Microcode integrity watchdog. Non-maskable interrupt',
      zone: 'Core Management',
    },
  ];

  const registersList = Object.entries(hardware.registers) as [keyof RegisterMap, bigint][];

  return (
    <div className="bg-black/90 border border-emerald-500/50 rounded-lg p-3 font-mono text-xs text-emerald-400 backdrop-blur-md shadow-2xl space-y-4">
      {/* MMU Physical Memory Addresses */}
      <div>
        <div className="flex items-center gap-2 border-b border-emerald-900/60 pb-1.5 mb-2">
          <Database className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-emerald-300 font-orbitron">PHYSICAL MMU MEMORY MAP</span>
        </div>
        <div className="space-y-1.5">
          {memoryAddresses.map((m) => {
            const val = hardware.readMemory(m.addr);
            const isLaserDisabled = m.addr === 0x7FFF00A1 && val === 0x00;
            const isBridgeAligned = m.addr === 0x7FFF00C4 && hardware.isBridgeAligned();

            return (
              <div
                key={m.addr}
                className="flex items-center justify-between p-2 rounded bg-zinc-950/70 border border-zinc-800 hover:border-emerald-700/60 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold">
                      0x{m.addr.toString(16).toUpperCase()}
                    </span>
                    <span className="text-zinc-400 font-semibold">{m.name}</span>
                    <span className="text-[10px] text-zinc-500">[{m.zone}]</span>
                  </div>
                  <div className="text-[10px] text-zinc-500">{m.desc}</div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 block">HEX | BIN</span>
                    <span
                      className={`font-bold ${
                        isLaserDisabled || isBridgeAligned
                          ? 'text-emerald-300'
                          : m.addr === 0x7FFF00A1 && val !== 0
                          ? 'text-rose-400'
                          : 'text-amber-300'
                      }`}
                    >
                      0x{val.toString(16).toUpperCase().padStart(2, '0')} (0b{val.toString(2).padStart(8, '0')})
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* x86-64 General Purpose Registers */}
      <div>
        <div className="flex items-center gap-2 border-b border-emerald-900/60 pb-1.5 mb-2">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-emerald-300 font-orbitron">
            x86-64 GENERAL PURPOSE REGISTERS
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {registersList.slice(0, 8).map(([reg, val]) => (
            <div
              key={reg}
              className="p-1.5 bg-zinc-950/80 rounded border border-zinc-800 text-[10px]"
            >
              <span className="text-zinc-400 font-bold block">{reg}</span>
              <span className="text-emerald-300 font-mono break-all">
                0x{val.toString(16).toUpperCase().padStart(16, '0')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
