import * as THREE from 'three';

const COLORS = {
  grass: 0x42745a,
  grassLight: 0x6b9764,
  grassDark: 0x28513f,
  sand: 0xd3bd8c,
  wood: 0x71472f,
  woodDark: 0x3f2b26,
  stone: 0x667283,
  stoneDark: 0x394556,
  cloudSea: 0x142d46,
  cloud: 0xb7c8d2,
  cloudWarm: 0xe2cda9,
  lanternLit: 0xffb347,
  lanternCore: 0xffe9b0,
  lanternUnlit: 0x5b5f6e,
  moteCore: 0xfff6c2,
  moteGlow: 0xffe58a,
  shadeBody: 0x120a1a,
  shadeRim: 0x7a3cff,
  shadeStunned: 0x3a3450,
  mayCloak: 0xe8e2d0,
  mayScarf: 0xc8102e,
  gold: 0xf2c14e,
  drifter: 0x8fa3b8
};

const TAU = Math.PI * 2;
const dummy = new THREE.Object3D();

function seeded01(index, salt = 0) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function makeLambert(color, options = {}) {
  return new THREE.MeshLambertMaterial({ color, flatShading: true, ...options });
}

function createSoftGlowTexture(innerRgba, midRgba, outerRgba) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 4, half, half, half);
  grad.addColorStop(0, innerRgba);
  grad.addColorStop(0.45, midRgba);
  grad.addColorStop(0.8, outerRgba);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createStarfieldAndMoon(warmHaloTex) {
  const group = new THREE.Group();

  // Warm fairy-tale moon high in the night sky
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(5.5, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffe9b0 })
  );
  moon.position.set(55, 68, -95);
  group.add(moon);

  const moonHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: warmHaloTex,
      color: 0xffb347,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  moonHalo.position.copy(moon.position);
  moonHalo.scale.set(28, 28, 1);
  group.add(moonHalo);

  // Lightweight starfield (140 stars, 1 draw call)
  const starCount = 140;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i += 1) {
    const theta = (i * 2.39996) % (Math.PI * 2);
    const phi = 0.18 + ((i * 0.61803) % 0.65) * Math.PI * 0.5;
    const r = 135 + (i % 5) * 8;
    positions[i * 3] = r * Math.cos(phi) * Math.cos(theta);
    positions[i * 3 + 1] = Math.abs(r * Math.sin(phi)) + 14;
    positions[i * 3 + 2] = r * Math.cos(phi) * Math.sin(theta);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0xfff6c2, size: 1.1, sizeAttenuation: true })
  );
  group.add(stars);

  return group;
}

function createCloudSea() {
  const group = new THREE.Group();
  group.name = 'decorative-cloud-sea';

  const cloudMat = new THREE.MeshBasicMaterial({
    color: COLORS.cloud,
    transparent: true,
    opacity: 0.42,
    depthWrite: false
  });
  const cloudGeo = new THREE.SphereGeometry(1, 7, 5);
  const count = 120;
  const clouds = new THREE.InstancedMesh(cloudGeo, cloudMat, count);
  clouds.frustumCulled = false;
  clouds.renderOrder = 1;

  for (let i = 0; i < count; i += 1) {
    const cluster = Math.floor(i / 3);
    const blob = i % 3;
    const angle = (cluster / (count / 3)) * TAU + seeded01(cluster, 2) * 0.14;
    const radius = 50 + (cluster % 3) * 18 + seeded01(cluster, 3) * 12;
    const scale = 2.3 + seeded01(i, 5) * 2.1;
    const tangentOffset = (blob - 1) * scale * 1.15;
    dummy.position.set(
      Math.cos(angle) * radius - Math.sin(angle) * tangentOffset,
      -8.1 + (blob === 1 ? 0.55 : 0) + seeded01(cluster, 7) * 0.7,
      Math.sin(angle) * radius + Math.cos(angle) * tangentOffset
    );
    dummy.rotation.set(
      seeded01(i, 11) * 0.35,
      seeded01(i, 13) * TAU,
      seeded01(i, 17) * 0.25
    );
    dummy.scale.set(scale * (1.25 + seeded01(i, 19) * 0.45), scale * 0.55, scale);
    dummy.updateMatrix();
    clouds.setMatrixAt(i, dummy.matrix);
  }
  clouds.instanceMatrix.needsUpdate = true;
  group.add(clouds);

  const mist = new THREE.Mesh(
    new THREE.RingGeometry(42, 138, 64),
    new THREE.MeshBasicMaterial({
      color: COLORS.cloudWarm,
      transparent: true,
      opacity: 0.07,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  mist.rotation.x = -Math.PI / 2;
  mist.position.y = -5.8;
  group.add(mist);
  return group;
}

function createPlayerMesh(warmGlowTex) {
  const group = new THREE.Group();
  group.name = 'May';

  const cloakMat = makeLambert(COLORS.mayCloak);
  const clothDarkMat = makeLambert(0xb8aa98);
  const skinMat = makeLambert(0xf1c9a5);
  const hairMat = makeLambert(0x30251f);
  const scarfMat = makeLambert(COLORS.mayScarf);
  const hatMat = makeLambert(COLORS.sand);

  const body = new THREE.Mesh(new THREE.ConeGeometry(0.46, 1.05, 8), cloakMat);
  body.position.y = 0.58;
  body.castShadow = true;
  group.add(body);

  const hem = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.055, 5, 8), clothDarkMat);
  hem.rotation.x = Math.PI / 2;
  hem.position.y = 0.1;
  group.add(hem);

  for (const side of [-1, 1]) {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.28), clothDarkMat);
    foot.position.set(side * 0.18, 0.08, 0.08);
    group.add(foot);
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.38, 3, 6), cloakMat);
    sleeve.position.set(side * 0.39, 0.72, 0.02);
    sleeve.rotation.z = side * -0.38;
    group.add(sleeve);
  }

  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.075, 6, 10), scarfMat);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.05;
  group.add(scarf);

  const scarfTail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.58, 0.055), scarfMat);
  scarfTail.position.set(-0.25, 0.79, -0.23);
  scarfTail.rotation.z = -0.18;
  group.add(scarfTail);

  const head = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.255, 1),
    skinMat
  );
  head.position.y = 1.28;
  head.castShadow = true;
  group.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.265, 8, 5, 0, TAU, 0, Math.PI * 0.55), hairMat);
  hair.position.y = 1.35;
  group.add(hair);

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x332622 });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 4), eyeMat);
    eye.position.set(side * 0.08, 1.3, 0.235);
    group.add(eye);
  }

  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.055, 12), hatMat);
  hatBrim.position.y = 1.48;
  const hatTop = new THREE.Mesh(new THREE.ConeGeometry(0.39, 0.28, 12), hatMat);
  hatTop.position.y = 1.63;
  group.add(hatBrim, hatTop);

  const miniLantern = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.085, 0.22, 8),
    new THREE.MeshBasicMaterial({ color: COLORS.lanternCore })
  );
  miniLantern.position.set(0.42, 0.62, 0.2);
  group.add(miniLantern);

  const lanternHandle = new THREE.Mesh(
    new THREE.TorusGeometry(0.11, 0.018, 5, 8, Math.PI),
    makeLambert(COLORS.woodDark)
  );
  lanternHandle.position.set(0.42, 0.76, 0.2);
  group.add(lanternHandle);

  const miniGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: warmGlowTex,
      color: COLORS.lanternLit,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  miniGlow.position.copy(miniLantern.position);
  miniGlow.scale.set(1.35, 1.35, 1);
  group.add(miniGlow);

  const playerLight = new THREE.PointLight(COLORS.lanternLit, 1.4, 11, 1.5);
  playerLight.position.set(0.42, 0.72, 0.2);
  group.add(playerLight);

  return { group, cloakMat, scarfTail, miniLantern };
}

