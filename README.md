# The Architect's Core

![The Architect's Core — kapak](docs/kapak.svg)

<p align="center"><img src="docs/rozet.svg" alt="Enes Öztürk imza rozeti" width="180" /></p>

<p align="center"><b>GÖZ BEBEĞİ PROJESİ</b> · SİBER-MÜHENDİSLİK · 3D · BİRİNCİ ŞAHIS</p>

---

Birinci şahıs siber-mühendislik oyunu: 3D nano-dünyada donanım hackle, makine dili derle, belleği denetle.

## Öne çıkanlar

- **JIT derleyici** — `src/engine/JITCompiler.ts` ile canlı assembly çalıştırma
- **Nano-dünya sahnesi** — `NanoWorldScene.ts` ile prosedürel 3D donanım evreni
- **Donanım durumu** — `HardwareState.ts` ile kayıt/bellek modeli
- **Terminal konsolu** — `TerminalConsole` üzerinden komut satırı
- **Bellek denetçisi** — `MemoryInspector` ile adres adres gezinme
- **Siber vizör HUD** — `CyberVisorHUD` ve `BitwiseSwitchConsole`

## Teknoloji

React · TypeScript · Three.js · Vite · Motion · Tailwind CSS

## Kurulum ve çalıştırma

```bash
npm install
npm run dev        # http://localhost:3000
```

| Komut | Ne yapar |
| --- | --- |
| `npm install` | bağımlılıkları kurar |
| `npm run dev` | geliştirme sunucusunu açar |
| `npm run build` | üretim derlemesi üretir |
| `npm run lint` | tip denetimi (`tsc --noEmit`) |

## Proje yapısı

```
the-architect's-core/
├── index.html
├── package.json
├── vite.config.ts
├── docs/
│   ├── kapak.svg        # sinematik kapak
│   └── rozet.svg        # premium imza rozeti
└── src/
```

## Lisans ve telif

Bu proje **MIT Lisansı** ile yayınlanmıştır.

> © 2026 **Enes Öztürk** — tüm hakları saklıdır.
> Tasarım, kod ve görseller Enes Öztürk'e aittir. İzinsiz ticari kullanım yapılamaz.

[MIT Lisansı metni →](LICENSE)

---

<div align="center"><sub>
<a href="https://github.com/EnesBinMalik">github.com/EnesBinMalik</a> · 
imzalı bir <b>Enes Öztürk</b> projesi
</sub></div>
