/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NanoWorldScene — "The Architect's Core" 3D Engine
 * First-person 3D cyber-engineering nano-world inside the CPU & motherboard.
 * Features: Registers of Doom, L3 Cache Matrix with Laser Barricade (0x7FFF00A1),
 * Page Fault Abyss 8-Bit Quantum Bridge (0x7FFF00C4), and handheld Quantum Terminal.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { hardware } from './HardwareState';
import { soundEngine } from '../audio/AnalogFoleySynthesizer';
import { ProceduralTextures } from './ProceduralTextures';

export interface SceneInteractionTarget {
  name: string;
  type: 'TERMINAL' | 'LASER' | 'BRIDGE_SWITCH' | 'REGISTER' | 'CACHE_NODE';
  description: string;
  addressHex?: string;
  bitIndex?: number;
}

export class NanoWorldScene {
  private container: HTMLDivElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private frameId: number = 0;
  private isSoftwareGl: boolean = false;

  // Player state
  private playerPos: THREE.Vector3 = new THREE.Vector3(0, 1.8, 18);
  private playerVel: THREE.Vector3 = new THREE.Vector3();
  private cameraPitch: number = 0;
  private cameraYaw: number = 0;
  private keysPressed: Record<string, boolean> = {};
  private isPointerLocked: boolean = false;
  private isGrounded: boolean = true;

  // 3D Objects
  private handheldTerminal!: THREE.Group;
  private laserBeamMesh!: THREE.Mesh;
  private laserPylonGroup!: THREE.Group;
  private laserLight!: THREE.PointLight;
  private bridgeSlabs: THREE.Group[] = [];
  private busParticles!: THREE.Points;
  private busParticlePositions!: Float32Array;
  private registerPillars: THREE.Group[] = [];
  private interactableObjects: THREE.Object3D[] = [];
  private raycaster: THREE.Raycaster = new THREE.Raycaster();

  // Callbacks
  public onInspectTarget?: (target: SceneInteractionTarget | null) => void;
  public onOpenTerminal?: () => void;

  constructor(container: HTMLDivElement) {
    this.container = container;

    // 1. Detect software WebGL
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Setup Three.js Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.container.appendChild(this.renderer.domElement);

    // 3. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020504);
    this.scene.fog = new THREE.FogExp2(0x020504, 0.015);

    this.camera = new THREE.PerspectiveCamera(
      70,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      600
    );
    this.camera.position.copy(this.playerPos);

    this.clock = new THREE.Clock();

    // 4. Setup Lighting & Studio Environment
    this.setupLighting();

    // 5. Build Nano Silicon Micro-World
    this.buildWorld();

    // 6. Build Handheld Quantum Terminal (First-person weapon/tool)
    this.buildHandheldTerminal();

    // 7. Event listeners
    this.setupInputHandlers();

    // 8. Start Render Loop
    this.startLoop();
  }