function createLanternMesh(id, pos, safeRadius, glowTexture, warmHaloTex) {
  const group = new THREE.Group();
  group.name = `Lantern-${id}`;
  group.position.set(pos[0], pos[1], pos[2]);

  const woodMat = makeLambert(COLORS.woodDark);
  const roofMat = makeLambert(0x8f382f);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 2.2, 8), woodMat);
  post.position.y = 1.1;
  post.castShadow = true;
  group.add(post);

  const platform = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.14, 8), woodMat);
  platform.position.y = 1.84;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.82, 0.5, 8), roofMat);
  roof.position.y = 2.84;
  const roofCap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 0.3, 6), woodMat);
  roofCap.position.y = 3.18;
  group.add(platform, roof, roofCap);

  const coreMat = new THREE.MeshLambertMaterial({
    color: COLORS.lanternUnlit,
    emissive: 0x000000,
    emissiveIntensity: 0,
    flatShading: true
  });
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.31, 0.72, 8), coreMat);
  core.position.y = 2.28;
  group.add(core);

  for (const y of [1.91, 2.65]) {
    const frame = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.035, 5, 8), woodMat);
    frame.rotation.x = Math.PI / 2;
    frame.position.y = y;
    group.add(frame);
  }
  for (let i = 0; i < 4; i += 1) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.73, 0.035), woodMat);
    const a = (i / 4) * TAU + Math.PI / 4;
    bar.position.set(Math.cos(a) * 0.34, 2.28, Math.sin(a) * 0.34);
    group.add(bar);
  }

  const haloMat = new THREE.SpriteMaterial({
    map: warmHaloTex,
    color: COLORS.lanternLit,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const halo = new THREE.Sprite(haloMat);
  halo.position.y = 2.28;
  halo.scale.set(5.2, 5.2, 1);
  group.add(halo);

  const safeMat = new THREE.MeshBasicMaterial({
    map: glowTexture,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const safeRing = new THREE.Mesh(
    new THREE.CircleGeometry(safeRadius, 32),
    safeMat
  );
  safeRing.rotation.x = -Math.PI / 2;
  safeRing.position.y = 0.05;
  group.add(safeRing);

  const fuelGroup = new THREE.Group();
  fuelGroup.position.y = 3.55;
  const fuelBack = new THREE.Mesh(
    new THREE.PlaneGeometry(1.34, 0.2),
    new THREE.MeshBasicMaterial({ color: 0x120a1a, transparent: true, opacity: 0.82, depthWrite: false })
  );
  const fuelMat = new THREE.MeshBasicMaterial({ color: COLORS.lanternLit, depthWrite: false });
  const fuelFill = new THREE.Mesh(new THREE.PlaneGeometry(1.22, 0.11), fuelMat);
  fuelFill.position.z = 0.01;
  fuelGroup.add(fuelBack, fuelFill);
  fuelGroup.visible = false;
  group.add(fuelGroup);

  const tear = new THREE.Mesh(
    new THREE.PlaneGeometry(0.06, 0.55),
    new THREE.MeshBasicMaterial({ color: 0x261c22, side: THREE.DoubleSide })
  );
  tear.position.set(0.08, 2.28, 0.335);
  tear.rotation.z = 0.48;
  tear.visible = true;
  group.add(tear);

  return { id, group, core, coreMat, haloMat, safeMat, fuelGroup, fuelFill, fuelMat, tear };
}

function createMoteMesh(pos, warmHaloTex) {
  const group = new THREE.Group();
  group.position.set(pos[0], pos[1] + 0.65, pos[2]);

  const coreMat = new THREE.MeshBasicMaterial({ color: COLORS.moteCore });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), coreMat);
  group.add(core);

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: warmHaloTex,
      color: COLORS.moteGlow,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  glow.scale.set(1.35, 1.35, 1);
  group.add(glow);

  return { group, core, coreMat };
}

function createShadeMesh(purpleAuraTex) {
  const group = new THREE.Group();
  group.name = 'Shade';

  const bodyMat = new THREE.MeshLambertMaterial({
    color: COLORS.shadeBody,
    emissive: COLORS.shadeRim,
    emissiveIntensity: 0.65
  });
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.58, 1.42, 7), bodyMat);
  body.position.y = 0.7;
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 1), bodyMat);
  head.scale.set(1, 0.82, 0.86);
  head.position.y = 1.35;
  group.add(body, head);

  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 5), bodyMat);
    horn.position.set(side * 0.3, 1.7, 0);
    horn.rotation.z = side * -0.48;
    group.add(horn);
  }

  const tendrilMat = makeLambert(0x281136, { emissive: COLORS.shadeRim, emissiveIntensity: 0.25 });
  for (let i = 0; i < 3; i += 1) {
    const tendril = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.65, 5), tendrilMat);
    tendril.position.set((i - 1) * 0.28, 0.18, -0.04);
    tendril.rotation.z = (i - 1) * 0.22;
    group.add(tendril);
  }

  const auraMat = new THREE.MeshBasicMaterial({
    map: purpleAuraTex,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const aura = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1), auraMat);
  aura.rotation.x = -Math.PI / 2;
  aura.position.y = 0.06;
  group.add(aura);

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff5a5f });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 6, 6), eyeMat);
  eyeL.position.set(-0.14, 1.39, 0.34);
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.065, 6, 6), eyeMat);
  eyeR.position.set(0.14, 1.39, 0.34);
  group.add(eyeL, eyeR);

  return { group, bodyMat, auraMat, eyeMat };
}

