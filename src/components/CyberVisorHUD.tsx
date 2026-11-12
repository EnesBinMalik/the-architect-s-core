/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * CyberVisorHUD — "The Architect's Core"
 * Diegetic cyber-visor helmet HUD worn by Enes Öztürk.
 * Features: Linux Kernel Panic & Segfault alerts, voltage-driven visor flutter,
 * real-time analog clock oscilloscope, aim reticle, and ergonomic collapsible bottom dock.
 */

import React from 'react';
import { hardware, HardwareTelemetry, ZoneId } from '../engine/HardwareState';
import { soundEngine } from '../audio/AnalogFoleySynthesizer';
import { SceneInteractionTarget } from '../engine/NanoWorldScene';
import { TerminalConsole } from './TerminalConsole';
import { BitwiseSwitchConsole } from './BitwiseSwitchConsole';
import { MemoryInspector } from './MemoryInspector';
import { ArchitectManualModal } from './ArchitectManualModal';
import {
  Terminal,
  Binary,
  Database,
  HelpCircle,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  Activity,
  Layers,
  Crosshair,
} from 'lucide-react';

interface CyberVisorHUDProps {
  currentTarget: SceneInteractionTarget | null;
  onTeleportZone: (zone: ZoneId) => void;
  isTerminalOpen: boolean;
  setIsTerminalOpen: (open: boolean) => void;
}

