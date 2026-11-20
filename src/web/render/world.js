import * as THREE from 'three';
import { ISLAND_RADIUS } from '../../sim/index.js';

function createPlayerMesh() {
  const group = new THREE.Group();

  const cloakMat = new THREE.MeshStandardMaterial({
    color: 0x3b6e8c,
    roughness: 0.75
  });
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.05, 10), cloakMat);
  body.position.y = 0.525;
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xf4d6b3, roughness: 0.7 })
  );
  head.position.y = 1.18;
  head.castShadow = true;
  group.add(head);

  const hat = new THREE.Mesh(
    new THREE.ConeGeometry(0.54, 0.34, 16),
    new THREE.MeshStandardMaterial({ color: 0xe3c27a, roughness: 0.85 })
  );
  hat.position.y = 1.44;
  hat.castShadow = true;
  group.add(hat);

  const miniLantern = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 10, 8),
    new THREE.MeshStandardMaterial({
      color: 0xffd27d,
      emissive: 0xff9b2f,
      emissiveIntensity: 1.6,
      roughness: 0.3
    })
  );
  miniLantern.position.set(0.32, 1.14, 0.28);
  group.add(miniLantern);

  const playerLight = new THREE.PointLight(0xffb454, 1.4, 9.5, 1.6);
  playerLight.position.set(0.32, 1.25, 0.32);
  group.add(playerLight);

  return { group, cloakMat };
}

function createSoftGlowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 4, half, half, half);
  grad.addColorStop(0, 'rgba(255, 202, 110, 0.95)');
  grad.addColorStop(0.45, 'rgba(255, 172, 68, 0.55)');
  grad.addColorStop(0.8, 'rgba(255, 155, 50, 0.18)');
  grad.addColorStop(1, 'rgba(255, 150, 45, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createLanternLandmark(id) {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x5d687d, roughness: 0.9 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.85 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f5d50, roughness: 0.85 });

  if (id === 'L1') {
    // Stone archway pillars near L1
    for (const sx of [-2.4, 2.4]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.45, 2.4, 0.45), stoneMat);
      col.position.set(sx, 1.2, -1.6);
      group.add(col);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.35, 0.55), woodMat);
    beam.position.set(0, 2.5, -1.6);
    group.add(beam);
  } else if (id === 'L2') {
    // Low-poly pine/bamboo tree cluster
    for (const [tx, tz, h] of [
      [2.6, 1.2, 2.6],
      [3.3, -0.4, 2.0]
    ]) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.0, 6), woodMat);
      trunk.position.set(tx, 0.5, tz);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.9, h, 7), leafMat);
      crown.position.set(tx, 0.9 + h * 0.5, tz);
      group.add(trunk, crown);
    }
  } else if (id === 'L3') {
    // Wooden dock posts
    for (const [px, pz, h] of [
      [-2.5, 1.5, 1.3],
      [-3.1, 0.4, 1.0],
      [-2.6, -0.7, 1.5]
    ]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, h, 6), woodMat);
      post.position.set(px, h / 2, pz);
      group.add(post);
    }
  } else if (id === 'L4') {
    // Mossy rock stack
    const r1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 0), stoneMat);
    r1.position.set(2.5, 0.65, -1.8);
    const r2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), leafMat);
    r2.position.set(3.2, 0.4, -1.1);
    group.add(r1, r2);
  } else if (id === 'L5') {
    // Small wooden shrine pavilion
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(1.5, 0.9, 4),
      new THREE.MeshStandardMaterial({ color: 0x7d3f32, roughness: 0.8 })
    );
    roof.position.set(-2.6, 2.1, -1.5);
    roof.rotation.y = Math.PI / 4;
    group.add(roof);
    for (const [dx, dz] of [
      [-0.8, -0.8],
      [0.8, -0.8],
      [-0.8, 0.8],
      [0.8, 0.8]
    ]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.7, 6), woodMat);
      p.position.set(-2.6 + dx, 0.85, -1.5 + dz);
      group.add(p);
    }
  }
  return group;
}

function createLanternVisual(lantern, safeRadius, glowTexture) {
  const group = new THREE.Group();
  group.position.set(lantern.pos[0], 0, lantern.pos[2]);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.85, 0.45, 8),
    new THREE.MeshStandardMaterial({ color: 0x454d66, roughness: 0.9 })
  );
  base.position.y = 0.225;
  base.receiveShadow = true;
  base.castShadow = true;
  group.add(base);

  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.28, 2.0, 8),
    new THREE.MeshStandardMaterial({ color: 0x5c5346, roughness: 0.85 })
  );
  pillar.position.y = 1.35;
  pillar.castShadow = true;
  group.add(pillar);

  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x3b3545,
    emissive: 0xff9a2e,
    emissiveIntensity: 0.12,
    roughness: 0.35
  });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.52, 0), coreMat);
  core.position.y = 2.65;
  group.add(core);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(0.82, 0.45, 8),
    new THREE.MeshStandardMaterial({ color: 0x733b2d, roughness: 0.8 })
  );
  roof.position.y = 3.22;
  roof.castShadow = true;
  group.add(roof);

  const poolMat = new THREE.MeshBasicMaterial({
    map: glowTexture,
    transparent: true,
    opacity: 0.15,
    depthWrite: false
  });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(safeRadius, 36), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.03;
  group.add(pool);

  group.add(createLanternLandmark(lantern.id));

  const light = new THREE.PointLight(0xffb347, 0.3, 18, 1.5);
  light.position.y = 2.7;
  group.add(light);

  return { group, core, coreMat, poolMat, light };
}