function createDrifterMesh() {
  const group = new THREE.Group();
  group.name = 'Drifter';
  const mat = new THREE.MeshLambertMaterial({
    color: COLORS.drifter,
    emissive: 0x3b4f66,
    emissiveIntensity: 0.65,
    side: THREE.DoubleSide
  });
  const ribbon = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.25, 6, 1, true), mat);
  ribbon.position.y = 0.85;
  ribbon.rotation.z = Math.PI;
  const mask = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.3, 1),
    makeLambert(0xd0d9df, { emissive: 0x58708a, emissiveIntensity: 0.25 })
  );
  mask.scale.set(0.8, 1.1, 0.45);
  mask.position.set(0, 1.35, 0.26);
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 5, 4),
    new THREE.MeshBasicMaterial({ color: COLORS.lanternCore })
  );
  eye.position.set(0, 1.38, 0.4);
  group.add(ribbon, mask, eye);
  return { group, ribbon, mat };
}

function createCharmMesh(pos) {
  const group = new THREE.Group();
  group.position.set(pos[0], pos[1] + 0.9, pos[2]);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.75, 0.08),
    new THREE.MeshLambertMaterial({
      color: COLORS.mayScarf,
      emissive: COLORS.mayScarf,
      emissiveIntensity: 0.45
    })
  );
  const border = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.82, 0.05),
    new THREE.MeshLambertMaterial({
      color: COLORS.gold,
      emissive: COLORS.gold,
      emissiveIntensity: 0.4
    })
  );
  group.add(border, body);
  return { group };
}

function addCozyTrees(group, positions) {
  const count = positions.length;
  const trunkGeo = new THREE.CylinderGeometry(0.15, 0.24, 1.3, 6);
  const crownLowGeo = new THREE.DodecahedronGeometry(0.9, 0);
  const crownHighGeo = new THREE.IcosahedronGeometry(0.68, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, makeLambert(COLORS.wood), count);
  const crownsLow = new THREE.InstancedMesh(crownLowGeo, makeLambert(COLORS.grassDark), count);
  const crownsHigh = new THREE.InstancedMesh(crownHighGeo, makeLambert(COLORS.grassLight), count);

  positions.forEach(([x, y, z, scale], i) => {
    const turn = seeded01(i, x + z) * TAU;
    dummy.rotation.set(0, turn, 0);
    dummy.position.set(x, y + 0.65 * scale, z);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, y + 1.68 * scale, z);
    dummy.rotation.y = turn + 0.3;
    dummy.scale.set(scale * 1.12, scale * 0.88, scale * 1.05);
    dummy.updateMatrix();
    crownsLow.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x + Math.cos(turn) * 0.38 * scale, y + 2.28 * scale, z + Math.sin(turn) * 0.38 * scale);
    dummy.rotation.y = turn - 0.2;
    dummy.scale.set(scale * 0.92, scale * 0.82, scale * 0.9);
    dummy.updateMatrix();
    crownsHigh.setMatrixAt(i, dummy.matrix);
  });
  trunks.castShadow = true;
  crownsLow.castShadow = true;
  trunks.instanceMatrix.needsUpdate = true;
  crownsLow.instanceMatrix.needsUpdate = true;
  crownsHigh.instanceMatrix.needsUpdate = true;
  group.add(trunks, crownsLow, crownsHigh);
}