export const CyberVisorHUD: React.FC<CyberVisorHUDProps> = ({
  currentTarget,
  onTeleportZone,
  isTerminalOpen,
  setIsTerminalOpen,
}) => {
  const [telemetry, setTelemetry] = React.useState<HardwareTelemetry>(hardware.telemetry);
  const [isDockCollapsed, setIsDockCollapsed] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'TERMINAL' | 'BITWISE' | 'MEMORY' | 'NONE'>('NONE');
  const [isManualOpen, setIsManualOpen] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(soundEngine.getIsMuted());

  // Oscilloscope canvas reference
  const canvasOscRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const unsub = hardware.subscribe((t) => setTelemetry(t));
    return unsub;
  }, []);

  // Sync external terminal toggle
  React.useEffect(() => {
    if (isTerminalOpen) {
      setActiveTab('TERMINAL');
      setIsDockCollapsed(false);
    }
  }, [isTerminalOpen]);

  // Oscilloscope drawing loop
  React.useEffect(() => {
    let animId: number;
    const canvas = canvasOscRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let offset = 0;
    const renderOsc = () => {
      offset += 0.08;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 12) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Bus clock waveform
      ctx.strokeStyle = telemetry.kernelStatus === 'SEGFAULT' ? '#ef4444' : '#10b981';
      ctx.lineWidth = 1.8;
      ctx.beginPath();

      const freqMultiplier = (telemetry.clockGhz / 5.0) * 0.08;
      for (let x = 0; x < w; x++) {
        const noise = (Math.random() - 0.5) * (telemetry.isThrottled ? 8 : 1);
        const y = h / 2 + Math.sin(x * freqMultiplier + offset) * (h / 3) + noise;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      animId = requestAnimationFrame(renderOsc);
    };

    renderOsc();
    return () => cancelAnimationFrame(animId);
  }, [telemetry]);

  const toggleMute = () => {
    const next = !isMuted;
    soundEngine.setMuted(next);
    setIsMuted(next);
  };

  const handleTabClick = (tab: 'TERMINAL' | 'BITWISE' | 'MEMORY') => {
    soundEngine.playKeystroke();
    if (activeTab === tab) {
      setActiveTab('NONE');
      setIsTerminalOpen(false);
    } else {
      setActiveTab(tab);
      setIsTerminalOpen(tab === 'TERMINAL');
      setIsDockCollapsed(false);
    }
  };

  // Visor brightness and chromatic jitter tied to VCORE voltage & faults
  const visorOpacity = Math.min(1.0, 0.85 + (telemetry.vcore - 1.2) * 0.4);

  return (
    <div
      className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between overflow-hidden"
      style={{ opacity: visorOpacity }}
    >
      {/* 1. CRT Scanlines & Cyber Visor Vignette */}
      <div className="absolute inset-0 crt-overlay" />
      <div className="absolute inset-0 visor-vignette" />

      {/* 2. Top Diegetic Visor Bar (Linux Kernel Telemetry & Oscilloscope) */}
      <header className="relative w-full p-3 pointer-events-auto flex items-start justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        {/* Left: Kernel Identification & System Vitals */}
        <div className="flex flex-col space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-orbitron font-bold text-sm tracking-wider text-emerald-300 glow-emerald">
              ENES ÖZTÜRK // ARCHITECT'S CORE
            </span>
            <span className="text-[10px] text-zinc-400 bg-zinc-900/90 px-1.5 py-0.5 rounded border border-emerald-900/60 font-mono">
              Linux EnesOS 6.12.0-core-architect x86_64
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
            <div>
              <span className="text-[10px] text-zinc-500">CLOCK: </span>
              <span className="text-emerald-400 font-bold">{telemetry.clockGhz.toFixed(2)} GHz</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500">VCORE: </span>
              <span className="text-emerald-400 font-bold">{telemetry.vcore.toFixed(2)}V</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500">TEMP: </span>
              <span
                className={`font-bold ${
                  telemetry.temperatureC > 80 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {telemetry.temperatureC.toFixed(1)}°C
              </span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500">TDP: </span>
              <span className="text-emerald-400 font-bold">{telemetry.tdpWatts.toFixed(0)}W</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500">CACHE HIT: </span>
              <span className="text-cyan-400 font-bold">{telemetry.cacheHitRatio.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Right: Bus Clock Frequency Oscilloscope & Audio Mute */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-zinc-500 font-mono flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" /> SYSTEM BUS OSCILLOSCOPE
            </span>
            <div className="border border-emerald-900/80 rounded bg-black/70 p-0.5 shadow-inner">
              <canvas ref={canvasOscRef} width={130} height={32} className="block" />
            </div>
          </div>

          <button
            onClick={toggleMute}
            className="p-2 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-300 border border-zinc-800 rounded transition-colors"
            title={isMuted ? 'Unmute Foley' : 'Mute Foley'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* 3. Center Aim Reticle & Targeted Memory Device Tag */}
      <div className="relative flex-1 flex flex-col items-center justify-center pointer-events-none">
        {/* Reticle Crosshair */}
        <div className="relative w-8 h-8 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full border border-emerald-400/80 bg-emerald-500/20" />
          <div className="absolute top-0 w-0.5 h-1.5 bg-emerald-400/60" />
          <div className="absolute bottom-0 w-0.5 h-1.5 bg-emerald-400/60" />
          <div className="absolute left-0 h-0.5 w-1.5 bg-emerald-400/60" />
          <div className="absolute right-0 h-0.5 w-1.5 bg-emerald-400/60" />
        </div>

        {/* Active Target Banner (When aiming at Laser, Bridge, or Register) */}
        {currentTarget && (
          <div className="mt-3 bg-black/85 border border-cyan-500/70 px-3 py-1.5 rounded text-center backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.3)] max-w-sm">
            <div className="text-[11px] font-bold text-cyan-300 font-orbitron tracking-wider">
              {currentTarget.name}
            </div>
            <div className="text-[10px] text-zinc-400 font-mono">{currentTarget.description}</div>
            <div className="mt-1 text-[9px] text-emerald-400 font-bold font-mono">
              [TAB / SPACE] OPEN TERMINAL TO HACK
            </div>
          </div>
        )}

        {/* Linux Kernel Panic / Segfault Overlay on Laser Contact or Fatal Fault */}
        {telemetry.kernelStatus === 'SEGFAULT' && (
          <div className="absolute top-16 bg-rose-950/90 border border-rose-600 px-4 py-2 rounded text-center shadow-[0_0_30px_rgba(244,63,94,0.6)] animate-pulse">
            <div className="text-xs font-bold text-rose-300 font-orbitron">
              KERNEL PANIC - NOT SYNCING: FATAL MACHINE CHECK EXCEPTION
            </div>
            <div className="text-[10px] font-mono text-rose-200">
              Segmentation fault (core dumped) at 0x7FFF00A1 // Protection Ring Violation
            </div>
          </div>
        )}

        {telemetry.kernelStatus === 'SYNTAX_OVERHEAT' && (
          <div className="absolute top-16 bg-amber-950/90 border border-amber-500 px-4 py-2 rounded text-center shadow-[0_0_30px_rgba(245,158,11,0.5)]">
            <div className="text-xs font-bold text-amber-300 font-orbitron">
              HARDWARE THERMAL THROTTLE: JIT SYNTAX FAULT
            </div>
            <div className="text-[10px] font-mono text-amber-200">
              Microcode execution error. Capacitors discharging, thermal spike +18°C!
            </div>
          </div>
        )}
      </div>

      {/* 4. Unified Collapsible Bottom Control Dock (Ergonomic 3D Three.js UI Layout) */}
      <footer className="relative w-full pb-3 px-4 flex flex-col items-center pointer-events-auto">
        {/* Active Panel Drawer (Terminal, Bitwise Switches, Memory Map) */}
        {activeTab !== 'NONE' && !isDockCollapsed && (
          <div className="w-full max-w-3xl mb-3 h-80 max-h-[45vh] transition-all">
            {activeTab === 'TERMINAL' && <TerminalConsole onClose={() => setActiveTab('NONE')} />}
            {activeTab === 'BITWISE' && <BitwiseSwitchConsole onClose={() => setActiveTab('NONE')} />}
            {activeTab === 'MEMORY' && <MemoryInspector />}
          </div>
        )}

        {/* The Sleek Bottom Glassmorphic Control Dock */}
        <div
          className={`flex items-center gap-2 p-1.5 bg-black/90 border border-emerald-500/40 rounded-xl backdrop-blur-md shadow-2xl transition-all ${
            isDockCollapsed ? 'translate-y-12 opacity-80 hover:opacity-100 hover:translate-y-0' : ''
          }`}
          style={{ maxWidth: 'min(940px, 96vw)' }}
        >
          {/* Collapse / Expand Toggle Button */}
          <button
            onClick={() => setIsDockCollapsed(!isDockCollapsed)}
            className="p-1.5 text-zinc-400 hover:text-emerald-300 rounded hover:bg-zinc-800 transition-colors"
            title={isDockCollapsed ? 'Show Dock' : 'Hide Dock'}
          >
            {isDockCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Tab buttons */}
          <div className="flex items-center gap-1 border-r border-zinc-800 pr-2">
            <button
              onClick={() => handleTabClick('TERMINAL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                activeTab === 'TERMINAL' && !isDockCollapsed
                  ? 'bg-emerald-600 text-black shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : 'bg-zinc-900/70 hover:bg-zinc-800 text-emerald-400 border border-emerald-900/60'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" /> JIT TERMINAL
            </button>

            <button
              onClick={() => handleTabClick('BITWISE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                activeTab === 'BITWISE' && !isDockCollapsed
                  ? 'bg-emerald-600 text-black shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : 'bg-zinc-900/70 hover:bg-zinc-800 text-emerald-400 border border-emerald-900/60'
              }`}
            >
              <Binary className="w-3.5 h-3.5" /> 8-BIT BRIDGE
            </button>

            <button
              onClick={() => handleTabClick('MEMORY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                activeTab === 'MEMORY' && !isDockCollapsed
                  ? 'bg-emerald-600 text-black shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : 'bg-zinc-900/70 hover:bg-zinc-800 text-emerald-400 border border-emerald-900/60'
              }`}
            >
              <Database className="w-3.5 h-3.5" /> MMU MEMORY
            </button>
          </div>

          {/* Quick Zone Teleport Pills */}
          <div className="flex items-center gap-1 border-r border-zinc-800 pr-2">
            <span className="text-[10px] text-zinc-500 font-mono hidden md:inline">ZONES:</span>
            <button
              onClick={() => onTeleportZone('REGISTERS')}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                telemetry.activeZone === 'REGISTERS'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500'
                  : 'text-zinc-400 hover:text-emerald-300 hover:bg-zinc-900'
              }`}
            >
              REGISTERS
            </button>

            <button
              onClick={() => onTeleportZone('CACHE_MATRIX')}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                telemetry.activeZone === 'CACHE_MATRIX'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500'
                  : 'text-zinc-400 hover:text-cyan-300 hover:bg-zinc-900'
              }`}
            >
              L3 CACHE
            </button>

            <button
              onClick={() => onTeleportZone('PAGE_ABYSS')}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                telemetry.activeZone === 'PAGE_ABYSS'
                  ? 'bg-amber-950 text-amber-300 border border-amber-500'
                  : 'text-zinc-400 hover:text-amber-300 hover:bg-zinc-900'
              }`}
            >
              PAGE ABYSS
            </button>
          </div>

          {/* Help & Manual */}
          <button
            onClick={() => setIsManualOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-900/70 hover:bg-zinc-800 text-zinc-300 hover:text-emerald-300 border border-zinc-800 rounded text-xs font-mono transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" /> MANUAL
          </button>
        </div>
      </footer>

      {/* Manual Dialog */}
      <ArchitectManualModal isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} />
    </div>
  );
};