function createShadeVisual() {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x1b0f29,
    emissive: 0x361459,
    emissiveIntensity: 0.55,
    roughness: 0.65
  });
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.58, 1.45, 7), bodyMat);
  body.position.y = 0.78;
  body.castShadow = true;
  group.add(body);

  const auraMat = new THREE.MeshBasicMaterial({
    color: 0xb05cff,
    transparent: true,
    opacity: 0.45
  });
  const eyeLeft = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), auraMat);
  eyeLeft.position.set(-0.14, 1.05, 0.34);
  const eyeRight = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), auraMat);
  eyeRight.position.set(0.14, 1.05, 0.34);
  group.add(eyeLeft, eyeRight);

  return { group, body, bodyMat, auraMat };
}

/**
 * Create and sync all Three.js world visuals from simulation state.
 */
export function createWorldView(scene, initialSim) {
  const hemi = new THREE.HemisphereLight(0x748ec4, 0x26324a, 1.05);
  scene.add(hemi);

  const moon = new THREE.DirectionalLight(0xbcd0ff, 1.2);
  moon.position.set(-18, 28, -14);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.near = 2;
  moon.shadow.camera.far = 90;
  const d = 40;
  moon.shadow.camera.left = -d;
  moon.shadow.camera.right = d;
  moon.shadow.camera.top = d;
  moon.shadow.camera.bottom = -d;
  scene.add(moon);

  const island = new THREE.Mesh(
    new THREE.CylinderGeometry(ISLAND_RADIUS, ISLAND_RADIUS * 1.05, 2.2, 48),
    new THREE.MeshStandardMaterial({ color: 0x314154, roughness: 0.9 })
  );
  island.position.y = -1.1;
  island.receiveShadow = true;
  scene.add(island);

  const rim = new THREE.Mesh(
    new THREE.RingGeometry(ISLAND_RADIUS - 0.5, ISLAND_RADIUS, 48),
    new THREE.MeshStandardMaterial({
      color: 0x455066,
      roughness: 0.9,
      side: THREE.DoubleSide
    })
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.02;
  scene.add(rim);

  const plaza = new THREE.Mesh(
    new THREE.CircleGeometry(2.6, 24),
    new THREE.MeshStandardMaterial({ color: 0x343f52, roughness: 0.9 })
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.015;
  plaza.receiveShadow = true;
  scene.add(plaza);

  const cloudGroup = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0x1a2442,
    roughness: 0.95
  });
  for (let i = 0; i < 20; i += 1) {
    const angle = (i / 20) * Math.PI * 2;
    const dist = ISLAND_RADIUS + 8 + (i % 3) * 6;
    const puff = new THREE.Mesh(
      new THREE.DodecahedronGeometry(6 + (i % 4) * 1.8, 1),
      cloudMat
    );
    puff.scale.set(1.6, 0.45, 1.3);
    puff.position.set(
      Math.cos(angle) * dist,
      -2.2 - (i % 2) * 0.8,
      Math.sin(angle) * dist
    );
    cloudGroup.add(puff);
  }
  scene.add(cloudGroup);

  const playerView = createPlayerMesh();
  scene.add(playerView.group);

  const glowTexture = createSoftGlowTexture();
  const lanternViews = new Map();
  for (const lantern of initialSim.lanterns) {
    const view = createLanternVisual(lantern, initialSim.tuning.safe_radius, glowTexture);
    lanternViews.set(lantern.id, view);
    scene.add(view.group);
  }

  // InstancedMesh for motes -> 1 draw call for all motes
  const maxMotes = Math.max(64, initialSim.motes.length);
  const moteGeo = new THREE.SphereGeometry(0.22, 8, 6);
  const moteMat = new THREE.MeshStandardMaterial({
    color: 0xffe875,
    emissive: 0xffc436,
    emissiveIntensity: 1.8,
    roughness: 0.25
  });
  const moteInstanced = new THREE.InstancedMesh(moteGeo, moteMat, maxMotes);
  moteInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(moteInstanced);
  const dummy = new THREE.Object3D();

  // Dynamic shade pool
  const shadeViews = new Map();

  // Pulse ring VFX
  const pulseRingMat = new THREE.MeshBasicMaterial({
    color: 0xffe28a,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const pulseRing = new THREE.Mesh(new THREE.RingGeometry(0.75, 1.0, 32), pulseRingMat);
  pulseRing.rotation.x = -Math.PI / 2;
  pulseRing.position.y = 0.06;
  pulseRing.visible = false;
  scene.add(pulseRing);
  let pulseAnim = null;

  function triggerPulseEffect(pos, radius) {
    pulseAnim = {
      x: pos[0],
      z: pos[2],
      maxRadius: radius,
      age: 0,
      duration: 0.45
    };
    pulseRing.visible = true;
  }

  function setLightMode(enabled) {
    cloudGroup.visible = !enabled;
    moon.castShadow = !enabled;
  }

  function reset() {
    for (const view of shadeViews.values()) {
      scene.remove(view.group);
    }
    shadeViews.clear();
    pulseAnim = null;
    pulseRing.visible = false;
  }

  return {
    triggerPulseEffect,
    setLightMode,
    reset,
    sync(currentSim, elapsedSec, dt = 1 / 60) {
      // Player
      playerView.group.position.set(
        currentSim.player.pos[0],
        currentSim.player.pos[1],
        currentSim.player.pos[2]
      );
      playerView.group.rotation.y = (currentSim.player.facingYawDeg * Math.PI) / 180;
      if (currentSim.player.invulnTimer > 0) {
        const blink = Math.sin(elapsedSec * 28) > 0;
        playerView.cloakMat.emissive.setHex(blink ? 0x6b2838 : 0x000000);
        playerView.cloakMat.emissiveIntensity = blink ? 0.8 : 0;
      } else {
        playerView.cloakMat.emissive.setHex(0x000000);
        playerView.cloakMat.emissiveIntensity = 0;
      }

      // Lanterns
      for (const lantern of currentSim.lanterns) {
        const view = lanternViews.get(lantern.id);
        if (!view) continue;
        view.group.position.set(lantern.pos[0], 0, lantern.pos[2]);
        const progress = Math.min(
          1,
          lantern.deposited / Math.max(1, currentSim.tuning.lantern_cost)
        );
        if (lantern.lit) {
          view.coreMat.color.setHex(0xffe194);
          view.coreMat.emissiveIntensity = 2.4;
          view.light.intensity = 6.5;
          view.poolMat.opacity = 0.65;
          view.core.rotation.y = elapsedSec * 0.8;
        } else {
          view.coreMat.color.setHex(0x474254);
          view.coreMat.emissiveIntensity = 0.15 + progress * 1.1;
          view.light.intensity = 0.25 + progress * 2.0;
          view.poolMat.opacity = 0.08 + progress * 0.22;
        }
      }

      // Motes (InstancedMesh)
      let activeCount = 0;
      for (let i = 0; i < currentSim.motes.length && activeCount < maxMotes; i += 1) {
        const mote = currentSim.motes[i];
        if (!mote.active) continue;
        dummy.position.set(
          mote.pos[0],
          0.65 + Math.sin(elapsedSec * 3.0 + i) * 0.14,
          mote.pos[2]
        );
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        moteInstanced.setMatrixAt(activeCount, dummy.matrix);
        activeCount += 1;
      }
      moteInstanced.count = activeCount;
      moteInstanced.instanceMatrix.needsUpdate = true;

      // Shades
      const seenShadeIds = new Set();
      for (let i = 0; i < currentSim.shades.length; i += 1) {
        const shade = currentSim.shades[i];
        seenShadeIds.add(shade.id);
        let view = shadeViews.get(shade.id);
        if (!view) {
          view = createShadeVisual();
          shadeViews.set(shade.id, view);
          scene.add(view.group);
        }
        view.group.position.set(
          shade.pos[0],
          Math.sin(elapsedSec * 4 + i) * 0.08,
          shade.pos[2]
        );
        if (shade.state === 'stunned') {
          view.bodyMat.color.setHex(0x2a3352);
          view.bodyMat.emissive.setHex(0x3a86ff);
          view.bodyMat.emissiveIntensity = 0.7;
          view.auraMat.color.setHex(0x8ce9ff);
          view.group.rotation.z = 0.35;
          view.group.rotation.y += dt * 7;
        } else {
          view.bodyMat.color.setHex(0x1b0f29);
          view.bodyMat.emissive.setHex(0x361459);
          view.bodyMat.emissiveIntensity = 0.55;
          view.auraMat.color.setHex(0xb05cff);
          view.group.rotation.z = 0;
          const dx = currentSim.player.pos[0] - shade.pos[0];
          const dz = currentSim.player.pos[2] - shade.pos[2];
          view.group.rotation.y = Math.atan2(dx, dz);
        }
      }
      for (const [id, view] of shadeViews.entries()) {
        if (!seenShadeIds.has(id)) {
          scene.remove(view.group);
          shadeViews.delete(id);
        }
      }

      // Pulse ring VFX
      if (pulseAnim) {
        pulseAnim.age += dt;
        const t = pulseAnim.age / pulseAnim.duration;
        if (t >= 1) {
          pulseAnim = null;
          pulseRing.visible = false;
        } else {
          const r = 0.5 + t * pulseAnim.maxRadius;
          pulseRing.position.set(pulseAnim.x, 0.06, pulseAnim.z);
          pulseRing.scale.set(r, r, 1);
          pulseRingMat.opacity = (1 - t) * 0.75;
        }
      }
    }
  };
}
