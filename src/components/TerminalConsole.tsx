/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Quantum Terminal Console — "The Architect's Core"
 * Handcrafted JIT execution console held by System Architect Enes Öztürk.
 * Features strict assembly validation, cycle telemetry, and zero auto-complete.
 */

import React from 'react';
import { JITCompiler, CompilationResult } from '../engine/JITCompiler';
import { hardware } from '../engine/HardwareState';
import { soundEngine } from '../audio/AnalogFoleySynthesizer';
import { Terminal, Send, Cpu, Trash2, HelpCircle } from 'lucide-react';

interface TerminalConsoleProps {
  onClose?: () => void;
}

interface LogEntry {
  type: 'INPUT' | 'OUTPUT' | 'ERROR';
  text: string;
  opcodesHex?: string;
  cycles?: number;
  timestamp: string;
}

export const TerminalConsole: React.FC<TerminalConsoleProps> = () => {
  const [inputVal, setInputVal] = React.useState('');
  const [history, setHistory] = React.useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = React.useState<number>(-1);
  const [logs, setLogs] = React.useState<LogEntry[]>([
    {
      type: 'OUTPUT',
      text: 'ARCHITECT QUANTUM TERMINAL v26.4 (Enes Öztürk)\nConnected to Physical Silicon Core Bus. JIT Compiler Ready.\nType assembly commands (e.g. MOV, XOR, SHL) or HELP.',
      timestamp: '00:00:01',
    },
  ]);

  const bottomRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const executeCommand = (cmdStr: string) => {
    const trimmed = cmdStr.trim();
    if (!trimmed) return;

    soundEngine.playKeystroke();
    const time = new Date().toLocaleTimeString();

    if (trimmed.toUpperCase() === 'CLEAR') {
      setLogs([]);
      setInputVal('');
      return;
    }

    const res: CompilationResult = JITCompiler.compile(trimmed);

    const newLogs: LogEntry[] = [
      ...logs,
      {
        type: 'INPUT',
        text: `>> ${trimmed}`,
        timestamp: time,
      },
      {
        type: res.success ? 'OUTPUT' : 'ERROR',
        text: res.message,
        opcodesHex: res.opcodesHex,
        cycles: res.cycles,
        timestamp: time,
      },
    ];

    setLogs(newLogs);
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIdx(-1);
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    soundEngine.playKeystroke();

    if (e.key === 'Enter') {
      executeCommand(inputVal);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(nextIdx);
      setInputVal(history[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx === -1) return;
      const nextIdx = historyIdx + 1;
      if (nextIdx >= history.length) {
        setHistoryIdx(-1);
        setInputVal('');
      } else {
        setHistoryIdx(nextIdx);
        setInputVal(history[nextIdx]);
      }
    }
  };

  const quickMacros = [
    { label: 'DISARM LASER [0x7FFF00A1]', cmd: 'MOV [0x7FFF00A1], 0' },
    { label: 'ALIGN BRIDGE (SHL 2)', cmd: 'SHL [0x7FFF00C4], 2' },
    { label: 'XOR LASER ZERO', cmd: 'XOR [0x7FFF00A1], [0x7FFF00A1]' },
    { label: 'PEEK LASER ADDR', cmd: 'PEEK 0x7FFF00A1' },
    { label: 'INSPECT BRIDGE', cmd: 'INSPECT BRIDGE' },
    { label: 'DUMP REGISTERS', cmd: 'INSPECT REGS' },
    { label: 'HELP MANUAL', cmd: 'HELP' },
  ];

  return (
    <div className="flex flex-col h-full bg-black/90 border border-emerald-500/60 rounded-lg p-3 font-mono text-xs text-emerald-400 backdrop-blur-md shadow-[0_0_25px_rgba(16,185,129,0.2)]">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between border-b border-emerald-900/60 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-bold tracking-widest text-emerald-300 font-orbitron">
            ENES ÖZTÜRK QUANTUM TERMINAL [JIT CORE]
          </span>
          <span className="text-[10px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-700/50">
            x86-64 NATIVE
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLogs([])}
            className="hover:text-emerald-200 p-1 transition-colors"
            title="Clear Buffer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Macro Command Chips */}
      <div className="flex flex-wrap gap-1.5 pb-2 mb-2 border-b border-zinc-900/80">
        {quickMacros.map((m, i) => (
          <button
            key={i}
            onClick={() => executeCommand(m.cmd)}
            className="px-2 py-0.5 bg-zinc-900/90 hover:bg-emerald-950/80 text-emerald-400/90 hover:text-emerald-300 border border-emerald-900/50 hover:border-emerald-600 rounded text-[10px] transition-all"
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Terminal Output Scroll Area */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 mb-2 font-mono text-[11px] leading-relaxed">
        {logs.map((log, idx) => (
          <div
            key={idx}
            className={`p-1.5 rounded border ${
              log.type === 'INPUT'
                ? 'bg-zinc-950/80 border-zinc-800 text-cyan-300'
                : log.type === 'ERROR'
                ? 'bg-rose-950/40 border-rose-600/70 text-rose-300 glow-rose'
                : 'bg-emerald-950/30 border-emerald-900/40 text-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between text-[9px] text-zinc-500 mb-0.5">
              <span>{log.timestamp}</span>
              {log.opcodesHex && (
                <span className="text-amber-400/90 font-bold">
                  OPCODES: [{log.opcodesHex}] {log.cycles ? `• ${log.cycles}c` : ''}
                </span>
              )}
            </div>
            <pre className="whitespace-pre-wrap break-all font-mono">{log.text}</pre>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Command Input Field */}
      <div className="flex items-center gap-2 bg-zinc-950/90 border border-emerald-600/60 rounded px-2.5 py-1.5 focus-within:border-emerald-400 focus-within:shadow-[0_0_12px_rgba(16,185,129,0.3)]">
        <span className="text-emerald-400 font-bold select-none">&gt;&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type assembly e.g. MOV [0x7FFF00A1], 0 or SHL [0x7FFF00C4], 2..."
          className="flex-1 bg-transparent text-emerald-200 outline-none placeholder:text-zinc-600 font-mono text-xs"
          spellCheck={false}
          autoComplete="off"
        />
        <button
          onClick={() => executeCommand(inputVal)}
          className="px-2 py-1 bg-emerald-900/60 hover:bg-emerald-700 text-emerald-200 rounded border border-emerald-600/50 transition-colors flex items-center gap-1"
        >
          <Send className="w-3 h-3" /> JIT EXEC
        </button>
      </div>
    </div>
  );
};
