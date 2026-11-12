/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Architect's Field Manual & Hardware Documentation
 * Authored by Enes Öztürk — System Architect
 */

import React from 'react';
import { BookOpen, X, Cpu, Terminal, Radio, ShieldCheck, Zap } from 'lucide-react';

interface ArchitectManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectManualModal: React.FC<ArchitectManualModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col bg-zinc-950 border border-emerald-500/70 rounded-xl shadow-[0_0_50px_rgba(16,185,129,0.3)] overflow-hidden font-mono text-xs text-emerald-400">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-zinc-900/90 border-b border-emerald-800/60">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold tracking-wider text-emerald-300 font-orbitron">
                THE ARCHITECT'S CORE — FIELD MANUAL
              </h2>
              <span className="text-[10px] text-zinc-400">
                Author & Creator: Enes Öztürk | Architecture: x86-64 / Vulkan Nano-Engine
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-emerald-300 rounded hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-[11px] leading-relaxed">
          {/* Section 1 */}
          <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-lg">
            <h3 className="text-xs font-bold text-emerald-300 flex items-center gap-2 mb-2 font-orbitron">
              <Cpu className="w-4 h-4 text-emerald-400" /> 1. OYUNUN FELSEFESİ VE KOD YAZARAK SAVAŞMA
            </h3>
            <p className="text-zinc-300 mb-2">
              "The Architect's Core", jenerik oyun mekaniklerini (ateş etme, büyü yapma) tamamen reddeder.
              Karakteriniz <strong>Enes Öztürk</strong>, doğrudan işlemcinin nano düzeydeki fiziksel mimarisinin içine inmiş bir Sistem Mimarı'dır.
              Elinizdeki kuantum terminal, doğrudan makine kodunu gerçek zamanlı derleyip (JIT) fiziksel donanımı manipüle eder.
            </p>
          </div>

          {/* Section 2 */}
          <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded-lg">
            <h3 className="text-xs font-bold text-cyan-300 flex items-center gap-2 mb-2 font-orbitron">
              <Terminal className="w-4 h-4 text-cyan-400" /> 2. GERÇEK ZAMANLI DERLEME (JIT COMPILATION) KURALLARI
            </h3>
            <p className="text-zinc-300 mb-2">
              Terminalde yazdığınız her komut, doğrudan mikroişlemci mikro-koduna dönüştürülür.
              Eğer sözdizimi hatası (Syntax Error) yaparsanız, terminalinizin kapasitörleri aşırı yüklenir,
              ekran parazitlenir ve CPU sıcaklığı tehlikeli derecede yükselir!
            </p>
            <div className="bg-black/80 p-2.5 rounded border border-zinc-800 space-y-1 font-mono text-[10px]">
              <div className="text-emerald-400 font-bold">• MOV [0x7FFF00A1], 0</div>
              <div className="text-zinc-400 pl-3">→ L3 Önbellek Labirenti'ndeki ölümcül lazer bariyerini devreden çıkarır.</div>
              <div className="text-emerald-400 font-bold">• SHL [0x7FFF00C4], 2</div>
              <div className="text-zinc-400 pl-3">→ Sanal Bellek Uçurumu'ndaki 8-bit köprünün verisini 2 bit sola kaydırarak hizalar (01101100 → 10110000).</div>
              <div className="text-emerald-400 font-bold">• XOR [0x7FFF00A1], [0x7FFF00A1]</div>
              <div className="text-zinc-400 pl-3">→ Bellek adresini kendisiyle XOR'layarak sıfırlar (saf makine dili tekniği).</div>
              <div className="text-emerald-400 font-bold">• PEEK 0x7FFF00A1 / POKE 0x7FFF00A1 0x00</div>
              <div className="text-zinc-400 pl-3">→ Bellek adresindeki byte değerini doğrudan okur / yazar.</div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded-lg">
            <h3 className="text-xs font-bold text-amber-300 flex items-center gap-2 mb-2 font-orbitron">
              <Radio className="w-4 h-4 text-amber-400" /> 3. DİJİTAL SİNYAL VE DONANIM AKUSTİĞİ (ANALOG FOLEY)
            </h3>
            <p className="text-zinc-300">
              Oyunun sesleri Web Audio API aracılığıyla sıfırdan ve matematiksel olarak üretilir:
              İşlemciye yük bindikçe (JIT derlemeleri veya sözdizimi hataları sırasında) fanların devri (RPM) ve frekansı dinamik olarak yükselir.
              Yüksek frekanslı bobin vızıltısı (coil whine) ve röle klik sesleri sistemin stabilitesini sesle takip etmenizi sağlar.
            </p>
          </div>

          {/* Section 4 */}
          <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded-lg">
            <h3 className="text-xs font-bold text-emerald-300 flex items-center gap-2 mb-2 font-orbitron">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> 4. KONTROLLER VE HAREKET
            </h3>
            <ul className="list-disc pl-5 text-zinc-300 space-y-1">
              <li><strong>W, A, S, D</strong>: Nano-dünyada hareket</li>
              <li><strong>Space</strong>: Zıplama (veya alt dockta Terminal açma)</li>
              <li><strong>Shift</strong>: Hızlı koşu (Overclock sprint)</li>
              <li><strong>Mouse / Tıklama</strong>: Kamerayı çevirme & Birinci şahıs bakış açısı kilidi (Pointer Lock)</li>
              <li><strong>Tab</strong>: Terminali açma / kapama</li>
              <li><strong>Alt Panel (Dock)</strong>: Sinema modu, bölge ışınlanma, 8-bit şalter paneli ve bellek haritası</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-900/80 border-t border-emerald-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold rounded transition-colors font-orbitron text-xs"
          >
            ANLADIM, SİSTEMİ BAŞLAT
          </button>
        </div>
      </div>
    </div>
  );
};