  private setupLighting() {
    // Studio Environment reflection
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Cool hemisphere fill light (Motherboard green to silicon ambient)
    const hemiLight = new THREE.HemisphereLight(0x10b981, 0x020b08, 0.6);
    this.scene.add(hemiLight);

    // Key directional light (Silicon Foundry spotlight)
    const keyLight = new THREE.DirectionalLight(0xdcfce7, 1.8);
    keyLight.position.set(30, 60, 20);
    if (!this.isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 10;
      keyLight.shadow.camera.far = 150;
      const d = 50;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(keyLight);

    // Cyan accent light in L3 Cache
    const cacheLight = new THREE.PointLight(0x06b6d4, 2.5, 60);
    cacheLight.position.set(-35, 12, -40);
    this.scene.add(cacheLight);

    // Amber accent light in Page Fault Abyss
    const abyssLight = new THREE.PointLight(0xf59e0b, 2.0, 70);
    abyssLight.position.set(40, 8, -40);
    this.scene.add(abyssLight);
  }

  private buildWorld() {
    // 1. Silicon Motherboard Floor Substrate
    const floorGeo = new THREE.PlaneGeometry(300, 300);
    const siliconTex = ProceduralTextures.createSiliconCircuitTexture();
    const floorMat = new THREE.MeshStandardMaterial({
      map: siliconTex,
      roughness: 0.35,
      metalness: 0.65,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = !this.isSoftwareGl;
    this.scene.add(floor);

    // 2. Zone 1: The Registers of Doom (Kayıtçı Tapınakları)
    this.buildRegistersOfDoom();

    // 3. Zone 2: L3 Cache Matrix (L3 Önbellek Labirenti) & Laser Barricade
    this.buildL3CacheMatrix();

    // 4. Zone 3: The Page Fault Abyss (Sanal Bellek Uçurumu) & 8-Bit Bridge
    this.buildPageFaultAbyss();

    // 5. Electron Bus Particles (Data flowing across copper traces)
    this.buildElectronBusParticles();
  }

  /**
   * Zone 1: The Registers of Doom (Kayıtçı Tapınakları)
   * High-speed monolithic glowing pillars (RAX, RBX, RCX, RDX, RSP, RBP, RSI, RDI)
   */
  private buildRegistersOfDoom() {
    const regNames = ['RAX', 'RBX', 'RCX', 'RDX', 'RSI', 'RDI', 'RSP', 'RBP'];
    const colSpacing = 9;

    regNames.forEach((name, idx) => {
      const regGroup = new THREE.Group();
      const x = (idx - 3.5) * colSpacing;
      const z = -5;

      // Primary pillar silhouette (3-part assembly: Base, Main Column, Crown Fin)
      const colHeight = 24 + (idx % 3) * 4;

      // Base
      const baseGeo = new THREE.BoxGeometry(4.2, 1.5, 4.2);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.85,
        roughness: 0.25,
      });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 0.75;
      base.castShadow = !this.isSoftwareGl;
      base.receiveShadow = !this.isSoftwareGl;
      regGroup.add(base);

      // Main Monolithic Pillar
      const colGeo = new THREE.BoxGeometry(3.2, colHeight, 3.2);
      const regTex = ProceduralTextures.createRegisterPillarTexture(name);
      const colMat = new THREE.MeshStandardMaterial({
        map: regTex,
        roughness: 0.2,
        metalness: 0.75,
      });
      const colMesh = new THREE.Mesh(colGeo, colMat);
      colMesh.position.y = colHeight / 2 + 1.5;
      colMesh.castShadow = !this.isSoftwareGl;
      colMesh.receiveShadow = !this.isSoftwareGl;
      regGroup.add(colMesh);

      // Crown Emitter / Heatsink Fin
      const crownGeo = new THREE.BoxGeometry(3.6, 1.2, 3.6);
      const crownMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x065f46,
        emissiveIntensity: 0.6,
        roughness: 0.15,
        metalness: 0.9,
      });
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.y = colHeight + 2.1;
      regGroup.add(crown);

      // Interactive terminal pedestal in front of RAX and RBX
      if (idx === 0 || idx === 1) {
        const consoleGeo = new THREE.CylinderGeometry(0.6, 0.8, 1.2, 8);
        const consoleMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.2, metalness: 0.8 });
        const consoleMesh = new THREE.Mesh(consoleGeo, consoleMat);
        consoleMesh.position.set(0, 0.6, 3);
        consoleMesh.userData = {
          interactive: true,
          target: {
            name: `Register ${name} Node`,
            type: 'REGISTER',
            description: `Primary CPU ${name} Register. Value: 0x${hardware.registers[name as keyof typeof hardware.registers].toString(16).toUpperCase()}`,
          } as SceneInteractionTarget,
        };
        regGroup.add(consoleMesh);
        this.interactableObjects.push(consoleMesh);
      }

