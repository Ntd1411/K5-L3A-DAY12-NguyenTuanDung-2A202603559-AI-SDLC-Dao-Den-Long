import * as THREE from 'three';
import { ISLAND_RADIUS } from '../../sim/index.js';

function createPlayerMesh() {
  const group = new THREE.Group();

  // Cloak / body
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, 1.05, 10),
    new THREE.MeshStandardMaterial({
      color: 0x3b6e8c,
      roughness: 0.75
    })
  );
  body.position.y = 0.525;
  body.castShadow = true;
  group.add(body);

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 12, 10),
    new THREE.MeshStandardMaterial({
      color: 0xf4d6b3,
      roughness: 0.7
    })
  );
  head.position.y = 1.18;
  head.castShadow = true;
  group.add(head);

  // Nón lá (conical hat)
  const hat = new THREE.Mesh(
    new THREE.ConeGeometry(0.54, 0.34, 16),
    new THREE.MeshStandardMaterial({
      color: 0xe3c27a,
      roughness: 0.85
    })
  );
  hat.position.y = 1.44;
  hat.castShadow = true;
  group.add(hat);

  // Small hanging lantern from brim
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

  return group;
}

function createLanternVisual(lantern, safeRadius) {
  const group = new THREE.Group();
  group.position.set(lantern.pos[0], 0, lantern.pos[2]);

  // Base pedestal
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.85, 0.45, 8),
    new THREE.MeshStandardMaterial({ color: 0x454d66, roughness: 0.9 })
  );
  base.position.y = 0.225;
  base.receiveShadow = true;
  base.castShadow = true;
  group.add(base);

  // Pillar
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.28, 2.0, 8),
    new THREE.MeshStandardMaterial({ color: 0x5c5346, roughness: 0.85 })
  );
  pillar.position.y = 1.35;
  pillar.castShadow = true;
  group.add(pillar);

  // Lantern core
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x3b3545,
    emissive: 0xff9a2e,
    emissiveIntensity: 0.12,
    roughness: 0.35
  });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.52, 0), coreMat);
  core.position.y = 2.65;
  group.add(core);

  // Roof cap
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(0.82, 0.45, 8),
    new THREE.MeshStandardMaterial({ color: 0x733b2d, roughness: 0.8 })
  );
  roof.position.y = 3.22;
  roof.castShadow = true;
  group.add(roof);

  // Warm ground light pool (visible as lantern gets deposited/lit)
  const poolMat = new THREE.MeshBasicMaterial({
    color: 0xffaa44,
    transparent: true,
    opacity: 0.05,
    depthWrite: false
  });
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(safeRadius, 32),
    poolMat
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.03;
  group.add(pool);

  const light = new THREE.PointLight(0xffb347, 0.3, 18, 1.5);
  light.position.y = 2.7;
  group.add(light);

  return { group, core, coreMat, poolMat, light };
}

/**
 * Create and sync all Three.js world visuals from simulation state.
 */
export function createWorldView(scene, sim) {
  // Lighting: cool moonlight + warm ambient fill
  const hemi = new THREE.HemisphereLight(0x556b9e, 0x1a1e2e, 0.75);
  scene.add(hemi);

  const moon = new THREE.DirectionalLight(0xa8c0ff, 0.85);
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

  // Island ground (top surface at y = 0)
  const island = new THREE.Mesh(
    new THREE.CylinderGeometry(ISLAND_RADIUS, ISLAND_RADIUS * 1.05, 2.2, 48),
    new THREE.MeshStandardMaterial({
      color: 0x25303d,
      roughness: 0.92
    })
  );
  island.position.y = -1.1;
  island.receiveShadow = true;
  scene.add(island);

  // Stone border ring
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

  // Center spawn plaza disc
  const plaza = new THREE.Mesh(
    new THREE.CircleGeometry(2.6, 24),
    new THREE.MeshStandardMaterial({ color: 0x343f52, roughness: 0.9 })
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.015;
  plaza.receiveShadow = true;
  scene.add(plaza);

  // Sea of clouds below island
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
    scene.add(puff);
  }

  // Player (Mây)
  const playerMesh = createPlayerMesh();
  scene.add(playerMesh);

  // Lanterns
  const lanternViews = new Map();
  for (const lantern of sim.lanterns) {
    const view = createLanternVisual(lantern, sim.tuning.safe_radius);
    lanternViews.set(lantern.id, view);
    scene.add(view.group);
  }

  // Motes (Đom đóm)
  const moteGeo = new THREE.SphereGeometry(0.22, 10, 8);
  const moteMat = new THREE.MeshStandardMaterial({
    color: 0xffe875,
    emissive: 0xffc436,
    emissiveIntensity: 1.8,
    roughness: 0.25
  });
  const moteViews = new Map();
  for (const mote of sim.motes) {
    const mesh = new THREE.Mesh(moteGeo, moteMat);
    mesh.position.set(mote.pos[0], 0.65, mote.pos[2]);
    moteViews.set(mote.id, mesh);
    scene.add(mesh);
  }

  return {
    sync(currentSim, elapsedSec) {
      // Sync player
      playerMesh.position.set(
        currentSim.player.pos[0],
        currentSim.player.pos[1],
        currentSim.player.pos[2]
      );
      playerMesh.rotation.y = (currentSim.player.facingYawDeg * Math.PI) / 180;

      // Sync lanterns
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
          view.poolMat.opacity = 0.24;
          view.core.rotation.y = elapsedSec * 0.8;
        } else {
          view.coreMat.color.setHex(0x474254);
          view.coreMat.emissiveIntensity = 0.15 + progress * 1.1;
          view.light.intensity = 0.25 + progress * 2.0;
          view.poolMat.opacity = 0.04 + progress * 0.08;
        }
      }

      // Sync motes
      for (let i = 0; i < currentSim.motes.length; i += 1) {
        const mote = currentSim.motes[i];
        const mesh = moteViews.get(mote.id);
        if (!mesh) continue;
        mesh.visible = mote.active;
        if (mote.active) {
          mesh.position.set(
            mote.pos[0],
            0.65 + Math.sin(elapsedSec * 3.0 + i) * 0.14,
            mote.pos[2]
          );
        }
      }
    }
  };
}
