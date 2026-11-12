/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * "THE ARCHITECT'S CORE" (MİMARIN ÇEKİRDEĞİ)
 * Author & Creator: Enes Öztürk
 * 3D First-Person Cyber-Engineering, JIT Machine Code Compilation & Hardware Hacking.
 */

import React from 'react';
import { NanoWorldScene, SceneInteractionTarget } from './engine/NanoWorldScene';
import { CyberVisorHUD } from './components/CyberVisorHUD';
import { soundEngine } from './audio/AnalogFoleySynthesizer';
import { ZoneId } from './engine/HardwareState';
import { Cpu, Terminal, Play, HelpCircle } from 'lucide-react';

export default function App() {
  const mountRef = React.useRef<HTMLDivElement>(null);
  const sceneRef = React.useRef<NanoWorldScene | null>(null);

  const [currentTarget, setCurrentTarget] = React.useState<SceneInteractionTarget | null>(null);
  const [isTerminalOpen, setIsTerminalOpen] = React.useState(false);
  const [hasStarted, setHasStarted] = React.useState(false);

  // Initialize Three.js NanoWorldScene
  React.useEffect(() => {
    if (!mountRef.current) return;

    const scene = new NanoWorldScene(mountRef.current);
    sceneRef.current = scene;

    scene.onInspectTarget = (target) => {
      setCurrentTarget(target);
    };

    scene.onOpenTerminal = () => {
      setIsTerminalOpen(true);
    };

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  const handleStartGame = () => {
    soundEngine.init();
    soundEngine.resume();
    soundEngine.playJitSuccess();
    setHasStarted(true);
    // Request pointer lock on canvas
    const canvas = mountRef.current?.querySelector('canvas');
    canvas?.requestPointerLock?.();
  };

  const handleTeleportZone = (zone: ZoneId) => {
    sceneRef.current?.teleportToZone(zone);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none font-mono">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 z-0 w-full h-full cursor-crosshair" />

      {/* Diegetic Cyber-Visor HUD Overlay */}
      {hasStarted && (
        <CyberVisorHUD
          currentTarget={currentTarget}
          onTeleportZone={handleTeleportZone}
          isTerminalOpen={isTerminalOpen}
          setIsTerminalOpen={setIsTerminalOpen}
        />
      )}

      {/* Intro Launch / First-Person Calibration Screen */}
      {!hasStarted && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-md p-6">
          <div className="max-w-xl w-full bg-zinc-950/90 border border-emerald-500/80 rounded-2xl p-7 shadow-[0_0_60px_rgba(16,185,129,0.3)] text-center space-y-6">
            <div className="flex items-center justify-center gap-3">
              <div className="p-3 bg-emerald-950/80 border border-emerald-600/60 rounded-xl">
                <Cpu className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="text-left">
                <h1 className="text-xl md:text-2xl font-black tracking-widest text-emerald-300 font-orbitron">
                  THE ARCHITECT'S CORE
                </h1>
                <p className="text-xs text-zinc-400 font-mono tracking-wider">
                  MİMARIN ÇEKİRDEĞİ // ENES ÖZTÜRK İMZALI ŞAHESER
                </p>
              </div>
            </div>

            <div className="p-4 bg-emerald-950/20 border border-emerald-900/50 rounded-xl text-left text-xs leading-relaxed text-zinc-300 space-y-2">
              <p>
                <strong>Hoş geldiniz, Sistem Mimarı Enes Öztürk.</strong> Kuantum işlemcinin nano
                mimarisindesiniz. Bu dünyada jenerik ateş etme veya büyü mekanikleri yoktur; engelleri
                aşmak için <strong>gerçek zamanlı x86-64 makine kodları</strong> derleyeceksiniz.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-emerald-400/90 text-[11px]">
                <li><strong>W, A, S, D</strong> ile nano-seviye işlemci mimarisinde hareket edin.</li>
                <li><strong>Mouse</strong> ile bakın, tıklayarak kamerayı kilitleyin (Pointer Lock).</li>
                <li><strong>TAB</strong> tuşuyla Kuantum Terminali açın ve JIT komutları derleyin.</li>
                <li><strong>0x7FFF00A1</strong> lazer barikatını ve <strong>8-Bit Köprüyü</strong> aşın.</li>
              </ul>
            </div>

            <button
              onClick={handleStartGame}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-black font-black text-sm tracking-wider font-orbitron rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-black" /> DONANIM BAĞLANTISINI KUR & BAŞLA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