      regGroup.position.set(x, 0, z);
      this.scene.add(regGroup);
      this.registerPillars.push(regGroup);
    });
  }

  /**
   * Zone 2: L3 Cache Matrix (L3 Önbellek Labirenti)
   * Mirror silicon maze + Lethal Laser Barricade (0x7FFF00A1)
   */
  private buildL3CacheMatrix() {
    const cacheGroup = new THREE.Group();
    cacheGroup.position.set(-45, 0, -45);

    const cacheTex = ProceduralTextures.createCacheMatrixTexture();
    const wallMat = new THREE.MeshStandardMaterial({
      map: cacheTex,
      roughness: 0.15,
      metalness: 0.85,
    });

    // Maze walls
    const wallConfigs = [
      { x: 0, z: -15, w: 25, d: 2, h: 10 },
      { x: -12, z: 0, w: 2, d: 30, h: 10 },
      { x: 12, z: 5, w: 2, d: 20, h: 10 },
      { x: 0, z: 15, w: 25, d: 2, h: 10 },
    ];

    wallConfigs.forEach((cfg) => {
      const geo = new THREE.BoxGeometry(cfg.w, cfg.h, cfg.d);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(cfg.x, cfg.h / 2, cfg.z);
      mesh.castShadow = !this.isSoftwareGl;
      mesh.receiveShadow = !this.isSoftwareGl;
      cacheGroup.add(mesh);
    });

    // Crystalline Cache tag cubes
    for (let i = 0; i < 6; i++) {
      const cubeGeo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
      const cubeMat = new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.4,
        roughness: 0.1,
        metalness: 0.2,
        transmission: this.isSoftwareGl ? 0 : 0.8,
        transparent: true,
        opacity: 0.85,
      });
      const cube = new THREE.Mesh(cubeGeo, cubeMat);
      cube.position.set(-6 + (i % 3) * 6, 2.5 + (i > 2 ? 2 : 0), -5 + Math.floor(i / 3) * 10);
      cube.userData = {
        interactive: true,
        target: {
          name: `L3 Cache Line Tag 0x${(i * 16).toString(16).toUpperCase()}`,
          type: 'CACHE_NODE',
          description: 'High-speed SRAM crystal. Cache Miss rate: 1.3%. Direct mapped to System Bus.',
        } as SceneInteractionTarget,
      };
      cacheGroup.add(cube);
      this.interactableObjects.push(cube);
    }

    // LASER BARRICADE (0x7FFF00A1)
    // Guarding the entry to the Core Gateway
    this.laserPylonGroup = new THREE.Group();
    this.laserPylonGroup.position.set(0, 0, 0);

    // Left and right metallic emitter pylons with caution hazard decals
    const pylonGeo = new THREE.BoxGeometry(1.4, 7, 1.4);
    const pylonMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.2,
    });

    const leftPylon = new THREE.Mesh(pylonGeo, pylonMat);
    leftPylon.position.set(-6, 3.5, 0);
    this.laserPylonGroup.add(leftPylon);

    const rightPylon = new THREE.Mesh(pylonGeo, pylonMat);
    rightPylon.position.set(6, 3.5, 0);
    this.laserPylonGroup.add(rightPylon);

    // Hazard decal banner
    const hazardGeo = new THREE.PlaneGeometry(5, 1.2);
    const hazardTex = ProceduralTextures.createHazardDecalTexture();
    const hazardMat = new THREE.MeshStandardMaterial({
      map: hazardTex,
      roughness: 0.4,
      metalness: 0.2,
    });
    const hazardMesh = new THREE.Mesh(hazardGeo, hazardMat);
    hazardMesh.position.set(0, 6.2, 0);
    this.laserPylonGroup.add(hazardMesh);

    // The Lethal Laser Beam itself (Cylinder stretched horizontally across)
    const beamGeo = new THREE.CylinderGeometry(0.2, 0.2, 12, 16);
    const beamMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xff0044,
      emissiveIntensity: 3.5,
      roughness: 0.1,
      metalness: 0.9,
    });
    this.laserBeamMesh = new THREE.Mesh(beamGeo, beamMat);
    this.laserBeamMesh.rotation.z = Math.PI / 2;
    this.laserBeamMesh.position.set(0, 3, 0);
    this.laserPylonGroup.add(this.laserBeamMesh);

    // Point light radiating from the laser
    this.laserLight = new THREE.PointLight(0xff0044, 4, 16);
    this.laserLight.position.set(0, 3, 0);
    this.laserPylonGroup.add(this.laserLight);

    // Interactive target for inspecting laser
    const laserSensorGeo = new THREE.BoxGeometry(2, 2, 2);
    const sensorMat = new THREE.MeshBasicMaterial({ visible: false });
    const laserSensor = new THREE.Mesh(laserSensorGeo, sensorMat);
    laserSensor.position.set(0, 3, 0);
    laserSensor.userData = {
      interactive: true,
      target: {
        name: 'High-Flux Laser Barricade [0x7FFF00A1]',
        type: 'LASER',
        addressHex: '0x7FFF00A1',
        description: 'Lethal ionic barrier tied to memory address 0x7FFF00A1. Execute "MOV [0x7FFF00A1], 0" in terminal to collapse!',
      } as SceneInteractionTarget,
    };
    this.laserPylonGroup.add(laserSensor);
    this.interactableObjects.push(laserSensor);

    cacheGroup.add(this.laserPylonGroup);
    this.scene.add(cacheGroup);
  }

  /**
   * Zone 3: The Page Fault Abyss (Sanal Bellek Uçurumu)
   * Deep void canyon where gravity shifts and 8 floating data blocks form an 8-bit bridge.
   * Address 0x7FFF00C4 controls bit alignment!
   */
  private buildPageFaultAbyss() {
    const abyssGroup = new THREE.Group();
    abyssGroup.position.set(45, 0, -45);

    // Create the deep abyss canyon hole
    // Sub-chasm depth plane
    const abyssPitGeo = new THREE.PlaneGeometry(35, 60);
    const pitMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const pitMesh = new THREE.Mesh(abyssPitGeo, pitMat);
    pitMesh.rotation.x = -Math.PI / 2;
    pitMesh.position.set(0, -15, 0);
    abyssGroup.add(pitMesh);

    // Surrounding rocky silicon cliffs
    const cliffMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.3,
    });

    const leftCliff = new THREE.Mesh(new THREE.BoxGeometry(6, 12, 50), cliffMat);
    leftCliff.position.set(-16, 0, 0);
    abyssGroup.add(leftCliff);

    const rightCliff = new THREE.Mesh(new THREE.BoxGeometry(6, 12, 50), cliffMat);
    rightCliff.position.set(16, 0, 0);
    abyssGroup.add(rightCliff);

    // THE 8-BIT QUANTUM BRIDGE:
    // 8 distinct floating platform slabs, representing bits 7, 6, 5, 4, 3, 2, 1, 0.
    // Length: spans across the 40-unit canyon.
    const slabLength = 4.2;
    const slabWidth = 4.0;
    const startZ = -18;

    for (let i = 0; i < 8; i++) {
      const bitIndex = 7 - i; // Bit 7 down to Bit 0
      const slabGroup = new THREE.Group();
      const z = startZ + i * (slabLength + 0.8);

      // Platform block (3-part composite)
      const blockGeo = new THREE.BoxGeometry(slabWidth, 1.2, slabLength);
      const blockMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.8,
        roughness: 0.2,
      });
      const block = new THREE.Mesh(blockGeo, blockMat);
      block.castShadow = !this.isSoftwareGl;
      block.receiveShadow = !this.isSoftwareGl;
      slabGroup.add(block);

      // Illuminated Bit Indicator on platform top
      const bitLightGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16);
      const bitLightMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      });
      const bitLight = new THREE.Mesh(bitLightGeo, bitLightMat);
      bitLight.position.set(0, 0.65, 0);
      slabGroup.add(bitLight);

      // Bit label console on platform
      const tagGeo = new THREE.BoxGeometry(1.2, 0.8, 0.4);
      const tagMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
      const tagMesh = new THREE.Mesh(tagGeo, tagMat);
      tagMesh.position.set(1.5, 0.8, 0);
      tagMesh.userData = {
        interactive: true,
        target: {
          name: `Bridge Bit [${bitIndex}] Switch Console`,
          type: 'BRIDGE_SWITCH',
          addressHex: '0x7FFF00C4',
          bitIndex: bitIndex,
          description: `Bit #${bitIndex} of [0x7FFF00C4]. Toggle directly or execute SHL/AND/OR in terminal.`,
        } as SceneInteractionTarget,
      };
      slabGroup.add(tagMesh);
      this.interactableObjects.push(tagMesh);

      slabGroup.position.set(0, 0, z);
      abyssGroup.add(slabGroup);
      this.bridgeSlabs.push(slabGroup);
    }

    this.scene.add(abyssGroup);
  }

  /**
   * Electron Bus Data Stream (Hundreds of fast glowing particles racing across data paths)
   */
  private buildElectronBusParticles() {
    const particleCount = 350;
    const geometry = new THREE.BufferGeometry();
    this.busParticlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      this.busParticlePositions[i * 3 + 0] = (Math.random() - 0.5) * 120;
      this.busParticlePositions[i * 3 + 1] = 0.4 + Math.random() * 8;
      this.busParticlePositions[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(this.busParticlePositions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x34d399,
      size: 0.35,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });

    this.busParticles = new THREE.Points(geometry, mat);
    this.scene.add(this.busParticles);
  }

  /**
   * Procedural Handheld Quantum Terminal in Player's First-Person View
   * Rugged cybernetic terminal with mini CRT screen, keyboard keys, heat sinks & antenna
   */
  private buildHandheldTerminal() {
    this.handheldTerminal = new THREE.Group();

    // 1. Chassis Body (Ruggedized composite)
    const chassisGeo = new THREE.BoxGeometry(0.42, 0.32, 0.08);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.25,
    });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    this.handheldTerminal.add(chassis);

    // 2. Mini Glowing Screen
    const screenGeo = new THREE.PlaneGeometry(0.32, 0.18);
    const screenMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
    });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 0.04, 0.042);
    this.handheldTerminal.add(screen);

    // 3. Mini Keyboard Grid
    const keyGeo = new THREE.BoxGeometry(0.04, 0.02, 0.02);
    const keyMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 });
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 5; c++) {
        const k = new THREE.Mesh(keyGeo, keyMat);
        k.position.set(-0.1 + c * 0.05, -0.09 - r * 0.03, 0.045);
        this.handheldTerminal.add(k);
      }
    }

    // 4. Antenna / Quantum Link Coupler
    const antGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.25, 8);
    const antMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9 });
    const ant = new THREE.Mesh(antGeo, antMat);
    ant.position.set(0.18, 0.22, 0);
    this.handheldTerminal.add(ant);

    // Position relative to camera (held in lower right view)
    this.handheldTerminal.position.set(0.28, -0.22, -0.45);
    this.handheldTerminal.rotation.set(-0.15, -0.25, 0.05);

    this.camera.add(this.handheldTerminal);
    this.scene.add(this.camera);
  }

  private setupInputHandlers() {
    window.addEventListener('keydown', (e) => {
      this.keysPressed[e.code] = true;

      // Space / Tab to open / raise terminal if not in full typing mode
      if (e.code === 'Tab') {
        e.preventDefault();
        if (this.onOpenTerminal) this.onOpenTerminal();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysPressed[e.code] = false;
    });

    // Pointer Lock on click for smooth 1st-person FPS controls
    this.renderer.domElement.addEventListener('click', () => {
      soundEngine.init();
      soundEngine.resume();
      if (!this.isPointerLocked) {
        this.renderer.domElement.requestPointerLock?.();
      } else {
        // Trigger interaction if aiming at something
        this.triggerAimInteraction();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        const sensitivity = 0.0022;
        this.cameraYaw -= e.movementX * sensitivity;
        this.cameraPitch -= e.movementY * sensitivity;

        // Clamp vertical look
        this.cameraPitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.cameraPitch));
      }
    });

    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  /**
   * Raycast from center of screen to identify interactive objects
   */
  private checkAimRaycast() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactableObjects, true);

    if (intersects.length > 0 && intersects[0].distance < 14) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && !obj.userData?.interactive) {
        obj = obj.parent;
      }
      if (obj && obj.userData?.interactive && this.onInspectTarget) {
        this.onInspectTarget(obj.userData.target as SceneInteractionTarget);
        return;
      }
    }
    if (this.onInspectTarget) {
      this.onInspectTarget(null);
    }
  }

  private triggerAimInteraction() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactableObjects, true);

    if (intersects.length > 0 && intersects[0].distance < 14) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && !obj.userData?.interactive) {
        obj = obj.parent;
      }
      if (obj && obj.userData?.interactive) {
        const target = obj.userData.target as SceneInteractionTarget;
        if (target.type === 'BRIDGE_SWITCH' && target.bitIndex !== undefined) {
          // Toggle physical switch directly
          const currentByte = hardware.getBridgeByte();
          const currentBit = ((currentByte >> target.bitIndex) & 1) as 0 | 1;
          const newBit = currentBit === 1 ? 0 : 1;
          hardware.setBridgeBit(7 - target.bitIndex, newBit);
          soundEngine.playRelayClick(newBit === 1);
        } else if (target.type === 'LASER' || target.type === 'TERMINAL' || target.type === 'REGISTER') {
          // Open terminal to execute commands
          if (this.onOpenTerminal) this.onOpenTerminal();
        }
      }
    }
  }

  /**
   * Game loop tick
   */
  private startLoop() {
    const tick = () => {
      const delta = Math.min(this.clock.getDelta(), 0.1);

      this.updatePhysics(delta);
      this.updateLaserBarricade();
      this.updateBridgeAlignment();
      this.updateElectronParticles(delta);
      this.checkAimRaycast();
      this.updateAudioFoley();

      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        // Safe pace for software WebGL
        this.frameId = window.setTimeout(tick, 80);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    tick();
  }

  private updatePhysics(delta: number) {
    // Rotation euler
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotation.y = this.cameraYaw;
    this.camera.rotation.x = this.cameraPitch;

    // Movement vectors
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);

    const speed = this.keysPressed['ShiftLeft'] ? 16.0 : 8.5;
    const moveDir = new THREE.Vector3();

    if (this.keysPressed['KeyW']) moveDir.add(forward);
    if (this.keysPressed['KeyS']) moveDir.sub(forward);
    if (this.keysPressed['KeyD']) moveDir.add(right);
    if (this.keysPressed['KeyA']) moveDir.sub(right);

    if (moveDir.lengthSq() > 0.001) {
      moveDir.normalize();
      this.playerVel.x = THREE.MathUtils.damp(this.playerVel.x, moveDir.x * speed, 12, delta);
      this.playerVel.z = THREE.MathUtils.damp(this.playerVel.z, moveDir.z * speed, 12, delta);
    } else {
      this.playerVel.x = THREE.MathUtils.damp(this.playerVel.x, 0, 14, delta);
      this.playerVel.z = THREE.MathUtils.damp(this.playerVel.z, 0, 14, delta);
    }

    // Jump
    if (this.keysPressed['Space'] && this.isGrounded) {
      this.playerVel.y = 7.5;
      this.isGrounded = false;
      soundEngine.playKeystroke();
    }

    // Gravity
    this.playerVel.y -= 19.8 * delta;

    // Apply movement
    this.playerPos.x += this.playerVel.x * delta;
    this.playerPos.y += this.playerVel.y * delta;
    this.playerPos.z += this.playerVel.z * delta;

    // Floor collision
    if (this.playerPos.y <= 1.8) {
      this.playerPos.y = 1.8;
      this.playerVel.y = 0;
      this.isGrounded = true;
    }

    this.camera.position.copy(this.playerPos);

    // Subtle breathing/bobbing for the handheld terminal
    const time = performance.now() * 0.003;
    const bobY = Math.sin(time) * 0.004 + (moveDir.lengthSq() > 0.01 ? Math.sin(time * 3) * 0.015 : 0);
    this.handheldTerminal.position.y = -0.22 + bobY;

    // Check Zone boundaries
    if (this.playerPos.x < -25 && this.playerPos.z < -25) {
      hardware.setActiveZone('CACHE_MATRIX');
    } else if (this.playerPos.x > 25 && this.playerPos.z < -25) {
      hardware.setActiveZone('PAGE_ABYSS');
    } else {
      hardware.setActiveZone('REGISTERS');
    }

    // Laser barrier collision check!
    // Laser is at x: -45, z: -45.
    const laserDist = new THREE.Vector2(this.playerPos.x - (-45), this.playerPos.z - (-45)).length();
    if (laserDist < 3.2 && !hardware.isLaserBarricadeDisabled()) {
      soundEngine.playLaserHum();
      hardware.reportSegFault('0x7FFF00A1');
      // Push back player
      this.playerPos.z += 3.5;
    }
  }

  /**
   * Animate laser barrier based on memory address 0x7FFF00A1
   */
  private updateLaserBarricade() {
    const disabled = hardware.isLaserBarricadeDisabled();
    if (disabled) {
      // Collapse beam
      this.laserBeamMesh.scale.set(0.01, 0.01, 0.01);
      this.laserLight.intensity = 0;
    } else {
      // Lethal pulsing beam
      const pulse = 1.0 + Math.sin(performance.now() * 0.01) * 0.25;
      this.laserBeamMesh.scale.set(pulse, 1, pulse);
      this.laserLight.intensity = 3.5 * pulse;
    }
  }

  /**
   * Animate the 8 bridge platform slabs based on the 8 bits of 0x7FFF00C4
   */
  private updateBridgeAlignment() {
    const bridgeByte = hardware.getBridgeByte();
    const isAligned = hardware.isBridgeAligned();

    this.bridgeSlabs.forEach((slab, idx) => {
      const bitIndex = 7 - idx;
      const isBitActive = ((bridgeByte >> bitIndex) & 1) === 1;

      // If bridge is aligned (0xB0), all slabs lock to flat y: 0
      // Otherwise, bits that are 0 drop down into the abyss by 10 units!
      const targetY = isAligned ? 0 : (isBitActive ? 0 : -8.5);
      slab.position.y = THREE.MathUtils.damp(slab.position.y, targetY, 6, 0.016);

      // Light color
      const lightMesh = slab.children[1] as THREE.Mesh;
      if (lightMesh && lightMesh.material) {
        const mat = lightMesh.material as THREE.MeshStandardMaterial;
        if (isAligned) {
          mat.color.setHex(0x10b981); // Solid Emerald lock
          mat.emissive.setHex(0x059669);
          mat.emissiveIntensity = 1.2;
        } else if (isBitActive) {
          mat.color.setHex(0x38bdf8); // Cyan
          mat.emissive.setHex(0x0284c7);
          mat.emissiveIntensity = 0.8;
        } else {
          mat.color.setHex(0xef4444); // Unaligned Red
          mat.emissive.setHex(0x7f1d1d);
          mat.emissiveIntensity = 0.3;
        }
      }
    });
  }

  private updateElectronParticles(delta: number) {
    if (!this.busParticlePositions) return;
    const len = this.busParticlePositions.length / 3;

    for (let i = 0; i < len; i++) {
      this.busParticlePositions[i * 3 + 2] += (8.0 + (i % 5)) * delta;
      if (this.busParticlePositions[i * 3 + 2] > 60) {
        this.busParticlePositions[i * 3 + 2] = -60;
      }
    }
    this.busParticles.geometry.attributes.position.needsUpdate = true;
  }

  private updateAudioFoley() {
    const t = hardware.telemetry;
    soundEngine.updateHardwareLoad(t.tdpWatts / 2.5, t.temperatureC);
  }

  /**
   * Teleport player directly to zone (used by HUD dock)
   */
  public teleportToZone(zone: 'REGISTERS' | 'CACHE_MATRIX' | 'PAGE_ABYSS') {
    soundEngine.playBusTransit();
    if (zone === 'REGISTERS') {
      this.playerPos.set(0, 1.8, 18);
      this.cameraYaw = 0;
    } else if (zone === 'CACHE_MATRIX') {
      this.playerPos.set(-45, 1.8, -25);
      this.cameraYaw = 0;
    } else if (zone === 'PAGE_ABYSS') {
      this.playerPos.set(45, 1.8, -25);
      this.cameraYaw = 0;
    }
    hardware.setActiveZone(zone);
  }

  public dispose() {
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
