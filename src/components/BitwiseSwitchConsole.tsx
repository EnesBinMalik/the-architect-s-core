/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Bitwise Switch Console — "The Architect's Core"
 * 8-Bit hardware logic gate and bit switch array for memory address 0x7FFF00C4.
 * Demonstrates assembly bit manipulation (SHL, SHR, AND, OR, XOR, NOT).
 */

import React from 'react';
import { hardware } from '../engine/HardwareState';
import { soundEngine } from '../audio/AnalogFoleySynthesizer';
import { Binary, ArrowLeft, ArrowRight, Zap, CheckCircle2, AlertTriangle } from 'lucide-react';

interface BitwiseSwitchConsoleProps {
  onClose?: () => void;
}

export const BitwiseSwitchConsole: React.FC<BitwiseSwitchConsoleProps> = () => {
  const [bridgeByte, setBridgeByte] = React.useState<number>(hardware.getBridgeByte());
  const isAligned = hardware.isBridgeAligned();

  React.useEffect(() => {
    const unsub = hardware.subscribe(() => {
      setBridgeByte(hardware.getBridgeByte());
    });
    return unsub;
  }, []);

  const toggleBit = (bitIndex: number) => {
    const currentBit = ((bridgeByte >> bitIndex) & 1) as 0 | 1;
    const newBit = currentBit === 1 ? 0 : 1;
    hardware.setBridgeBit(7 - bitIndex, newBit);
    soundEngine.playRelayClick(newBit === 1);
  };

  const handleShift = (dir: 'LEFT' | 'RIGHT') => {
    hardware.shiftBridge(dir, dir === 'LEFT' ? 2 : 1);
    soundEngine.playJitSuccess();
  };

  const handleInvert = () => {
    hardware.writeMemory(0x7FFF00C4, (~bridgeByte) & 0xFF);
    soundEngine.playRelayClick(true);
  };

  const handleSetTarget = () => {
    // 0xB0 = 10110000 = 176
    hardware.writeMemory(0x7FFF00C4, 0xB0);
    soundEngine.playJitSuccess();
  };

  return (
    <div className="bg-black/85 border border-emerald-500/50 rounded-lg p-4 font-mono text-xs text-emerald-400 backdrop-blur-md shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-emerald-900/60 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <Binary className="w-4 h-4 text-emerald-400" />
          <span className="font-bold tracking-wider text-emerald-300 font-orbitron">
            8-BIT QUANTUM BRIDGE LOGIC CONSOLE [0x7FFF00C4]
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isAligned ? (
            <span className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-600/40">
              <CheckCircle2 className="w-3.5 h-3.5" /> BRIDGE LOCKED (ALIGNED)
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-400 font-bold bg-amber-950/80 px-2 py-0.5 rounded border border-amber-600/40">
              <AlertTriangle className="w-3.5 h-3.5" /> MISALIGNED (CHASM OPEN)
            </span>
          )}
        </div>
      </div>

      {/* Binary Switch Array */}
      <div className="grid grid-cols-8 gap-2 mb-4">
        {[7, 6, 5, 4, 3, 2, 1, 0].map((bitIdx) => {
          const bitVal = (bridgeByte >> bitIdx) & 1;
          const targetBitVal = (0b10110000 >> bitIdx) & 1;
          const matches = bitVal === targetBitVal;

          return (
            <div
              key={bitIdx}
              onClick={() => toggleBit(bitIdx)}
              className={`cursor-pointer flex flex-col items-center justify-between p-2 rounded border transition-all ${
                bitVal === 1
                  ? 'bg-emerald-950/70 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                  : 'bg-zinc-950/80 border-zinc-800 text-zinc-500 hover:border-emerald-600'
              }`}
            >
              <span className="text-[10px] text-zinc-400">b{bitIdx}</span>
              <span className={`text-2xl font-bold my-1 font-orbitron ${bitVal === 1 ? 'text-emerald-300' : 'text-zinc-600'}`}>
                {bitVal}
              </span>
              <div className="w-full flex items-center justify-center pt-1 border-t border-zinc-800">
                <span className={`text-[9px] ${matches ? 'text-emerald-400' : 'text-amber-500'}`}>
                  req:{targetBitVal}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Numerical Data & Operations */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950/60 p-2.5 rounded border border-emerald-950">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-zinc-500 text-[10px] block">BIN</span>
            <span className="font-bold text-emerald-300">
              {bridgeByte.toString(2).padStart(8, '0')}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 text-[10px] block">HEX</span>
            <span className="font-bold text-emerald-300">
              0x{bridgeByte.toString(16).toUpperCase().padStart(2, '0')}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 text-[10px] block">DEC</span>
            <span className="font-bold text-emerald-300">{bridgeByte}</span>
          </div>
          <div className="border-l border-zinc-800 pl-3">
            <span className="text-zinc-500 text-[10px] block">TARGET</span>
            <span className="font-bold text-cyan-400">10110000 (0xB0 / 176)</span>
          </div>
        </div>

        {/* Quick Bitwise Operations */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleShift('LEFT')}
            title="SHL 2: Sola 2 bit kaydır (01101100 -> 10110000)"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 border border-emerald-700/50 rounded transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> SHL 2
          </button>
          <button
            onClick={() => handleShift('RIGHT')}
            title="SHR 1: Sağa 1 bit kaydır"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded transition-colors"
          >
            SHR 1 <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleInvert}
            title="NOT: Bitleri tersine çevir"
            className="px-2.5 py-1.5 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded transition-colors"
          >
            NOT
          </button>
          <button
            onClick={handleSetTarget}
            title="MOV [0x7FFF00C4], 0xB0"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-600/50 rounded transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" /> LOCK 0xB0
          </button>
        </div>
      </div>
    </div>
  );
};