function addGroundDetails(group, centers, radius, seed = 1) {
  const grassCount = Math.max(32, Math.round(radius * 2.1));
  const grass = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.12, 0.48, 4),
    makeLambert(COLORS.grassLight),
    grassCount
  );
  const rocks = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.55, 0),
    makeLambert(COLORS.stone),
    Math.max(12, Math.round(radius * 0.45))
  );

  for (let i = 0; i < grassCount; i += 1) {
    const center = centers[i % centers.length];
    const angle = seeded01(i, seed + 2) * TAU;
    const r = 4 + seeded01(i, seed + 3) * Math.max(5, radius - 7);
    dummy.position.set(center[0] + Math.cos(angle) * r, center[1] + 0.22, center[2] + Math.sin(angle) * r);
    dummy.rotation.set(0, seeded01(i, seed + 5) * TAU, (seeded01(i, seed + 7) - 0.5) * 0.18);
    const s = 0.72 + seeded01(i, seed + 11) * 0.75;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    grass.setMatrixAt(i, dummy.matrix);
  }
  const rockCount = rocks.count;
  for (let i = 0; i < rockCount; i += 1) {
    const center = centers[i % centers.length];
    const angle = seeded01(i, seed + 13) * TAU;
    const r = radius * (0.58 + seeded01(i, seed + 17) * 0.34);
    dummy.position.set(center[0] + Math.cos(angle) * r, center[1] + 0.28, center[2] + Math.sin(angle) * r);
    dummy.rotation.set(seeded01(i, 19), seeded01(i, seed + 23) * TAU, seeded01(i, 29));
    const s = 0.5 + seeded01(i, seed + 31) * 0.95;
    dummy.scale.set(s * 1.25, s * 0.72, s);
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
  }
  grass.instanceMatrix.needsUpdate = true;
  rocks.instanceMatrix.needsUpdate = true;
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  grass.userData.hideInLightMode = true;
  rocks.userData.hideInLightMode = true;
  group.add(grass, rocks);
}

function buildIslandDisk(radius, x, y, z, height = 2.4) {
  const group = new THREE.Group();
  const rockBase = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.99, radius * 0.69, height + 4.8, 32),
    makeLambert(COLORS.stoneDark)
  );
  rockBase.position.set(x, y - (height + 4.8) / 2, z);
  rockBase.receiveShadow = true;
  group.add(rockBase);

  const soil = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 0.96, height, 36),
    makeLambert(0x5a4b39)
  );
  soil.position.set(x, y - height / 2, z);
  soil.receiveShadow = true;
  group.add(soil);

  const grassTop = new THREE.Mesh(
    new THREE.CylinderGeometry(radius - 0.55, radius - 0.25, 0.38, 36),
    makeLambert(COLORS.grass)
  );
  grassTop.position.set(x, y - 0.12, z);
  grassTop.receiveShadow = true;
  group.add(grassTop);

  const rim = new THREE.Mesh(
    new THREE.RingGeometry(Math.max(0.5, radius - 2.1), radius - 0.18, 36),
    makeLambert(COLORS.sand, { side: THREE.DoubleSide })
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.set(x, y + 0.085, z);
  rim.receiveShadow = true;
  group.add(rim);

  return group;
}

function buildLaunchPadMesh(pad) {
  const group = new THREE.Group();
  group.position.set(pad.pos[0], pad.pos[1] + 0.06, pad.pos[2]);
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(pad.radius, pad.radius * 1.1, 0.14, 16),
    new THREE.MeshLambertMaterial({
      color: COLORS.gold,
      emissive: COLORS.lanternLit,
      emissiveIntensity: 0.75
    })
  );
  group.add(disc);
  return group;
}

