/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Procedural Texture Generator — "The Architect's Core"
 * Pure mathematical / HTML5 Canvas textures for silicon wafer micro-die,
 * etched copper traces, register monolithic columns, and laser warning decals.
 * Zero external file dependencies (100% procedural).
 */

import * as THREE from 'three';

export class ProceduralTextures {
  /**
   * Silicon wafer substrate with etched circuit traces and micro-vias
   */
  public static createSiliconCircuitTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Dark silicon substrate (P-doped monocrystalline silicon)
    ctx.fillStyle = '#060a08';
    ctx.fillRect(0, 0, 1024, 1024);

    // Grid lines (interconnect buses)
    ctx.strokeStyle = '#0f291e';
    ctx.lineWidth = 1.5;
    const step = 64;
    for (let x = 0; x < 1024; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }
    for (let y = 0; y < 1024; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    // Etched copper circuit lines
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 4;

    const traces = [
      [[64, 128], [256, 128], [320, 192], [512, 192]],
      [[128, 512], [128, 384], [256, 256], [400, 256]],
      [[512, 768], [640, 768], [768, 640], [896, 640]],
      [[256, 896], [384, 896], [512, 1024]],
      [[700, 100], [850, 100], [900, 150], [900, 400]],
      [[400, 400], [600, 400], [600, 600]],
    ];

    traces.forEach((points) => {
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0], points[i][1]);
      }
      ctx.stroke();
    });

    // Gold / Copper Micro-Vias & Contact Pads
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f59e0b';
    for (let x = 32; x < 1024; x += 128) {
      for (let y = 32; y < 1024; y += 128) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Outer ring
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Register Pillar Texture (RAX, RBX, etc. etched with binary & assembly markings)
   */
  public static createRegisterPillarTexture(regName: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Dark brushed titanium column base
    ctx.fillStyle = '#0a0d0c';
    ctx.fillRect(0, 0, 512, 1024);

    // Beveled border lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 492, 1004);

    // Center header with register name
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(20, 20, 472, 120);

    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 64px "Orbitron", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(regName, 256, 80);

    // Bus lines and register cells
    ctx.font = '18px "Fira Code", monospace';
    ctx.textAlign = 'left';

    const words = [
      '0x7FFF0000_E8A1',
      'MOV [RSP], RAX',
      'XOR RAX, RAX',
      'PUSH RBP',
      '0b1101_0010_1010',
      '0xDEADBEEF_C001',
      'L3_LINE: HIT_98%',
      'CLOCK: 5.42GHz',
      'SYS_CALL 0x01',
      'RETQ',
      'VCORE: 1.28V',
    ];

    let y = 180;
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#10b981' : '#059669';
      const text = words[i % words.length];
      ctx.fillText(`[${i.toString(16).padStart(2, '0')}] ${text}`, 40, y);

      // Status indicator bit
      ctx.fillStyle = i % 3 === 0 ? '#38bdf8' : '#047857';
      ctx.fillRect(440, y - 14, 16, 16);

      // Separator line
      ctx.strokeStyle = '#134e4a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(30, y + 15);
      ctx.lineTo(480, y + 15);
      ctx.stroke();

      y += 44;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Crystalline L3 Cache Mirror Wall Texture
   */
  public static createCacheMatrixTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, 512, 512);

    // Hexagonal crystal silicon cells
    const hexRadius = 48;
    const h = hexRadius * Math.sin(Math.PI / 3);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;

    for (let row = -1; row < 12; row++) {
      for (let col = -1; col < 12; col++) {
        const x = col * hexRadius * 1.5;
        const y = row * 2 * h + (col % 2 === 0 ? 0 : h);

        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const px = x + hexRadius * Math.cos(angle);
          const py = y + hexRadius * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        // Inner cache tag dot
        ctx.fillStyle = (row + col) % 4 === 0 ? '#38bdf8' : '#075985';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * High-Voltage Hazard Stripe Warning Decal
   */
  public static createHazardDecalTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#f59e0b'; // Amber
    ctx.fillRect(0, 0, 512, 128);

    // Diagonal black stripes
    ctx.fillStyle = '#0a0a0a';
    const stripeWidth = 32;
    for (let x = -128; x < 512 + 128; x += stripeWidth * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + stripeWidth, 0);
      ctx.lineTo(x + stripeWidth + 64, 128);
      ctx.lineTo(x + 64, 128);
      ctx.closePath();
      ctx.fill();
    }

    // Text in center
    ctx.fillStyle = '#000000';
    ctx.fillRect(100, 32, 312, 64);
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 24px "Orbitron", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('0x7FFF00A1 DANGER', 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Radial contact shadow texture
   */
  public static createContactShadowTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.4)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }
}
