'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useScroll, useSpring, useTransform } from 'framer-motion';

interface LandingThreeStageProps {
  reducedMotion?: boolean;
  /** 0 = Hero/Login, 1..4 = Active Workflow Step triggered by Framer Motion scroll/inView */
  activeStep?: number;
}

// Pre-allocated math helpers (zero GC inside animation loop)
const _camTargetPos = new THREE.Vector3();
const _camLookAt = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3(0, 0, 0);
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

function createBeveledPrismGeometry(sides: number, radius: number, depth: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: radius * 0.14,
    bevelSize: radius * 0.1,
    bevelSegments: 3,
    curveSegments: 8,
  });
  geom.center();
  return geom;
}

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export const LandingThreeStage: React.FC<LandingThreeStageProps> = ({
  reducedMotion = false,
  activeStep = 0,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const reducedMotionRef = useRef(reducedMotion);
  const activeStepRef = useRef(activeStep);
  const [webglReady, setWebglReady] = useState(true);

  // =========================================================================
  // FRAMER MOTION SCROLL-TRIGGERED 3D KEYFRAME TRACKS
  // Driven by useScroll + useSpring + useTransform and sampled at 60fps via .get()
  // inside the Three.js render loop with zero React re-renders.
  // =========================================================================
  const { scrollYProgress } = useScroll();
  const smoothScrollProgress = useSpring(scrollYProgress, {
    stiffness: 88,
    damping: 24,
    mass: 0.7,
    restDelta: 0.0005,
  });

  // Scroll breakpoints aligned to: Hero (0), Step 1 (0.24), Step 2 (0.48), Step 3 (0.7), Step 4 (0.88), CTA (1.0)
  const prismRotX = useTransform(
    smoothScrollProgress,
    [0, 0.24, 0.48, 0.7, 0.88, 1],
    [0.15, 1.45, 2.95, 4.35, 5.75, 6.4]
  );
  const prismRotY = useTransform(
    smoothScrollProgress,
    [0, 0.24, 0.48, 0.7, 0.88, 1],
    [0.1, 2.1, 4.2, 6.3, 8.2, 9.4]
  );
  const prismScaleTrack = useTransform(
    smoothScrollProgress,
    [0, 0.24, 0.48, 0.7, 0.88, 1],
    [0.92, 1.28, 1.44, 1.32, 1.5, 1.04]
  );
  const heroCoreScaleTrack = useTransform(
    smoothScrollProgress,
    [0, 0.24, 0.48, 0.7, 0.88, 1],
    [1.0, 1.2, 1.32, 1.24, 1.36, 1.04]
  );
  const ringSpreadTrack = useTransform(
    smoothScrollProgress,
    [0, 0.24, 0.48, 0.7, 0.88, 1],
    [1.0, 1.22, 1.38, 1.28, 1.44, 1.06]
  );
  const cameraOrbitTrack = useTransform(
    smoothScrollProgress,
    [0, 0.24, 0.48, 0.7, 0.88, 1],
    [0, 1.05, 2.25, 3.55, 4.75, 5.65]
  );

  const motionTracksRef = useRef({
    smoothScrollProgress,
    prismRotX,
    prismRotY,
    prismScaleTrack,
    heroCoreScaleTrack,
    ringSpreadTrack,
    cameraOrbitTrack,
  });

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    activeStepRef.current = activeStep;
  }, [activeStep]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglReady(false);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Bright pearl-white & soft icy-sky studio atmosphere
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f8ff);
    scene.fog = new THREE.FogExp2(0xf4f8ff, 0.026);

    // Procedural Studio Environment Map for crisp optical glass & pearlescent reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      42,
      window.innerWidth / window.innerHeight,
      0.1,
      120
    );
    camera.position.set(0, 0.25, 11.2);
    _currentLookAt.set(0, 0, 0);

    // Balanced 3-point high-key studio lighting (warm key + cool sky hemisphere + icy rim)
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0xffffff, 1.45);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff9f0, 2.0);
    keyLight.position.set(7, 9, 8);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 1.65);
    rimLight.position.set(-8, 4, -5);
    scene.add(rimLight);

    const fillAccent = new THREE.DirectionalLight(0xc7d2fe, 0.95);
    fillAccent.position.set(4, -6, 6);
    scene.add(fillAccent);

    // Track disposable resources
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      geometries.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      materials.push(m);
      return m;
    };

    // Shared PBR Optical Glass, Pearlescent Satin & Neon-White Luminous Materials
    const crystalGlassMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xeff6ff,
        metalness: 0.05,
        roughness: 0.08,
        transmission: isSoftwareGl ? 0 : 0.9,
        transparent: true,
        opacity: isSoftwareGl ? 0.56 : 1.0,
        ior: 1.68,
        thickness: 1.8,
        attenuationColor: new THREE.Color(0x93c5fd),
        attenuationDistance: 3.2,
        iridescence: 0.92,
        iridescenceIOR: 1.35,
        iridescenceThicknessRange: [140, 460],
        clearcoat: 1.0,
        clearcoatRoughness: 0.06,
        envMapIntensity: 1.35,
      })
    );

    const frostedSphereOuterMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xf8fbff,
        metalness: 0.04,
        roughness: 0.24,
        transmission: isSoftwareGl ? 0 : 0.84,
        transparent: true,
        opacity: isSoftwareGl ? 0.44 : 1.0,
        ior: 1.48,
        thickness: 1.2,
        attenuationColor: new THREE.Color(0xbae6fd),
        attenuationDistance: 2.6,
        iridescence: 0.65,
        iridescenceIOR: 1.3,
        clearcoat: 0.9,
        clearcoatRoughness: 0.14,
        depthWrite: false,
        envMapIntensity: 1.2,
      })
    );

    const pearlCoreMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.35,
        roughness: 0.22,
        iridescence: 0.85,
        iridescenceIOR: 1.42,
        clearcoat: 0.85,
        clearcoatRoughness: 0.15,
        emissive: new THREE.Color(0xe0f2fe),
        emissiveIntensity: 0.25,
        envMapIntensity: 1.25,
      })
    );

    const neonWhiteRingMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.18,
        roughness: 0.14,
        emissive: new THREE.Color(0xe0f2fe),
        emissiveIntensity: 0.72,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
        envMapIntensity: 1.3,
      })
    );

    const satinTitaniumRingMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xdbeafe,
        metalness: 0.78,
        roughness: 0.36,
        clearcoat: 0.45,
        envMapIntensity: 1.35,
      })
    );

    const prismRefractMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xe0f2fe,
        metalness: 0.08,
        roughness: 0.1,
        transmission: isSoftwareGl ? 0 : 0.88,
        transparent: true,
        opacity: isSoftwareGl ? 0.52 : 1.0,
        ior: 1.78,
        thickness: 1.5,
        attenuationColor: new THREE.Color(0x60a5fa),
        attenuationDistance: 2.8,
        iridescence: 1.0,
        iridescenceIOR: 1.45,
        iridescenceThicknessRange: [180, 520],
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        envMapIntensity: 1.45,
      })
    );

    // =========================================================================
    // 1. PRIMARY COMPOSITE SCULPTURE: Luminous Gyro-Prism Assembly (9 Parts)
    // =========================================================================
    const heroSculpture = new THREE.Group();
    heroSculpture.position.set(-0.35, 0.15, -1.2);

    const coreOctaGeo = trackGeo(new THREE.OctahedronGeometry(1.12, 0));
    const coreOctaMesh = new THREE.Mesh(coreOctaGeo, crystalGlassMat);
    coreOctaMesh.renderOrder = 2;
    heroSculpture.add(coreOctaMesh);

    const innerPearlGeo = trackGeo(new THREE.IcosahedronGeometry(0.54, 1));
    const innerPearlMesh = new THREE.Mesh(innerPearlGeo, pearlCoreMat);
    innerPearlMesh.renderOrder = 1;
    heroSculpture.add(innerPearlMesh);

    const ringGeoA = trackGeo(new THREE.TorusGeometry(1.88, 0.042, 20, 96));
    const ringA = new THREE.Mesh(ringGeoA, neonWhiteRingMat);
    ringA.rotation.set(Math.PI * 0.34, Math.PI * 0.12, 0);
    heroSculpture.add(ringA);

    const ringGeoB = trackGeo(new THREE.TorusGeometry(2.38, 0.028, 18, 108));
    const ringB = new THREE.Mesh(ringGeoB, satinTitaniumRingMat);
    ringB.rotation.set(-Math.PI * 0.28, Math.PI * 0.38, Math.PI * 0.14);
    heroSculpture.add(ringB);

    const ringGeoC = trackGeo(new THREE.TorusGeometry(2.92, 0.022, 16, 120));
    const ringC = new THREE.Mesh(ringGeoC, neonWhiteRingMat);
    ringC.rotation.set(Math.PI * 0.45, -Math.PI * 0.22, Math.PI * 0.08);
    heroSculpture.add(ringC);

    // 4 Beveled satellite crystal prisms orbiting the gyro assembly
    const satPrismGeo = trackGeo(createBeveledPrismGeometry(3, 0.34, 0.42));
    const satellites: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const sat = new THREE.Mesh(satPrismGeo, prismRefractMat);
      const angle = (i / 4) * Math.PI * 2;
      sat.position.set(Math.cos(angle) * 2.45, Math.sin(angle) * 1.45, Math.sin(angle * 2) * 0.65);
      sat.rotation.set(angle * 0.7, angle * 1.1, angle * 0.4);
      sat.renderOrder = 2;
      heroSculpture.add(sat);
      satellites.push(sat);
    }

    scene.add(heroSculpture);

    // =========================================================================
    // 2. FLOATING FROSTED GLASS SPHERES (4 Multi-Part Composite Assemblies)
    // =========================================================================
    const spheresGroup = new THREE.Group();
    const outerSphereGeo = trackGeo(new THREE.SphereGeometry(1, 36, 36));
    const innerSphereGeo = trackGeo(new THREE.SphereGeometry(0.46, 24, 24));
    const orbRingGeo = trackGeo(new THREE.TorusGeometry(1.18, 0.018, 12, 64));

    const sphereSpecs = [
      { pos: [-5.1, 2.35, -2.1], scale: 0.96, phase: 0.0 },
      { pos: [4.85, 2.55, -2.8], scale: 1.18, phase: 1.4 },
      { pos: [-4.6, -2.45, -1.6], scale: 0.82, phase: 2.8 },
      { pos: [4.95, -2.2, -1.4], scale: 0.92, phase: 4.1 },
    ];

    const sphereAssemblies: Array<{ group: THREE.Group; basePos: THREE.Vector3; phase: number; baseScale: number }> = [];

    for (const spec of sphereSpecs) {
      const orbGroup = new THREE.Group();
      orbGroup.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
      orbGroup.scale.setScalar(spec.scale);

      const outerShell = new THREE.Mesh(outerSphereGeo, frostedSphereOuterMat);
      outerShell.renderOrder = 3;
      orbGroup.add(outerShell);

      const core = new THREE.Mesh(innerSphereGeo, pearlCoreMat);
      core.renderOrder = 1;
      orbGroup.add(core);

      const halo = new THREE.Mesh(orbRingGeo, neonWhiteRingMat);
      halo.rotation.set(Math.PI * 0.36 + spec.phase * 0.2, spec.phase * 0.3, 0);
      orbGroup.add(halo);

      spheresGroup.add(orbGroup);
      sphereAssemblies.push({
        group: orbGroup,
        basePos: new THREE.Vector3(spec.pos[0], spec.pos[1], spec.pos[2]),
        phase: spec.phase,
        baseScale: spec.scale,
      });
    }
    scene.add(spheresGroup);

    // =========================================================================
    // 3. WORKFLOW-LINKED REFRACTING 3D PRISMS (4 Architectural Shards — 1 per Step)
    // Each prism rotates and changes size along Framer Motion scroll curves,
    // and dynamically swells + spotlights opposite the active workflow card!
    // =========================================================================
    const prismsGroup = new THREE.Group();
    const hexPrismGeo = trackGeo(createBeveledPrismGeometry(6, 0.64, 0.98));
    const triPrismGeo = trackGeo(createBeveledPrismGeometry(3, 0.74, 1.12));
    const pentPrismGeo = trackGeo(createBeveledPrismGeometry(5, 0.68, 1.02));
    const prismCapRingGeo = trackGeo(new THREE.TorusGeometry(0.8, 0.018, 12, 48));

    // Spotlight positions sit opposite each step card (Step 1 left -> prism right, Step 2 right -> prism left, etc.)
    const prismSpecs = [
      { pos: [2.65, 0.85, -2.5], focusPos: [2.75, 0.3, 0.6], geo: triPrismGeo, scale: 0.94, phase: 0.6 },
      { pos: [-2.85, -1.25, -2.6], focusPos: [-2.75, 0.15, 0.65], geo: hexPrismGeo, scale: 0.96, phase: 2.1 },
      { pos: [2.45, -2.35, -2.4], focusPos: [2.75, -0.1, 0.7], geo: pentPrismGeo, scale: 0.9, phase: 3.7 },
      { pos: [-2.4, 2.3, -2.9], focusPos: [-2.65, 0.2, 0.65], geo: hexPrismGeo, scale: 0.92, phase: 5.0 },
    ];

    const prismAssemblies: Array<{
      group: THREE.Group;
      collar: THREE.Mesh;
      innerMat: THREE.MeshPhysicalMaterial;
      basePos: THREE.Vector3;
      focusPos: THREE.Vector3;
      baseScale: number;
      currentScale: number;
      focusWeight: number;
      phase: number;
    }> = [];

    for (const pSpec of prismSpecs) {
      const pGroup = new THREE.Group();
      pGroup.position.set(pSpec.pos[0], pSpec.pos[1], pSpec.pos[2]);
      pGroup.scale.setScalar(pSpec.scale);

      const prismMesh = new THREE.Mesh(pSpec.geo, prismRefractMat);
      prismMesh.renderOrder = 2;
      pGroup.add(prismMesh);

      const individualInnerMat = trackMat(pearlCoreMat.clone());
      const prismInner = new THREE.Mesh(innerSphereGeo, individualInnerMat);
      prismInner.scale.setScalar(0.55);
      pGroup.add(prismInner);

      const collar = new THREE.Mesh(prismCapRingGeo, satinTitaniumRingMat);
      collar.rotation.set(Math.PI * 0.48, pSpec.phase, 0);
      pGroup.add(collar);

      prismsGroup.add(pGroup);
      prismAssemblies.push({
        group: pGroup,
        collar,
        innerMat: individualInnerMat,
        basePos: new THREE.Vector3(pSpec.pos[0], pSpec.pos[1], pSpec.pos[2]),
        focusPos: new THREE.Vector3(pSpec.focusPos[0], pSpec.focusPos[1], pSpec.focusPos[2]),
        baseScale: pSpec.scale,
        currentScale: pSpec.scale,
        focusWeight: 0,
        phase: pSpec.phase,
      });
    }
    scene.add(prismsGroup);

    // =========================================================================
    // 4. INSTANCED ORBITAL PEARL MICRO-FACETS (36 Instances, 1 Draw Call)
    // =========================================================================
    const sparkleCount = 36;
    const sparkleGeo = trackGeo(new THREE.OctahedronGeometry(0.085, 0));
    const sparkleMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.35,
        roughness: 0.18,
        emissive: new THREE.Color(0xdbeafe),
        emissiveIntensity: 0.45,
      })
    );
    const sparkleMesh = new THREE.InstancedMesh(sparkleGeo, sparkleMat, sparkleCount);
    sparkleMesh.frustumCulled = false;

    const sparkleData: Array<{ radius: number; angle: number; y: number; speed: number; scale: number }> = [];
    const paletteHex = [0xffffff, 0xe0f2fe, 0xbae6fd, 0xe0e7ff];

    for (let i = 0; i < sparkleCount; i++) {
      const radius = 3.2 + (i % 7) * 0.85 + ((i * 19) % 10) * 0.14;
      const angle = (i / sparkleCount) * Math.PI * 2;
      const y = ((i % 9) - 4) * 1.05;
      const scale = 0.65 + ((i * 7) % 10) * 0.085;
      sparkleData.push({
        radius,
        angle,
        y,
        speed: 0.08 + (i % 5) * 0.025,
        scale,
      });

      _dummy.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius - 2.6);
      _dummy.scale.setScalar(scale);
      _dummy.updateMatrix();
      sparkleMesh.setMatrixAt(i, _dummy.matrix);
      _color.setHex(paletteHex[i % paletteHex.length]);
      sparkleMesh.setColorAt(i, _color);
    }
    sparkleMesh.instanceMatrix.needsUpdate = true;
    if (sparkleMesh.instanceColor) sparkleMesh.instanceColor.needsUpdate = true;
    scene.add(sparkleMesh);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // =========================================================================
    // INTERACTIVE POINTER PARALLAX + RESIZE & CONTEXT SAFETY
    // =========================================================================
    const targetPointer = { x: 0, y: 0 };
    const smoothPointer = { x: 0, y: 0 };

    const handlePointerMove = (e: PointerEvent) => {
      if (reducedMotionRef.current) return;
      targetPointer.x = (e.clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
      targetPointer.y = -((e.clientY / Math.max(window.innerHeight, 1)) * 2 - 1);
    };

    const handleResize = () => {
      const w = window.innerWidth;
      const h = Math.max(window.innerHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    };

    let contextLost = false;
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
    };
    const handleContextRestored = () => {
      contextLost = false;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('resize', handleResize);
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    // Animation loop (with software WebGL fenceSync pacing)
    const clock = new THREE.Clock();
    let frameId = 0;
    let timerId = 0;
    let disposed = false;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync !== 'function') {
        timerId = window.setTimeout(cb, 90);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (status === gl.UNSIGNALED) {
          timerId = window.setTimeout(poll, 6);
        } else {
          if (sync) gl.deleteSync(sync);
          timerId = window.setTimeout(cb, 80);
        }
      };
      timerId = window.setTimeout(poll, 6);
    };

    const tick = () => {
      if (disposed) return;

      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = reducedMotionRef.current ? 0 : clock.getElapsedTime();

      // Sample Framer Motion spring-smoothed scroll transforms (zero GC, zero React re-renders)
      const tracks = motionTracksRef.current;
      const s = tracks.smoothScrollProgress.get();
      const fmPrismRotX = tracks.prismRotX.get();
      const fmPrismRotY = tracks.prismRotY.get();
      const fmPrismScale = tracks.prismScaleTrack.get();
      const fmHeroScale = tracks.heroCoreScaleTrack.get();
      const fmRingSpread = tracks.ringSpreadTrack.get();
      const scrollAngle = tracks.cameraOrbitTrack.get();
      const stepIdx = activeStepRef.current; // 0 = Hero, 1..4 = Workflow steps

      // Exponentially damp mouse parallax
      smoothPointer.x = THREE.MathUtils.damp(smoothPointer.x, targetPointer.x, 4.5, delta);
      smoothPointer.y = THREE.MathUtils.damp(smoothPointer.y, targetPointer.y, 4.5, delta);

      // Framer Motion scroll-driven Camera Orbit & Angle Choreography
      const camX = Math.sin(scrollAngle) * 2.6 + smoothPointer.x * 1.05;
      const camY = 0.25 + Math.sin(s * Math.PI * 2.2) * 1.05 - s * 0.65 + smoothPointer.y * 0.7;
      const camZ = 11.2 - Math.sin(s * Math.PI) * 2.15 + Math.cos(scrollAngle) * 0.5;

      _camTargetPos.set(camX, camY, camZ);
      camera.position.lerp(_camTargetPos, 1 - Math.exp(-6 * delta));

      _camLookAt.set(
        Math.sin(scrollAngle * 0.55) * 0.85 + smoothPointer.x * 0.35,
        -s * 0.4 + smoothPointer.y * 0.25,
        -1.15
      );
      _currentLookAt.lerp(_camLookAt, 1 - Math.exp(-6 * delta));
      camera.lookAt(_currentLookAt);

      // Primary Hero Gyro-Prism driven by Framer Motion scale & rotation tracks
      heroSculpture.scale.setScalar(fmHeroScale);
      heroSculpture.position.x = -0.35 + Math.sin(s * Math.PI * 2.0) * 1.45 - smoothPointer.x * 0.35;
      heroSculpture.position.y = 0.15 + Math.sin(elapsed * 0.7) * 0.16 - s * 0.3 + smoothPointer.y * 0.22;

      coreOctaMesh.rotation.y = elapsed * 0.32 + fmPrismRotY * 0.85;
      coreOctaMesh.rotation.x = elapsed * 0.18 + fmPrismRotX * 0.65;
      innerPearlMesh.rotation.y = -elapsed * 0.45 - fmPrismRotY * 0.55;
      innerPearlMesh.scale.setScalar(1 + Math.sin(elapsed * 1.6 + s * 6) * 0.06);

      // Concentric luminous neon-white rings expand & tilt via Framer Motion ringSpreadTrack
      ringA.rotation.z = elapsed * 0.28 + fmPrismRotY * 0.42;
      ringA.rotation.x = Math.PI * 0.34 + fmPrismRotX * 0.35;
      ringA.scale.setScalar(fmRingSpread);

      ringB.rotation.y = -elapsed * 0.22 - fmPrismRotY * 0.48;
      ringB.rotation.z = Math.PI * 0.14 + fmPrismRotX * 0.38;
      ringB.scale.setScalar(1 + (fmRingSpread - 1) * 1.25);

      ringC.rotation.x = Math.PI * 0.45 - elapsed * 0.16 + fmPrismRotX * 0.42;
      ringC.rotation.y = -Math.PI * 0.22 + elapsed * 0.14 - fmPrismRotY * 0.38;
      ringC.scale.setScalar(1 + (fmRingSpread - 1) * 1.45);

      // Orbiting beveled crystal satellites rotate & scale smoothly with Framer Motion scroll curves
      for (let i = 0; i < satellites.length; i++) {
        const sat = satellites[i];
        const a = (i / satellites.length) * Math.PI * 2 + elapsed * 0.35 + fmPrismRotY * 0.52;
        sat.position.set(
          Math.cos(a) * 2.45 * fmRingSpread,
          Math.sin(a * 1.5) * 1.45 * fmRingSpread,
          Math.sin(a * 2) * 0.78
        );
        sat.rotation.x = elapsed * 0.55 + i + fmPrismRotX * 0.9;
        sat.rotation.y = elapsed * 0.42 + i * 1.3 + fmPrismRotY * 0.7;
        sat.scale.setScalar(0.88 + (fmPrismScale - 0.9) * 0.65);
      }

      // Floating frosted glass spheres drift & respond to scroll parallax
      for (let i = 0; i < sphereAssemblies.length; i++) {
        const item = sphereAssemblies[i];
        const dir = i % 2 === 0 ? 1 : -1;
        item.group.position.x =
          item.basePos.x +
          Math.cos(elapsed * 0.38 + item.phase) * 0.35 +
          Math.sin(s * Math.PI * 1.5 + item.phase) * 1.05 * dir -
          smoothPointer.x * 0.55 * dir;
        item.group.position.y =
          item.basePos.y +
          Math.sin(elapsed * 0.52 + item.phase) * 0.38 +
          (s - 0.5) * 1.5 * dir +
          smoothPointer.y * 0.42;
        item.group.position.z =
          item.basePos.z + Math.cos(s * Math.PI * 2 + item.phase) * 0.85;
        item.group.rotation.y = elapsed * 0.24 * dir + fmPrismRotY * 0.28 * dir;
        item.group.rotation.x = elapsed * 0.15 + item.phase;
        item.group.scale.setScalar(
          item.baseScale * (1 + Math.sin(s * Math.PI + item.phase) * 0.14)
        );
      }

      // 4 Workflow-Synchronized Refracting 3D Prisms:
      // Rotate & resize continuously via Framer Motion scroll tracks AND spotlight the active workflow step!
      for (let i = 0; i < prismAssemblies.length; i++) {
        const item = prismAssemblies[i];
        const dir = i % 2 === 0 ? 1 : -1;
        const isHighlighted = stepIdx === i + 1;
        const targetWeight = isHighlighted ? 1 : 0;
        item.focusWeight = THREE.MathUtils.damp(item.focusWeight, targetWeight, 4.8, delta);

        const idleX =
          item.basePos.x +
          Math.sin(elapsed * 0.3 + item.phase) * 0.3 +
          Math.cos(s * Math.PI * 1.8 + item.phase) * 1.0 * dir +
          smoothPointer.x * 0.48;
        const idleY =
          item.basePos.y +
          Math.cos(elapsed * 0.42 + item.phase) * 0.32 -
          (s - 0.5) * 1.3 * dir -
          smoothPointer.y * 0.36;
        const idleZ = item.basePos.z;

        const focusX = item.focusPos.x + smoothPointer.x * 0.35;
        const focusY = item.focusPos.y + Math.sin(elapsed * 0.85 + item.phase) * 0.18 + smoothPointer.y * 0.25;
        const focusZ = item.focusPos.z;

        item.group.position.x = THREE.MathUtils.lerp(idleX, focusX, item.focusWeight);
        item.group.position.y = THREE.MathUtils.lerp(idleY, focusY, item.focusWeight);
        item.group.position.z = THREE.MathUtils.lerp(idleZ, focusZ, item.focusWeight);

        // Dramatic, crisp scroll-triggered rotation & size change emphasizing each workflow step
        const stepBoostScale =
          stepIdx === 0
            ? item.baseScale * fmPrismScale
            : item.baseScale * fmPrismScale * THREE.MathUtils.lerp(0.84, 1.34, item.focusWeight);
        item.currentScale = THREE.MathUtils.damp(item.currentScale, stepBoostScale, 5.5, delta);
        item.group.scale.setScalar(item.currentScale);

        item.group.rotation.x = elapsed * 0.25 + item.phase + fmPrismRotX * (0.95 + item.focusWeight * 0.45);
        item.group.rotation.y = elapsed * 0.38 * dir + fmPrismRotY * (0.85 + item.focusWeight * 0.5) * dir;
        item.group.rotation.z = Math.sin(fmPrismRotX * 0.5 + item.phase) * 0.45;
        item.collar.rotation.z = elapsed * 0.65 * dir + fmPrismRotY * 0.5;
        item.innerMat.emissiveIntensity = THREE.MathUtils.lerp(0.24, 0.95, item.focusWeight);
      }

      // Subtle orbital micro-facets
      for (let i = 0; i < sparkleCount; i++) {
        const sp = sparkleData[i];
        const a = sp.angle + elapsed * sp.speed + s * 1.8;
        _dummy.position.set(
          Math.cos(a) * sp.radius,
          sp.y + Math.sin(elapsed * 0.7 + i) * 0.24 + (s - 0.5) * 1.2,
          Math.sin(a) * sp.radius - 2.8
        );
        _dummy.rotation.set(elapsed * 0.4 + i, elapsed * 0.5 + i, 0);
        _dummy.scale.setScalar(sp.scale);
        _dummy.updateMatrix();
        sparkleMesh.setMatrixAt(i, _dummy.matrix);
      }
      sparkleMesh.instanceMatrix.needsUpdate = true;

      if (!contextLost) {
        renderer.render(scene, camera);
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timerId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      envTarget.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-gradient-to-br from-[#F4F8FF] via-[#FFFFFF] to-[#E8F3FF]"
    >
      {webglReady ? (
        <div ref={mountRef} className="w-full h-full" />
      ) : (
        <div className="w-full h-full relative">
          <div className="absolute -top-24 -left-20 w-[34rem] h-[34rem] rounded-full bg-sky-200/45 blur-[110px]" />
          <div className="absolute bottom-[-10%] right-[-8%] w-[38rem] h-[38rem] rounded-full bg-blue-100/60 blur-[120px]" />
          <div className="absolute top-[32%] left-[42%] w-[24rem] h-[24rem] rounded-full bg-indigo-100/45 blur-[100px]" />
        </div>
      )}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.55),transparent_58%),radial-gradient(circle_at_82%_78%,rgba(224,242,254,0.45),transparent_55%)]" />
    </div>
  );
};