function buildTerrainForNight(night, map) {
  const group = new THREE.Group();
  group.name = `Night-${night}-terrain`;

  const sea = new THREE.Mesh(
    new THREE.CylinderGeometry(240, 240, 1, 32),
    new THREE.MeshBasicMaterial({ color: COLORS.cloudSea })
  );
  sea.position.y = -11;
  group.add(sea);
  group.add(createCloudSea());

  if (night === 1) {
    group.add(buildIslandDisk(40, 0, 0, 0, 4));
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x5d687d });
    const woodMat = new THREE.MeshLambertMaterial({ color: COLORS.wood });
    for (const sx of [-2.4, 2.4]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.45, 2.5, 0.45), stoneMat);
      col.position.set(sx, 1.25, 22.8);
      group.add(col);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.35, 0.55), woodMat);
    beam.position.set(0, 2.55, 22.8);
    group.add(beam);
    addCozyTrees(group, [
      [-12, 0, 18, 1.1],
      [14, 0, 16, 0.95],
      [27, 0, -4, 1.2],
      [-26, 0, -8, 1.15],
      [8, 0, -28, 1.05],
      [-9, 0, -29, 0.9],
      [21, 0, 23, 0.8],
      [-22, 0, 25, 0.78]
    ]);
    addGroundDetails(group, [[0, 0, 0]], 39, 11);
  } else if (night === 2) {
    group.add(buildIslandDisk(28, 0, 0, 0, 4));
    group.add(buildIslandDisk(28, 70, 0, 0, 4));

    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(18, 0.35, 4),
      new THREE.MeshLambertMaterial({ color: COLORS.wood })
    );
    bridge.position.set(35, -0.17, 0);
    bridge.receiveShadow = true;
    group.add(bridge);

    for (const pad of map.launchPads) {
      group.add(buildLaunchPadMesh(pad));
    }
    addCozyTrees(group, [
      [-14, 0, 14, 1.1],
      [12, 0, -18, 1.0],
      [58, 0, 16, 1.15],
      [82, 0, 12, 1.0],
      [76, 0, -18, 1.2],
      [-18, 0, -10, 0.82],
      [88, 0, -8, 0.86]
    ]);
    addGroundDetails(group, [[0, 0, 0], [70, 0, 0]], 27, 23);
  } else if (night === 3) {
    group.add(buildIslandDisk(45, 0, 0, 0, 4));

    const shape = new THREE.Shape();
    shape.absarc(0, 0, 24, 0, Math.PI, false);
    shape.lineTo(-12, 0);
    shape.absarc(0, 0, 12, Math.PI, 0, true);
    shape.closePath();

    const tier1Geo = new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: false });
    tier1Geo.rotateX(Math.PI / 2);
    const tier1 = new THREE.Mesh(
      tier1Geo,
      new THREE.MeshLambertMaterial({ color: COLORS.grass })
    );
    tier1.position.y = 3;
    tier1.receiveShadow = true;
    group.add(tier1);

    group.add(buildIslandDisk(8, 0, 6, 0, 6));

    const rampLength = Math.hypot(6, 3);
    const rampPitch = Math.atan2(3, 6);
    for (const deg of [30, 150]) {
      const rad = (deg * Math.PI) / 180;
      const rampHolder = new THREE.Group();
      rampHolder.rotation.y = -rad;
      const ramp = new THREE.Mesh(
        new THREE.BoxGeometry(rampLength, 0.3, 3),
        new THREE.MeshLambertMaterial({ color: COLORS.wood })
      );
      ramp.position.set(27, 1.45, 0);
      ramp.rotation.z = -rampPitch;
      ramp.receiveShadow = true;
      rampHolder.add(ramp);
      group.add(rampHolder);
    }

    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(1.85, 2.0, 8, 12),
      new THREE.MeshLambertMaterial({ color: COLORS.wood })
    );
    tower.position.set(0, 10, 0);
    tower.castShadow = true;
    group.add(tower);

    const towerRoof = new THREE.Mesh(
      new THREE.ConeGeometry(2.6, 2.2, 8),
      new THREE.MeshLambertMaterial({ color: COLORS.mayScarf })
    );
    towerRoof.position.set(0, 15.1, 0);
    group.add(towerRoof);

    const bell = new THREE.Mesh(
      new THREE.ConeGeometry(0.65, 0.9, 10),
      new THREE.MeshLambertMaterial({
        color: COLORS.gold,
        emissive: COLORS.lanternLit,
        emissiveIntensity: 0.35
      })
    );
    bell.position.set(0, 12.2, 0);
    group.add(bell);

    for (const pad of map.launchPads) {
      group.add(buildLaunchPadMesh(pad));
    }
    addCozyTrees(group, [
      [-32, 0, 12, 1.1],
      [32, 0, 12, 1.1],
      [-28, 0, -24, 1.2],
      [28, 0, -24, 1.2],
      [-16, 0, 31, 0.82],
      [17, 0, 32, 0.86]
    ]);
    addGroundDetails(group, [[0, 0, 0]], 44, 37);
  }

  return group;
}

export function createWorldView(scene, initialSim, camera = null) {
  const glowTexture = createSoftGlowTexture(
    'rgba(255, 233, 176, 0.92)',
    'rgba(255, 179, 71, 0.50)',
    'rgba(255, 179, 71, 0.16)'
  );
  const warmHaloTex = createSoftGlowTexture(
    'rgba(255, 246, 194, 0.95)',
    'rgba(255, 179, 71, 0.45)',
    'rgba(255, 179, 71, 0.08)'
  );
  const purpleAuraTex = createSoftGlowTexture(
    'rgba(122, 60, 255, 0.72)',
    'rgba(18, 10, 26, 0.55)',
    'rgba(122, 60, 255, 0.12)'
  );

  scene.add(createStarfieldAndMoon(warmHaloTex));

  const hemiLight = new THREE.HemisphereLight(0xb9d0ff, 0x35433a, 0.42);
  scene.add(hemiLight);

  const moonLight = new THREE.DirectionalLight(0xffe1b0, 1.18);
  moonLight.position.set(30, 50, 24);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(512, 512);
  moonLight.shadow.camera.near = 5;
  moonLight.shadow.camera.far = 150;
  moonLight.shadow.camera.left = -60;
  moonLight.shadow.camera.right = 90;
  moonLight.shadow.camera.top = 60;
  moonLight.shadow.camera.bottom = -60;
  scene.add(moonLight);

  // Pool a fixed number of local lights so warm lantern falloff has a stable cost.
  const lanternLights = [0, 1].map(() => {
    const light = new THREE.PointLight(COLORS.lanternLit, 0, 17, 1.75);
    light.castShadow = false;
    scene.add(light);
    return light;
  });

  const player = createPlayerMesh(warmHaloTex);
  scene.add(player.group);

  let terrainGroup = null;
  const lanternViews = new Map();
  const moteViews = new Map();
  const shadeViews = new Map();
  const drifterViews = new Map();
  const charmViews = new Map();

  // Instanced fast-path for Motes (up to 128) & Shades (up to 256)
  const MAX_MOTES_INST = 128;
  const moteInstGeo = new THREE.OctahedronGeometry(0.2, 0);
  const moteInstMat = new THREE.MeshBasicMaterial({ color: COLORS.moteCore });
  const moteInstMesh = new THREE.InstancedMesh(moteInstGeo, moteInstMat, MAX_MOTES_INST);
  moteInstMesh.count = 0;
  moteInstMesh.frustumCulled = false;
  scene.add(moteInstMesh);

  const MAX_SHADES_INST = 256;
  const shadeInstGeo = new THREE.ConeGeometry(0.52, 1.55, 8);
  const shadeInstMat = new THREE.MeshLambertMaterial({
    color: COLORS.shadeBody,
    emissive: COLORS.shadeRim,
    emissiveIntensity: 0.72
  });
  const shadeInstMesh = new THREE.InstancedMesh(shadeInstGeo, shadeInstMat, MAX_SHADES_INST);
  shadeInstMesh.count = 0;
  shadeInstMesh.frustumCulled = false;
  scene.add(shadeInstMesh);

  const instDummy = new THREE.Object3D();

  const windLeaves = [];
  const leafGeo = new THREE.PlaneGeometry(0.32, 0.18);
  const leafMat = new THREE.MeshBasicMaterial({
    color: 0x8fa3b8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8
  });
  for (let i = 0; i < 36; i += 1) {
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.visible = false;
    scene.add(leaf);
    windLeaves.push({
      mesh: leaf,
      offset: [(Math.random() - 0.5) * 28, 0.5 + Math.random() * 5, (Math.random() - 0.5) * 28]
    });
  }

  const pulseRing = new THREE.Mesh(
    new THREE.RingGeometry(0.4, 0.7, 36),
    new THREE.MeshBasicMaterial({
      color: COLORS.lanternCore,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  pulseRing.rotation.x = -Math.PI / 2;
  pulseRing.visible = false;
  scene.add(pulseRing);
  let pulseAnim = { active: false, t: 0, maxRadius: 5 };
  let lightMode = false;
  let accessiblePalette = false;

  function clearMap(map) {
    for (const v of map.values()) {
      scene.remove(v.group);
    }
    map.clear();
  }

  function rebuildForSim(sim) {
    if (terrainGroup) scene.remove(terrainGroup);
    clearMap(lanternViews);
    clearMap(moteViews);
    clearMap(shadeViews);
    clearMap(drifterViews);
    clearMap(charmViews);

    terrainGroup = buildTerrainForNight(sim.night, sim.map);
    scene.add(terrainGroup);
    if (lightMode) {
      terrainGroup.traverse((object) => {
        if (object.userData.hideInLightMode) object.visible = false;
      });
    }

    for (const l of sim.lanterns) {
      const lv = createLanternMesh(
        l.id,
        l.pos,
        sim.tuning.safe_radius,
        glowTexture,
        warmHaloTex
      );
      scene.add(lv.group);
      lanternViews.set(l.id, lv);
    }

    for (const c of sim.charms) {
      const cv = createCharmMesh(c.pos);
      scene.add(cv.group);
      charmViews.set(c.id, cv);
    }
  }

  rebuildForSim(initialSim);

  function setLightMode(enabled) {
    lightMode = enabled;
    moonLight.castShadow = !enabled;
    if (terrainGroup) {
      terrainGroup.traverse((object) => {
        if (object.userData.hideInLightMode) object.visible = !enabled;
      });
    }
    if (enabled) lanternLights.forEach((light) => { light.intensity = 0; });
  }

  function setAccessiblePalette(enabled) {
    accessiblePalette = Boolean(enabled);
  }

  function triggerPulseEffect(origin, radius) {
    pulseAnim = { active: true, t: 0, maxRadius: radius };
    pulseRing.position.set(origin[0], origin[1] + 0.15, origin[2]);
    pulseRing.visible = true;
  }

  function sync(sim, elapsedSec, dt) {
    const litCount = sim.lanterns.filter((l) => l.lit).length;
    const totalLanterns = Math.max(1, sim.lanterns.length);
    const progress = litCount / totalLanterns;

    // Island brightens warmly as lanterns are lit (exact Ticket-02 formula)
    hemiLight.intensity = 0.42 + 0.38 * progress;
    hemiLight.color.setHex(0xa3c0ff).lerp(new THREE.Color(0xffd28a), progress * 0.45);
    moonLight.intensity = 1.18 + 0.22 * progress;

    const nearestLit = sim.lanterns
      .filter((lantern) => lantern.lit)
      .map((lantern) => ({
        lantern,
        distSq: (lantern.pos[0] - sim.player.pos[0]) ** 2 +
          (lantern.pos[2] - sim.player.pos[2]) ** 2
      }))
      .sort((a, b) => a.distSq - b.distSq);
    lanternLights.forEach((light, index) => {
      const entry = nearestLit[index];
      if (!lightMode && entry) {
        const fuelRatio = Math.max(0, Math.min(1, entry.lantern.fuelUnits / (sim.tuning.fuel_max * 60)));
        light.position.set(entry.lantern.pos[0], entry.lantern.pos[1] + 2.3, entry.lantern.pos[2]);
        light.intensity = (1.1 + 0.55 * fuelRatio) +
          Math.sin(elapsedSec * 3.1 + index * 2.2) * 0.1;
      } else {
        light.intensity = 0;
      }
    });

    // Player
    player.group.visible = sim.player.respawnTicks === 0;
    player.group.position.set(sim.player.pos[0], sim.player.pos[1], sim.player.pos[2]);
    player.group.rotation.y = (sim.player.facingYawDeg * Math.PI) / 180;
    player.scarfTail.rotation.x = Math.sin(elapsedSec * 5.5) * 0.12;
    player.scarfTail.rotation.z = -0.18 + Math.sin(elapsedSec * 3.4) * 0.08;
    player.miniLantern.rotation.y = Math.sin(elapsedSec * 4.2) * 0.16;
    if (sim.player.invulnTicks > 0) {
      player.cloakMat.emissive.setHex(COLORS.gold);
      player.cloakMat.emissiveIntensity = Math.sin(elapsedSec * 22) > 0 ? 0.55 : 0.08;
    } else if (sim.player.charmTicks > 0) {
      player.cloakMat.emissive.setHex(COLORS.mayScarf);
      player.cloakMat.emissiveIntensity = 0.35;
    } else {
      player.cloakMat.emissive.setHex(0x000000);
      player.cloakMat.emissiveIntensity = 0;
    }

    // Lanterns
    for (const l of sim.lanterns) {
      const lv = lanternViews.get(l.id);
      if (!lv) continue;
      if (l.lit) {
        const fuelRatio = Math.max(0, Math.min(1, l.fuelUnits / (sim.tuning.fuel_max * 60)));
        const lowFuel = l.fuelUnits < sim.tuning.low_fuel_threshold * 60;
        const blink = !lowFuel || Math.sin(elapsedSec * Math.PI * 2) >= 0;
        lv.coreMat.color.setHex(COLORS.lanternCore);
        lv.coreMat.emissive.setHex(COLORS.lanternLit);
        lv.coreMat.emissiveIntensity = blink ? 0.55 + 1.45 * fuelRatio : 0.08;
        lv.haloMat.opacity = blink
          ? (0.28 + 0.5 * fuelRatio + Math.sin(elapsedSec * 2.5 + l.pos[0]) * 0.06)
          : 0.06;
        lv.safeMat.opacity = lowFuel ? 0 : 0.52;
        lv.core.scale.set(1, 1, 1);
        lv.tear.visible = false;
        lv.fuelGroup.visible = blink;
        if (camera) lv.fuelGroup.quaternion.copy(camera.quaternion);
        lv.fuelFill.scale.x = Math.max(0.001, fuelRatio);
        lv.fuelFill.position.x = -0.61 * (1 - fuelRatio);
        lv.fuelMat.color.setHex(lowFuel
          ? (accessiblePalette ? 0xffffff : 0xff5a5f)
          : COLORS.lanternLit);
      } else {
        lv.coreMat.color.setHex(COLORS.lanternUnlit);
        lv.coreMat.emissive.setHex(COLORS.lanternLit);
        lv.coreMat.emissiveIntensity = l.deposited > 0 ? 0.4 : 0.05;
        lv.haloMat.opacity = l.deposited > 0 ? 0.2 : 0.0;
        lv.safeMat.opacity = 0;
        lv.core.scale.set(1, 0.8, 1);
        lv.tear.visible = true;
        lv.fuelGroup.visible = false;
      }
    }

    // Motes (InstancedMesh when > 30 for bench, else detailed sprites)
    if (sim.benchMode || sim.motes.length > 35) {
      if (moteViews.size > 0) clearMap(moteViews);
      let mIdx = 0;
      for (const m of sim.motes) {
        if (!m.active || mIdx >= MAX_MOTES_INST) continue;
        instDummy.position.set(
          m.pos[0],
          m.pos[1] + 0.65 + Math.sin(elapsedSec * 3.2 + m.pos[0]) * 0.14,
          m.pos[2]
        );
        instDummy.rotation.set(0, elapsedSec * 1.8 + m.pos[0], 0);
        instDummy.scale.set(1, 1, 1);
        instDummy.updateMatrix();
        moteInstMesh.setMatrixAt(mIdx, instDummy.matrix);
        mIdx += 1;
      }
      moteInstMesh.count = mIdx;
      moteInstMesh.instanceMatrix.needsUpdate = true;
    } else {
      moteInstMesh.count = 0;
      const activeMoteIds = new Set();
      for (const m of sim.motes) {
        if (!m.active) continue;
        activeMoteIds.add(m.id);
        let mv = moteViews.get(m.id);
        if (!mv) {
          mv = createMoteMesh(m.pos, warmHaloTex);
          scene.add(mv.group);
          moteViews.set(m.id, mv);
        }
        mv.group.position.set(
          m.pos[0],
          m.pos[1] + 0.65 + Math.sin(elapsedSec * 3.2 + m.pos[0]) * 0.14,
          m.pos[2]
        );
        mv.core.rotation.y += dt * 1.8;
      }
      for (const [id, mv] of moteViews.entries()) {
        if (!activeMoteIds.has(id)) {
          scene.remove(mv.group);
          moteViews.delete(id);
        }
      }
    }

    // Shades (InstancedMesh when > 20 for bench, else detailed meshes)
    if (sim.benchMode || sim.shades.length > 20) {
      if (shadeViews.size > 0) clearMap(shadeViews);
      shadeInstMat.emissive.setHex(accessiblePalette ? 0x00b3ff : COLORS.shadeRim);
      let sIdx = 0;
      for (const s of sim.shades) {
        if (sIdx >= MAX_SHADES_INST) break;
        instDummy.position.set(s.pos[0], s.pos[1] + 0.78, s.pos[2]);
        instDummy.rotation.set(0, s.wanderAngle || 0, 0);
        instDummy.scale.set(1, 1, 1);
        instDummy.updateMatrix();
        shadeInstMesh.setMatrixAt(sIdx, instDummy.matrix);
        sIdx += 1;
      }
      shadeInstMesh.count = sIdx;
      shadeInstMesh.instanceMatrix.needsUpdate = true;
    } else {
      shadeInstMesh.count = 0;
      const activeShadeIds = new Set();
      for (const s of sim.shades) {
        activeShadeIds.add(s.id);
        let sv = shadeViews.get(s.id);
        if (!sv) {
          sv = createShadeMesh(purpleAuraTex);
          scene.add(sv.group);
          shadeViews.set(s.id, sv);
        }
        sv.group.position.set(s.pos[0], s.pos[1], s.pos[2]);
        if (s.state === 'stunned') {
          sv.bodyMat.color.setHex(COLORS.shadeStunned);
          sv.bodyMat.emissive.setHex(COLORS.shadeStunned);
          sv.bodyMat.emissiveIntensity = 0.3;
          sv.auraMat.opacity = 0.18;
        } else {
          const shadeRim = accessiblePalette ? 0x00b3ff : COLORS.shadeRim;
          sv.bodyMat.color.setHex(COLORS.shadeBody);
          sv.bodyMat.emissive.setHex(shadeRim);
          sv.bodyMat.emissiveIntensity = 0.72;
          sv.auraMat.color.setHex(accessiblePalette ? 0x00b3ff : 0xffffff);
          sv.eyeMat.color.setHex(accessiblePalette ? 0x00b3ff : 0xff5a5f);
          sv.auraMat.opacity = 0.65 + Math.sin(elapsedSec * 4 + s.pos[0]) * 0.12;
        }
      }
      for (const [id, sv] of shadeViews.entries()) {
        if (!activeShadeIds.has(id)) {
          scene.remove(sv.group);
          shadeViews.delete(id);
        }
      }
    }

    // Drifters
    const activeDrifterIds = new Set();
    for (const d of sim.drifters) {
      if (d.state === 'removed') continue;
      activeDrifterIds.add(d.id);
      let dv = drifterViews.get(d.id);
      if (!dv) {
        dv = createDrifterMesh();
        scene.add(dv.group);
        drifterViews.set(d.id, dv);
      }
      dv.group.position.set(
        d.pos[0],
        d.pos[1] + Math.sin(elapsedSec * 5) * 0.18,
        d.pos[2]
      );
      dv.ribbon.rotation.y = elapsedSec * 2.5;
    }
    for (const [id, dv] of drifterViews.entries()) {
      if (!activeDrifterIds.has(id)) {
        scene.remove(dv.group);
        drifterViews.delete(id);
      }
    }

    // Charms
    for (const c of sim.charms) {
      const cv = charmViews.get(c.id);
      if (!cv) continue;
      cv.group.visible = c.available;
      if (c.available) {
        cv.group.rotation.y += dt * 2.0;
      }
    }

    // Wind leaves
    const showLeaves = sim.wind.warning || sim.wind.active;
    const wSpeed = sim.wind.active ? 14 : 5;
    for (const leaf of windLeaves) {
      leaf.mesh.visible = showLeaves;
      if (showLeaves) {
        leaf.offset[0] += sim.wind.dirVec[0] * wSpeed * dt;
        leaf.offset[2] += sim.wind.dirVec[1] * wSpeed * dt;
        if (Math.hypot(leaf.offset[0], leaf.offset[2]) > 22) {
          leaf.offset[0] = -sim.wind.dirVec[0] * 18 + (Math.random() - 0.5) * 12;
          leaf.offset[2] = -sim.wind.dirVec[1] * 18 + (Math.random() - 0.5) * 12;
        }
        leaf.mesh.position.set(
          sim.player.pos[0] + leaf.offset[0],
          sim.player.pos[1] + leaf.offset[1],
          sim.player.pos[2] + leaf.offset[2]
        );
        leaf.mesh.rotation.x += dt * 4;
        leaf.mesh.rotation.z += dt * 3;
      }
    }

    // Pulse ring animation
    if (pulseAnim.active) {
      pulseAnim.t += dt * 2.6;
      if (pulseAnim.t >= 1) {
        pulseAnim.active = false;
        pulseRing.visible = false;
      } else {
        const s = 1 + pulseAnim.t * (pulseAnim.maxRadius / 0.55);
        pulseRing.scale.set(s, s, 1);
        pulseRing.material.opacity = (1 - pulseAnim.t) * 0.85;
      }
    }
  }

  return {
    rebuildForSim,
    setLightMode,
    setAccessiblePalette,
    triggerPulseEffect,
    sync
  };
}
