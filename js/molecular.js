// ========================================================
// KİMYASAL OLAY YERİ UZMANI - 3 BOYUTLU MOLEKÜLER SİMÜLASYON MOTORU
// Three.js (WebGL) Destekli Atom-Molekül 3D Canlandırma Motoru
// COREY-PAULING-KOLTUN (CPK) ULUSLARARASI RENK STANDARDI
// Fare / Dokunmatik 360° Döndürme • Zoom • Video Eşzamanlı Simülasyon
// ========================================================

window.ThreeMolecularSimulator = (function () {
  'use strict';

  var renderer = null;
  var scene = null;
  var camera = null;
  var animFrameId = null;
  var container = null;
  var wrapElement = null;
  var rootGroup = null;
  var currentCase = null;
  var dynamicObjects = [];

  // Video Eşzamanlı Oynatma Motoru Değişkenleri
  var duration = 8.0;         // Saniye cinsinden video süresi
  var currentTime = 0.0;      // Geçerli simülasyon zamanı (0 - duration)
  var isPlaying = false;      // Oynatılıyor mu?
  var isEnded = false;        // Süre tamamlandı mı?
  var lastTimestamp = null;   // RAF delta time hesabı için
  var timeListeners = [];     // Zaman güncellemesi dinleyicileri
  var caseUpdater = null;     // Vaka bazlı 3D dönüşüm fonksiyonu (p, clock, isPlaying)

  // UI Referansları
  var startOverlayEl = null;
  var endOverlayEl = null;
  var canvasPlayBtn = null;
  var canvasScrubberFill = null;
  var canvasScrubberThumb = null;
  var canvasTimeBadge = null;
  var watermarkEl = null;

  // Fare / Dokunmatik Döndürme & Zoom Değişkenleri
  var isDragging = false;
  var previousMousePosition = { x: 0, y: 0 };
  var targetRotation = { x: 0.2, y: 0.4 };
  var currentRotation = { x: 0.2, y: 0.4 };
  var cameraDistance = 24;
  var targetCameraDistance = 24;
  var minDistance = 10;
  var maxDistance = 45;
  var autoRotate = true;

  // ========================================================
  // COREY-PAULING-KOLTUN (CPK) RESMİ KİMYASAL RENK STANDARDI
  // ========================================================
  var colors = {
    H: 0xffffff,       // Hidrojen (H): Beyaz (CPK)
    C: 0x222222,       // Karbon (C): Kömür Siyahı (CPK)
    N: 0x1d4ed8,       // Azot (N): Koyu Mavi (CPK)
    O: 0xdc2626,       // Oksijen (O): Kırmızı (CPK)
    Fe: 0xc85a17,      // Demir / Pas (Fe): Kızıl-Turuncu Pas (CPK)
    FeMetal: 0x94a3b8, // Metalik Saf Demir: Çelik Grisi
    Cu: 0xb87333,      // Bakır (Cu): Bronz / Bakır Rengi (CPK)
    Ca: 0x16a34a,      // Kalsiyum (Ca): Koyu Yeşil (CPK)
    Si: 0xdaa520,      // Silisyum (Si): Altın Sarısı / Hardal (CPK)
    S: 0xfacc15,       // Kükürt (S): Sarı (CPK)
    Enzyme: 0x7c3aed,  // Biyokimyasal Enzim / Polipeptit: Mor
    Bond: 0x64748b,    // Kovalent Bağ: Çelik Grisi
    HBond: 0x38bdf8    // Hidrojen Bağı: Buz Mavisi
  };

  // 3D Atom (Küre) Oluşturucu - CPK Çap Oranları
  function createAtom(r, color, x, y, z, isMetallic) {
    var geom = new THREE.SphereGeometry(r, 24, 24);
    var mat;
    if (isMetallic) {
      mat = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.88,
        roughness: 0.22
      });
    } else {
      mat = new THREE.MeshPhongMaterial({
        color: color,
        shininess: 85,
        specular: 0x555555
      });
    }
    var mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y, z);
    return mesh;
  }

  // 3D Kimyasal Bağ (Silindir) Oluşturucu
  function createBond(posA, posB, radius, color) {
    var vA = posA instanceof THREE.Vector3 ? posA : new THREE.Vector3(posA.x, posA.y, posA.z);
    var vB = posB instanceof THREE.Vector3 ? posB : new THREE.Vector3(posB.x, posB.y, posB.z);
    var dist = vA.distanceTo(vB);

    var geom = new THREE.CylinderGeometry(radius || 0.14, radius || 0.14, dist, 12);
    var mat = new THREE.MeshPhongMaterial({
      color: color || colors.Bond,
      shininess: 40
    });
    var cylinder = new THREE.Mesh(geom, mat);

    var mid = new THREE.Vector3().addVectors(vA, vB).multiplyScalar(0.5);
    cylinder.position.copy(mid);

    var dir = new THREE.Vector3().subVectors(vB, vA).normalize();
    var up = new THREE.Vector3(0, 1, 0);
    var quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
    cylinder.setRotationFromQuaternion(quat);

    return cylinder;
  }

  // 3D Kesikli Hidrojen Bağı
  function createDashedBond(posA, posB, color) {
    var vA = posA instanceof THREE.Vector3 ? posA : new THREE.Vector3(posA.x, posA.y, posA.z);
    var vB = posB instanceof THREE.Vector3 ? posB : new THREE.Vector3(posB.x, posB.y, posB.z);
    var numSegments = 5;
    var group = new THREE.Group();

    for (var i = 0; i < numSegments; i++) {
      if (i % 2 === 0) {
        var start = new THREE.Vector3().lerpVectors(vA, vB, i / numSegments);
        var end = new THREE.Vector3().lerpVectors(vA, vB, (i + 0.8) / numSegments);
        group.add(createBond(start, end, 0.08, color || colors.HBond));
      }
    }
    return group;
  }

  // Su Molekülü Grubu (H₂O) - CPK: O (Kırmızı, r=0.78), H (Beyaz, r=0.48)
  function createWaterMolecule(x, y, z) {
    var mol = new THREE.Group();
    var oAtom = createAtom(0.78, colors.O, 0, 0, 0, false);
    var h1Atom = createAtom(0.48, colors.H, -0.85, 0.62, 0, false);
    var h2Atom = createAtom(0.48, colors.H, 0.85, 0.62, 0, false);

    mol.add(oAtom);
    mol.add(h1Atom);
    mol.add(h2Atom);
    mol.add(createBond(oAtom.position, h1Atom.position, 0.12, colors.Bond));
    mol.add(createBond(oAtom.position, h2Atom.position, 0.12, colors.Bond));

    mol.position.set(x, y, z);
    return mol;
  }

  // Karbondioksit Molekülü (CO₂ - Doğrusal) - CPK: C (Siyah, r=0.74), O (Kırmızı, r=0.72)
  function createCO2Molecule(x, y, z) {
    var mol = new THREE.Group();
    var cAtom = createAtom(0.74, colors.C, 0, 0, 0, false);
    var o1Atom = createAtom(0.72, colors.O, -1.3, 0, 0, false);
    var o2Atom = createAtom(0.72, colors.O, 1.3, 0, 0, false);

    mol.add(cAtom);
    mol.add(o1Atom);
    mol.add(o2Atom);
    mol.add(createBond(cAtom.position, o1Atom.position, 0.15, colors.Bond));
    mol.add(createBond(cAtom.position, o2Atom.position, 0.15, colors.Bond));

    mol.position.set(x, y, z);
    return mol;
  }

  // Oksijen Gazı Molekülü (O₂) - CPK: O (Kırmızı, r=0.75)
  function createO2Molecule(x, y, z) {
    var mol = new THREE.Group();
    var o1 = createAtom(0.75, colors.O, -0.68, 0, 0, false);
    var o2 = createAtom(0.75, colors.O, 0.68, 0, 0, false);
    mol.add(o1);
    mol.add(o2);
    mol.add(createBond(o1.position, o2.position, 0.16, colors.Bond));
    mol.position.set(x, y, z);
    return mol;
  }

  // Hidrojen Gazı Molekülü (H₂) - CPK: H (Beyaz, r=0.48)
  function createH2Molecule(x, y, z) {
    var mol = new THREE.Group();
    var h1 = createAtom(0.48, colors.H, -0.45, 0, 0, false);
    var h2 = createAtom(0.48, colors.H, 0.45, 0, 0, false);
    mol.add(h1);
    mol.add(h2);
    mol.add(createBond(h1.position, h2.position, 0.12, colors.Bond));
    mol.position.set(x, y, z);
    return mol;
  }

  function formatTime(sec) {
    var s = Math.floor(sec || 0);
    var m = Math.floor(s / 60);
    s = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  // ========================================================
  // 12 VAKA İÇİN VİDEO EŞZAMANLI 3D MOLEKÜLER DÖNÜŞÜM MODELLERİ
  // Her vaka için p ∈ [0, 1] video zamanına bağlı fiziksel/kimyasal değişim
  // ========================================================

  function buildCaseScene(caseItem) {
    dynamicObjects = [];
    caseUpdater = null;
    var cid = caseItem.id;

    switch (cid) {
      case 1: {
        // DEMİRİN PASLANMASI (4Fe + 3O₂ ➔ 2Fe₂O₃) - 8 sn
        var feGrid = new THREE.Group();
        var rustItems = [];
        for (var x = -3; x <= 3; x += 1.8) {
          for (var z = -3; z <= 3; z += 1.8) {
            var fe1 = createAtom(0.8, colors.FeMetal, x, -2.5, z, true);
            var fe2 = createAtom(0.8, colors.FeMetal, x, -1.0, z, true);
            feGrid.add(fe1);
            feGrid.add(fe2);

            var isOxidized = (Math.abs(x) + Math.abs(z)) < 5.0;
            if (isOxidized) {
              var rustAtom = createAtom(0.82, colors.FeMetal, x, 0.5 + Math.sin(x * z) * 0.3, z, false);
              feGrid.add(rustAtom);
              var oAtom = createAtom(0.65, colors.O, x + 0.65, 1.3, z + 0.5, false);
              feGrid.add(oAtom);
              var b1 = createBond(rustAtom.position, oAtom.position, 0.14, colors.Fe);
              var b2 = createBond(fe2.position, rustAtom.position, 0.12, colors.Bond);
              feGrid.add(b1);
              feGrid.add(b2);
              rustItems.push({ rustAtom: rustAtom, oAtom: oAtom, b1: b1, b2: b2 });
            }
          }
        }
        rootGroup.add(feGrid);

        var o2List = [];
        for (var i = 0; i < 6; i++) {
          var o2 = createO2Molecule((Math.random() - 0.5) * 10, 4.0 + Math.random() * 2.5, (Math.random() - 0.5) * 10);
          rootGroup.add(o2);
          o2List.push({ mesh: o2, baseY: o2.position.y, baseX: o2.position.x });
        }

        caseUpdater = function (p, c) {
          rustItems.forEach(function (it) {
            var localP = Math.max(0, Math.min(1, (p - 0.08) / 0.88));
            it.oAtom.scale.set(localP, localP, localP);
            it.b1.scale.set(localP, localP, localP);
            it.b2.scale.set(localP, localP, localP);
            if (it.rustAtom.material && it.rustAtom.material.color) {
              var r = 0.58 + localP * 0.20;
              var g = 0.64 - localP * 0.29;
              var b = 0.72 - localP * 0.63;
              it.rustAtom.material.color.setRGB(r, g, b);
            }
          });
          o2List.forEach(function (it, idx) {
            var drop = p * 2.2;
            it.mesh.position.y = it.baseY - drop + Math.sin(c * 2 + idx) * 0.2;
            it.mesh.position.x = it.baseX + Math.sin(c + idx) * 0.3;
          });
        };
        break;
      }

      case 2: {
        // KAĞIDIN YANMASI ((C₆H₁₀O₅)n + O₂ ➔ CO₂ + H₂O + Kül) - 8 sn
        var celluloseGroup = new THREE.Group();
        var ringPoints = [];
        var ringAtoms = [];
        for (var a = 0; a < 6; a++) {
          var angle = (a * Math.PI) / 3;
          var cx = Math.cos(angle) * 2.2;
          var cz = Math.sin(angle) * 2.2;
          var atomColor = (a === 5) ? colors.O : colors.C;
          var catom = createAtom(0.72, atomColor, cx, -1.8, cz, false);
          celluloseGroup.add(catom);
          ringAtoms.push(catom);
          ringPoints.push(new THREE.Vector3(cx, -1.8, cz));

          if (a !== 5) {
            var hMesh = createAtom(0.46, colors.H, cx * 1.35, -1.4, cz * 1.35, false);
            celluloseGroup.add(hMesh);
            celluloseGroup.add(createBond(catom.position, hMesh.position, 0.1, colors.Bond));
          }
        }
        var ringBonds = [];
        for (var b = 0; b < 6; b++) {
          var rb = createBond(ringPoints[b], ringPoints[(b + 1) % 6], 0.14, colors.Bond);
          celluloseGroup.add(rb);
          ringBonds.push(rb);
        }
        rootGroup.add(celluloseGroup);

        var gasMols = [];
        for (var g = 0; g < 8; g++) {
          var isCo2 = (g % 2 === 0);
          var gMesh = isCo2
            ? createCO2Molecule((Math.random() - 0.5) * 6, -1.5, (Math.random() - 0.5) * 6)
            : createWaterMolecule((Math.random() - 0.5) * 6, -1.5, (Math.random() - 0.5) * 6);
          rootGroup.add(gMesh);
          gasMols.push({ mesh: gMesh, seed: g });
        }

        caseUpdater = function (p, c) {
          if (p < 0.28) {
            var vib = p * 0.12;
            celluloseGroup.position.x = Math.sin(c * 20) * vib;
            celluloseGroup.position.z = Math.cos(c * 20) * vib;
            ringBonds.forEach(function (b) { b.scale.set(1, 1, 1); });
          } else {
            var dis = (p - 0.28) / 0.72;
            ringBonds.forEach(function (b) {
              var s = Math.max(0, 1 - dis * 1.6);
              b.scale.set(s, s, s);
            });
            ringAtoms.forEach(function (atm, idx) {
              var ang = (idx * Math.PI) / 3;
              atm.position.x = Math.cos(ang) * (2.2 + dis * 2.6);
              atm.position.z = Math.sin(ang) * (2.2 + dis * 2.6);
              atm.position.y = -1.8 - dis * 0.9;
            });
          }

          var gasAlpha = Math.min(1, p * 2.2);
          gasMols.forEach(function (gm, idx) {
            gm.mesh.scale.set(gasAlpha, gasAlpha, gasAlpha);
            var yProg = ((p * 22 + gm.seed * 2) % 9) - 1.5;
            gm.mesh.position.y = yProg;
            gm.mesh.position.x += Math.sin(c * 2 + idx) * 0.03;
          });
        };
        break;
      }

      case 3: {
        // ELMANIN ÇÜRÜMESİ (Polifenol Oksidasyonu) - 8 sn
        var decayGroup = new THREE.Group();
        var ringAtomsCase3 = [];
        for (var ring = -2; ring <= 2; ring += 2) {
          var rCenter = new THREE.Vector3(ring * 2.5, 0, 0);
          for (var k = 0; k < 6; k++) {
            var ang = (k * Math.PI) / 3;
            var px = rCenter.x + Math.cos(ang) * 1.5;
            var py = rCenter.y + Math.sin(ang) * 1.5;
            var cMesh = createAtom(0.72, colors.C, px, py, 0, false);
            decayGroup.add(cMesh);
            ringAtomsCase3.push(cMesh);

            if (k % 2 === 0) {
              var oxMesh = createAtom(0.65, colors.O, px * 1.28, py * 1.28, 0.3, false);
              var hyMesh = createAtom(0.44, colors.H, px * 1.45, py * 1.45, 0.5, false);
              decayGroup.add(oxMesh);
              decayGroup.add(hyMesh);
              decayGroup.add(createBond(cMesh.position, oxMesh.position, 0.12, colors.Bond));
              decayGroup.add(createBond(oxMesh.position, hyMesh.position, 0.1, colors.Bond));
            }
          }
        }
        rootGroup.add(decayGroup);

        var enzymes = [];
        for (var e = 0; e < 5; e++) {
          var enz = createAtom(1.1, colors.Enzyme, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6, 2.5 + Math.random() * 2, false);
          rootGroup.add(enz);
          enzymes.push({ mesh: enz, baseY: enz.position.y, baseX: enz.position.x });
        }

        caseUpdater = function (p, c) {
          ringAtomsCase3.forEach(function (cm) {
            if (cm.material && cm.material.color) {
              var r = 0.13 + p * 0.22;
              var g = 0.13 - p * 0.05;
              var b = 0.13 - p * 0.08;
              cm.material.color.setRGB(r, g, b);
            }
          });
          enzymes.forEach(function (en, idx) {
            var pulse = 1.0 + Math.sin(c * 4 + idx) * 0.15;
            en.mesh.scale.set(pulse, pulse, pulse);
            en.mesh.position.y = en.baseY + Math.sin(c * 2 + idx) * 0.4;
          });
        };
        break;
      }

      case 4: {
        // BUZUN ERİMESİ (H₂O Katı ➔ Sıvı - Fiziksel Değişim) - 8 sn
        var iceGroup = new THREE.Group();
        var icePos = [
          [-3, 0, -2], [0, 0, -3.5], [3, 0, -2],
          [-3, 0, 2], [0, 0, 3.5], [3, 0, 2],
          [-1.5, 2.2, 0], [1.5, 2.2, 0],
          [-1.5, -2.2, 0], [1.5, -2.2, 0]
        ];
        var waterMolecules = [];
        icePos.forEach(function (pos, idx) {
          var wm = createWaterMolecule(pos[0], pos[1], pos[2]);
          iceGroup.add(wm);
          waterMolecules.push({ mesh: wm, origPos: new THREE.Vector3(pos[0], pos[1], pos[2]), idx: idx });
        });

        var dashedBonds = [];
        for (var hIdx = 0; hIdx < 5; hIdx++) {
          var p1 = icePos[hIdx];
          var p2 = icePos[(hIdx + 1) % 6];
          var db = createDashedBond(new THREE.Vector3(p1[0], p1[1], p1[2]), new THREE.Vector3(p2[0], p2[1], p2[2]), colors.HBond);
          iceGroup.add(db);
          dashedBonds.push(db);
        }
        rootGroup.add(iceGroup);

        caseUpdater = function (p, c) {
          var bondScale = Math.max(0, 1 - p * 1.4);
          dashedBonds.forEach(function (db) {
            db.scale.set(bondScale, bondScale, bondScale);
          });

          waterMolecules.forEach(function (item) {
            var drift = p * 1.8;
            var ang = item.idx * 0.7 + c * (0.8 + p * 1.5);
            item.mesh.position.x = item.origPos.x + Math.sin(ang) * drift;
            item.mesh.position.y = item.origPos.y + Math.cos(ang) * drift * 0.7;
            item.mesh.rotation.z = Math.sin(c + item.idx) * p * 1.2;
          });
        };
        break;
      }

      case 5: {
        // BAKIR TELİN DÖVÜLMESİ (Cu Metalik Kristal Kayması - Fiziksel) - 8 sn
        var copperGroup = new THREE.Group();
        var layer1 = new THREE.Group();
        var layer2 = new THREE.Group();

        for (var ix = -3; ix <= 3; ix += 1.6) {
          for (var iz = -3; iz <= 3; iz += 1.6) {
            layer1.add(createAtom(0.78, colors.Cu, ix, -1.2, iz, true));
            layer1.add(createAtom(0.78, colors.Cu, ix, -2.6, iz, true));
            layer2.add(createAtom(0.78, colors.Cu, ix + 0.8, 0.2, iz, true));
          }
        }
        copperGroup.add(layer1);
        copperGroup.add(layer2);
        rootGroup.add(copperGroup);

        caseUpdater = function (p) {
          var slide = Math.min(2.0, p * 2.2);
          layer2.position.x = slide;
        };
        break;
      }

      case 6: {
        // SUYUN DONMASI (H₂O Sıvı ➔ Katı Altıgen Kristal - Fiziksel) - 8 sn
        var freezeGroup = new THREE.Group();
        var waterFreezeList = [];
        for (var f = 0; f < 8; f++) {
          var fAngle = (f * Math.PI * 2) / 6;
          var targetX = Math.cos(fAngle) * 3.6;
          var targetZ = Math.sin(fAngle) * 3.6;
          var startX = targetX * 1.6 + (Math.random() - 0.5) * 1.5;
          var startZ = targetZ * 1.6 + (Math.random() - 0.5) * 1.5;
          var fWater = createWaterMolecule(startX, Math.sin(f) * 0.8, startZ);
          freezeGroup.add(fWater);
          waterFreezeList.push({ mesh: fWater, targetX: targetX, targetZ: targetZ, startX: startX, startZ: startZ, seed: f });
        }
        var centerWater = createWaterMolecule(0, 0, 0);
        freezeGroup.add(centerWater);

        var freezeBonds = [];
        for (var fb = 0; fb < 6; fb++) {
          var a1 = (fb * Math.PI * 2) / 6;
          var a2 = ((fb + 1) * Math.PI * 2) / 6;
          var pA = new THREE.Vector3(Math.cos(a1) * 3.6, 0, Math.sin(a1) * 3.6);
          var pB = new THREE.Vector3(Math.cos(a2) * 3.6, 0, Math.sin(a2) * 3.6);
          var dashed = createDashedBond(pA, pB, colors.HBond);
          dashed.scale.set(0, 0, 0);
          freezeGroup.add(dashed);
          freezeBonds.push(dashed);
        }
        rootGroup.add(freezeGroup);

        caseUpdater = function (p) {
          waterFreezeList.forEach(function (wf) {
            wf.mesh.position.x = wf.startX + (wf.targetX - wf.startX) * p;
            wf.mesh.position.z = wf.startZ + (wf.targetZ - wf.startZ) * p;
            wf.mesh.position.y = Math.sin(wf.seed) * 0.8 * (1 - p);
          });
          var bScale = Math.max(0, (p - 0.4) / 0.6);
          freezeBonds.forEach(function (b) {
            b.scale.set(bScale, bScale, bScale);
          });
        };
        break;
      }

      case 7: {
        // BETONUN SERTLEŞMESİ (Ca-Si-O Hidratasyonu ve C-S-H İğnemsi Kristalleri) - 8 sn
        var concreteGroup = new THREE.Group();
        concreteGroup.add(createAtom(1.2, colors.Ca, -2.5, 0, 0, false));
        concreteGroup.add(createAtom(1.1, colors.Si, 2.5, 0, 0, false));
        concreteGroup.add(createAtom(1.0, colors.Ca, 0, 2.5, 0, false));

        var needles = [];
        for (var n = 0; n < 16; n++) {
          var needleGeom = new THREE.CylinderGeometry(0.08, 0.08, 4.2, 8);
          var needleMat = new THREE.MeshPhongMaterial({ color: 0x94a3b8, shininess: 60 });
          var needle = new THREE.Mesh(needleGeom, needleMat);
          needle.position.set((Math.random() - 0.5) * 3.5, (Math.random() - 0.5) * 3.5, (Math.random() - 0.5) * 2.5);
          needle.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
          needle.scale.set(0, 0, 0);
          concreteGroup.add(needle);
          needles.push(needle);
        }
        rootGroup.add(concreteGroup);

        caseUpdater = function (p) {
          needles.forEach(function (nd) {
            nd.scale.set(p, p, p);
          });
        };
        break;
      }

      case 8: {
        // EKMEĞİN KÜFLENMESİ (Nişasta Polimerinin Parçalanması) - 8 sn
        var moldGroup = new THREE.Group();
        var starchAtoms = [];
        for (var s = -4; s <= 4; s++) {
          var sAtom = createAtom(0.72, colors.C, s * 1.2, Math.sin(s * 0.8) * 1.2 - 1.0, 0, false);
          moldGroup.add(sAtom);
          starchAtoms.push(sAtom);

          var sO = createAtom(0.58, colors.O, s * 1.2, Math.sin(s * 0.8) * 1.2 - 0.1, 0.3, false);
          moldGroup.add(sO);
          moldGroup.add(createBond(sAtom.position, sO.position, 0.1, colors.Bond));
        }
        rootGroup.add(moldGroup);

        var spores = [];
        for (var sp = 0; sp < 12; sp++) {
          var spore = createAtom(0.5, 0x10b981, (Math.random() - 0.5) * 8, 1.2 + Math.random() * 2.5, (Math.random() - 0.5) * 6, false);
          spore.scale.set(0.3, 0.3, 0.3);
          rootGroup.add(spore);
          spores.push({ mesh: spore, origY: spore.position.y });
        }

        caseUpdater = function (p, c) {
          var spScale = 0.3 + p * 0.9;
          spores.forEach(function (sp, idx) {
            sp.mesh.scale.set(spScale, spScale, spScale);
            sp.mesh.position.y = sp.origY + Math.sin(c * 2 + idx) * 0.2;
          });
          if (p > 0.4) {
            var dis8 = (p - 0.4) / 0.6;
            starchAtoms.forEach(function (sa, idx) {
              if (idx < 3) sa.position.x -= dis8 * 0.8;
              if (idx > 5) sa.position.x += dis8 * 0.8;
            });
          }
        };
        break;
      }

      case 9: {
        // SUYUN ELEKTROLİZİ (2H₂O ➔ 2H₂ + O₂) - 6 sn
        var electroGroup = new THREE.Group();
        var elGeom = new THREE.CylinderGeometry(0.35, 0.35, 7.5, 16);
        var elMinus = new THREE.Mesh(elGeom, new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.7, roughness: 0.3 }));
        var elPlus = new THREE.Mesh(elGeom, new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.7, roughness: 0.3 }));
        elMinus.position.set(-3.5, 0, 0);
        elPlus.position.set(3.5, 0, 0);
        electroGroup.add(elMinus);
        electroGroup.add(elPlus);
        rootGroup.add(electroGroup);

        var h2Bubbles = [];
        for (var hg = 0; hg < 6; hg++) {
          var h2 = createH2Molecule(-3.5 + (Math.random() - 0.5) * 1.5, -2.5, (Math.random() - 0.5) * 1.5);
          rootGroup.add(h2);
          h2Bubbles.push({ mesh: h2, seed: hg });
        }
        var o2Bubbles = [];
        for (var og = 0; og < 4; og++) {
          var o2e = createO2Molecule(3.5 + (Math.random() - 0.5) * 1.5, -2.5, (Math.random() - 0.5) * 1.5);
          rootGroup.add(o2e);
          o2Bubbles.push({ mesh: o2e, seed: og });
        }

        caseUpdater = function (p, c) {
          var alpha = Math.min(1, p * 2.5);
          h2Bubbles.forEach(function (b, idx) {
            b.mesh.scale.set(alpha, alpha, alpha);
            b.mesh.position.y = -2.5 + ((p * 22 + b.seed * 1.8) % 7.5);
            b.mesh.position.x = -3.5 + Math.sin(c * 3 + idx) * 0.4;
          });
          o2Bubbles.forEach(function (b, idx) {
            b.mesh.scale.set(alpha, alpha, alpha);
            b.mesh.position.y = -2.5 + ((p * 15 + b.seed * 2.2) % 7.5);
            b.mesh.position.x = 3.5 + Math.cos(c * 3 + idx) * 0.4;
          });
        };
        break;
      }

      case 10: {
        // MUMUN YANMASI (Parafin Erimesi & Yanması - Fiziksel + Kimyasal) - 8 sn
        var candleGroup = new THREE.Group();
        var wickGeom = new THREE.CylinderGeometry(0.2, 0.2, 3.5, 12);
        var wick = new THREE.Mesh(wickGeom, new THREE.MeshPhongMaterial({ color: 0x1f2937 }));
        wick.position.set(0, -1.8, 0);
        candleGroup.add(wick);

        var paraffinAtoms = [];
        for (var pIdx = -2; pIdx <= 2; pIdx++) {
          var cPara = createAtom(0.72, colors.C, pIdx * 1.1, -2.8, 0, false);
          candleGroup.add(cPara);
          paraffinAtoms.push(cPara);
        }
        rootGroup.add(candleGroup);

        var flameGas = [];
        for (var m = 0; m < 6; m++) {
          var molP = (m % 2 === 0)
            ? createCO2Molecule((Math.random() - 0.5) * 3, 0.2, (Math.random() - 0.5) * 3)
            : createWaterMolecule((Math.random() - 0.5) * 3, 0.2, (Math.random() - 0.5) * 3);
          rootGroup.add(molP);
          flameGas.push({ mesh: molP, seed: m });
        }

        caseUpdater = function (p, c) {
          // Erime (Fiziksel)
          if (p < 0.4) {
            var meltP = p / 0.4;
            paraffinAtoms.forEach(function (pa, idx) {
              pa.position.y = -2.8 - meltP * 0.4;
              pa.position.x += Math.sin(c * 2 + idx) * 0.01;
            });
          }
          // Yanma ve gaz çıkışı (Kimyasal)
          var fAlpha = Math.max(0, (p - 0.25) / 0.75);
          flameGas.forEach(function (fg, idx) {
            fg.mesh.scale.set(fAlpha, fAlpha, fAlpha);
            fg.mesh.position.y = 0.2 + ((p * 18 + fg.seed * 1.6) % 6.5);
            fg.mesh.position.x += Math.sin(c * 2 + idx) * 0.03;
          });
        };
        break;
      }

      case 11: {
        // ŞEKERİN SUDA ÇÖZÜNMESİ (Sükroz Kristali Solvatasyonu - Fiziksel) - 8 sn
        var dissolveGroup = new THREE.Group();
        for (var g = 0; g < 6; g++) {
          var gAng = (g * Math.PI) / 3;
          dissolveGroup.add(createAtom(0.68, g === 5 ? colors.O : colors.C, -1.6 + Math.cos(gAng) * 1.2, Math.sin(gAng) * 1.2, 0, false));
        }
        for (var fr = 0; fr < 5; fr++) {
          var frAng = (fr * Math.PI * 2) / 5;
          dissolveGroup.add(createAtom(0.68, fr === 4 ? colors.O : colors.C, 1.6 + Math.cos(frAng) * 1.1, Math.sin(frAng) * 1.1, 0, false));
        }
        dissolveGroup.add(createAtom(0.65, colors.O, 0, 0, 0, false));
        rootGroup.add(dissolveGroup);

        var waterSolv = [];
        for (var sw = 0; sw < 10; sw++) {
          var sAng = (sw * Math.PI * 2) / 10;
          var wMol = createWaterMolecule(Math.cos(sAng) * 5.5, Math.sin(sAng) * 5.5, (Math.random() - 0.5) * 2);
          rootGroup.add(wMol);
          waterSolv.push({ mesh: wMol, angle: sAng, startR: 5.5, targetR: 3.2 });
        }

        caseUpdater = function (p, c) {
          waterSolv.forEach(function (ws) {
            var curR = ws.startR - p * (ws.startR - ws.targetR);
            var curA = ws.angle + c * 0.4;
            ws.mesh.position.x = Math.cos(curA) * curR;
            ws.mesh.position.y = Math.sin(curA) * curR;
          });
        };
        break;
      }

      case 12: {
        // SÜTÜN EKŞİMESİ (Kazein Protein Denatürasyonu & Laktik Asit - Kimyasal) - 8 sn
        var milkGroup = new THREE.Group();
        var curdAtoms = [];
        for (var mi = 0; mi < 14; mi++) {
          var mx = (Math.random() - 0.5) * 4.5;
          var my = (Math.random() - 0.5) * 4.5;
          var mz = (Math.random() - 0.5) * 3.5;
          var curdColor = (mi % 2 === 0) ? colors.C : colors.N;
          var cAtom = createAtom(0.72, curdColor, mx, my, mz, false);
          milkGroup.add(cAtom);
          curdAtoms.push({ mesh: cAtom, origX: mx, origY: my, origZ: mz });
        }
        rootGroup.add(milkGroup);

        var lacticList = [];
        for (var la = 0; la < 5; la++) {
          var laGroup = new THREE.Group();
          laGroup.add(createAtom(0.68, colors.C, 0, 0, 0, false));
          laGroup.add(createAtom(0.62, colors.O, -0.9, 0.4, 0, false));
          laGroup.add(createAtom(0.62, colors.O, 0.9, -0.4, 0, false));
          laGroup.position.set((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 5);
          rootGroup.add(laGroup);
          lacticList.push({ mesh: laGroup, origY: laGroup.position.y });
        }

        caseUpdater = function (p, c) {
          curdAtoms.forEach(function (ca) {
            var shrink = 1.0 - p * 0.65;
            ca.mesh.position.x = ca.origX * shrink;
            ca.mesh.position.y = ca.origY * shrink;
            ca.mesh.position.z = ca.origZ * shrink;
          });
          lacticList.forEach(function (la, idx) {
            la.mesh.position.y = la.origY + Math.sin(c * 2 + idx) * 0.3;
          });
        };
        break;
      }

      default:
        rootGroup.add(createAtom(1.2, colors.Fe, 0, 0, 0, true));
        break;
    }
  }

  // ========================================================
  // THREE.JS SAHNE, IŞIKLANDIRMA VE ETKİLEŞİM YÖNETİMİ
  // ========================================================

  function notifyTimeUpdate() {
    var stateObj = getState();
    if (canvasScrubberFill) {
      canvasScrubberFill.style.width = (stateObj.progress * 100) + '%';
    }
    if (canvasScrubberThumb) {
      canvasScrubberThumb.style.left = (stateObj.progress * 100) + '%';
    }
    if (canvasTimeBadge) {
      canvasTimeBadge.textContent = formatTime(stateObj.currentTime) + ' / ' + formatTime(stateObj.duration);
    }
    if (canvasPlayBtn) {
      if (stateObj.isEnded) {
        canvasPlayBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';
        canvasPlayBtn.title = 'Yeniden Oynat';
      } else if (stateObj.isPlaying) {
        canvasPlayBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
        canvasPlayBtn.title = 'Duraklat';
      } else {
        canvasPlayBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
        canvasPlayBtn.title = 'Oynat';
      }
    }
    if (watermarkEl) {
      if (stateObj.isPlaying) {
        watermarkEl.classList.add('is-playing');
      } else {
        watermarkEl.classList.remove('is-playing');
      }
    }

    for (var i = 0; i < timeListeners.length; i++) {
      try {
        timeListeners[i](stateObj);
      } catch (err) {
        console.error('TimeListener Error:', err);
      }
    }
  }

  function init(containerEl, caseItem, options) {
    stop();
    if (!containerEl || !window.THREE) return;
    container = containerEl;
    currentCase = caseItem;
    options = options || {};

    // Vaka süresini belirle (9. Vaka: 6sn, diğerleri: 8sn)
    duration = (caseItem.id === 9) ? 6.0 : 8.0;
    currentTime = 0.0;
    isPlaying = false;
    isEnded = false;
    timeListeners = [];
    if (typeof options.onTimeUpdate === 'function') {
      timeListeners.push(options.onTimeUpdate);
    }

    container.innerHTML = '';

    // Wrap yapısı
    var wrap = document.createElement('div');
    wrap.className = 'three-canvas-wrap';
    wrap.style.cssText = 'position:relative; width:100%; height:100%; min-height:85px; overflow:hidden; border-radius:18px; background:radial-gradient(circle at center, #16202e 0%, #090e15 100%); touch-action:none; user-select:none;';
    wrapElement = wrap;

    // Üst Bilgi Barı: CPK Standardı & Kimyasal Formül
    var topBadge = document.createElement('div');
    topBadge.style.cssText = 'position:absolute; top:8px; left:10px; right:10px; z-index:5; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:4px; pointer-events:none;';
    topBadge.innerHTML = 
      '<div style="background:rgba(14,20,27,0.85); backdrop-filter:blur(8px); padding:3px 8px; border-radius:9999px; border:1px solid rgba(126,208,255,0.3); color:#7ed0ff; font-family:monospace; font-size:0.68rem; font-weight:700;">' +
        '⚛ 3D CPK MOLEKÜL' +
      '</div>' +
      '<div style="background:rgba(14,20,27,0.85); backdrop-filter:blur(8px); padding:3px 10px; border-radius:9999px; border:1px solid rgba(255,255,255,0.15); color:#ffffff; font-size:0.72rem; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:65%;">' +
        (caseItem.chemicalEquation || 'Moleküler Reorganizasyon') +
      '</div>';
    wrap.appendChild(topBadge);

    // Canlı Simülasyon Filigranı
    watermarkEl = document.createElement('div');
    watermarkEl.className = 'video-watermark three-sim-watermark';
    watermarkEl.style.cssText = 'position:absolute; top:8px; left:10px; z-index:6; display:none;';
    watermarkEl.innerHTML = '● 3D CANLI SİMÜLASYON';
    wrap.appendChild(watermarkEl);

    // Başlangıç Katmanı (Video Overlay Gibi)
    startOverlayEl = document.createElement('div');
    startOverlayEl.className = 'video-overlay-start three-video-overlay';
    startOverlayEl.style.cssText = 'position:absolute; inset:0; background:rgba(9,14,21,0.72); backdrop-filter:blur(4px); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0.45rem; z-index:10; border-radius:inherit; cursor:pointer;';
    startOverlayEl.innerHTML = 
      '<div class="video-overlay-text" style="font-size:0.75rem; color:#e2e8f0; font-weight:600; text-align:center;">' +
        '3D Moleküler değişimi izlemek için simülasyonu başlat.<br><span style="font-size:0.68rem; color:#7ed0ff; font-weight:500;">⏱ Süre: ' + Math.round(duration) + ' Saniye (Laboratuvar Videosu ile Senkron)</span>' +
      '</div>' +
      '<button type="button" class="btn-big-play" style="pointer-events:auto;">' +
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>' +
        '<span>Simülasyonu Başlat</span>' +
      '</button>';
    startOverlayEl.onclick = function (e) {
      e.stopPropagation();
      play();
    };
    wrap.appendChild(startOverlayEl);

    // Bitiş Katmanı (Simülasyon Tamamlandı)
    endOverlayEl = document.createElement('div');
    endOverlayEl.className = 'video-overlay-start three-end-overlay';
    endOverlayEl.style.cssText = 'position:absolute; inset:0; background:rgba(9,14,21,0.78); backdrop-filter:blur(5px); display:none; flex-direction:column; align-items:center; justify-content:center; gap:0.45rem; z-index:10; border-radius:inherit;';
    endOverlayEl.innerHTML = 
      '<div style="font-size:0.82rem; color:#38bdf8; font-weight:700; display:flex; align-items:center; gap:6px;">' +
        '<span style="background:rgba(56,189,248,0.2); width:20px; height:20px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:0.7rem;">✓</span>' +
        '3D Moleküler Değişim Süreci Tamamlandı' +
      '</div>' +
      '<div style="font-size:0.68rem; color:#94a3b8; max-width:85%; text-align:center; line-height:1.25;">' +
        (caseItem.molecularNote || (caseItem.correctType === 'chemical' ? 'Maddenin kimyasal iç yapısı ve bağları değişti.' : 'Maddenin kimliği korundu; yalnızca fiziksel düzen değişti.')) +
      '</div>' +
      '<button type="button" class="btn-big-play btn-replay-sim" style="background:#0284c7; margin-top:0.2rem;">' +
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>' +
        '<span>Baştan Oynat</span>' +
      '</button>';
    endOverlayEl.querySelector('.btn-replay-sim').onclick = function (e) {
      e.stopPropagation();
      restart();
    };
    wrap.appendChild(endOverlayEl);

    // Canvas İçi Video Scrubber Barı
    var canvasControls = document.createElement('div');
    canvasControls.className = 'three-canvas-scrubber-bar';
    canvasControls.style.cssText = 'position:absolute; bottom:6px; left:8px; right:8px; z-index:6; display:flex; align-items:center; gap:6px; background:rgba(9,14,21,0.85); backdrop-filter:blur(8px); padding:3px 8px; border-radius:8px; border:1px solid rgba(255,255,255,0.1);';

    canvasPlayBtn = document.createElement('button');
    canvasPlayBtn.type = 'button';
    canvasPlayBtn.style.cssText = 'background:none; border:none; color:#38bdf8; cursor:pointer; padding:2px; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0;';
    canvasPlayBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    canvasPlayBtn.onclick = function (e) {
      e.stopPropagation();
      togglePlay();
    };
    canvasControls.appendChild(canvasPlayBtn);

    var scrubberTrack = document.createElement('div');
    scrubberTrack.style.cssText = 'flex:1 1 auto; height:5px; background:rgba(255,255,255,0.15); border-radius:9999px; position:relative; cursor:pointer;';
    canvasScrubberFill = document.createElement('div');
    canvasScrubberFill.style.cssText = 'height:100%; width:0%; background:linear-gradient(90deg, #38bdf8, #818cf8); border-radius:9999px; pointer-events:none;';
    canvasScrubberThumb = document.createElement('div');
    canvasScrubberThumb.style.cssText = 'width:8px; height:8px; background:#ffffff; border-radius:50%; position:absolute; top:50%; left:0%; transform:translate(-50%, -50%); pointer-events:none; box-shadow:0 0 4px rgba(0,0,0,0.6);';
    scrubberTrack.appendChild(canvasScrubberFill);
    scrubberTrack.appendChild(canvasScrubberThumb);

    scrubberTrack.onclick = function (e) {
      e.stopPropagation();
      var rect = scrubberTrack.getBoundingClientRect();
      var ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      seek(ratio * duration);
    };
    canvasControls.appendChild(scrubberTrack);

    canvasTimeBadge = document.createElement('span');
    canvasTimeBadge.style.cssText = 'font-family:monospace; font-size:0.62rem; color:#94a3b8; flex-shrink:0; letter-spacing:0.5px;';
    canvasTimeBadge.textContent = '00:00 / ' + formatTime(duration);
    canvasControls.appendChild(canvasTimeBadge);

    wrap.appendChild(canvasControls);
    container.appendChild(wrap);

    var width = wrap.clientWidth || 400;
    var height = wrap.clientHeight || 280;

    // Three.js Kurulumu
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    cameraDistance = 22;
    targetCameraDistance = 22;
    updateCameraPosition();

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    wrap.appendChild(renderer.domElement);

    // Işıklandırma
    var ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    var dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(15, 20, 15);
    scene.add(dirLight1);

    var dirLight2 = new THREE.DirectionalLight(0x7ed0ff, 0.6);
    dirLight2.position.set(-15, -10, -10);
    scene.add(dirLight2);

    // Kök Grup
    rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Vaka Modelini İnşa Et (CPK Standardında)
    buildCaseScene(caseItem);

    // İlk Durumu Güncelle (Zaman: 0.0)
    if (caseUpdater) {
      caseUpdater(0.0, 0, false);
    }
    notifyTimeUpdate();

    // Fare / Dokunmatik Olayları Bağla
    bindOrbitControls(wrap);

    // Animasyon Döngüsünü Başlat
    animate();
  }

  function updateCameraPosition() {
    if (!camera) return;
    camera.position.x = 0;
    camera.position.y = 0;
    camera.position.z = cameraDistance;
    camera.lookAt(0, 0, 0);
  }

  function bindOrbitControls(el) {
    if (!el) return;

    el.addEventListener('mousedown', function (e) {
      if (e.target.closest('.three-canvas-scrubber-bar') || e.target.closest('.video-overlay-start')) return;
      isDragging = true;
      autoRotate = false;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', function (e) {
      if (!isDragging) return;
      var deltaX = e.clientX - previousMousePosition.x;
      var deltaY = e.clientY - previousMousePosition.y;

      targetRotation.y += deltaX * 0.008;
      targetRotation.x += deltaY * 0.008;
      targetRotation.x = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, targetRotation.x));

      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', function () {
      isDragging = false;
    });

    el.addEventListener('wheel', function (e) {
      e.preventDefault();
      targetCameraDistance += e.deltaY * 0.02;
      targetCameraDistance = Math.max(minDistance, Math.min(maxDistance, targetCameraDistance));
    }, { passive: false });

    // Touch Support (Mobil)
    var initialTouchDistance = null;

    el.addEventListener('touchstart', function (e) {
      if (e.target.closest('.three-canvas-scrubber-bar') || e.target.closest('.video-overlay-start')) return;
      if (e.touches.length === 1) {
        isDragging = true;
        autoRotate = false;
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        var dx = e.touches[0].clientX - e.touches[1].clientX;
        var dy = e.touches[0].clientY - e.touches[1].clientY;
        initialTouchDistance = Math.sqrt(dx * dx + dy * dy);
      }
    }, { passive: true });

    el.addEventListener('touchmove', function (e) {
      if (e.touches.length === 1 && isDragging) {
        var deltaX = e.touches[0].clientX - previousMousePosition.x;
        var deltaY = e.touches[0].clientY - previousMousePosition.y;

        targetRotation.y += deltaX * 0.01;
        targetRotation.x += deltaY * 0.01;
        targetRotation.x = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, targetRotation.x));

        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2 && initialTouchDistance) {
        var dx = e.touches[0].clientX - e.touches[1].clientX;
        var dy = e.touches[0].clientY - e.touches[1].clientY;
        var currentDist = Math.sqrt(dx * dx + dy * dy);
        var diff = initialTouchDistance - currentDist;

        targetCameraDistance += diff * 0.04;
        targetCameraDistance = Math.max(minDistance, Math.min(maxDistance, targetCameraDistance));
        initialTouchDistance = currentDist;
      }
    }, { passive: true });

    el.addEventListener('touchend', function () {
      isDragging = false;
      initialTouchDistance = null;
    });
  }

  // Video Eşzamanlı Oynatma Kontrol Fonksiyonları
  function play() {
    if (currentTime >= duration) {
      currentTime = 0.0;
    }
    isPlaying = true;
    isEnded = false;
    lastTimestamp = performance.now();
    if (startOverlayEl) startOverlayEl.style.display = 'none';
    if (endOverlayEl) endOverlayEl.style.display = 'none';
    notifyTimeUpdate();
  }

  function pause() {
    isPlaying = false;
    lastTimestamp = null;
    notifyTimeUpdate();
  }

  function togglePlay() {
    if (isEnded) {
      restart();
    } else if (isPlaying) {
      pause();
    } else {
      play();
    }
  }

  function restart() {
    currentTime = 0.0;
    isEnded = false;
    if (endOverlayEl) endOverlayEl.style.display = 'none';
    if (startOverlayEl) startOverlayEl.style.display = 'none';
    play();
  }

  function seek(timeInSec) {
    currentTime = Math.max(0.0, Math.min(duration, timeInSec));
    isEnded = (currentTime >= duration);
    if (isEnded && endOverlayEl) {
      endOverlayEl.style.display = 'flex';
    } else if (endOverlayEl) {
      endOverlayEl.style.display = 'none';
    }
    if (caseUpdater) {
      caseUpdater(currentTime / duration, clock, isPlaying);
    }
    notifyTimeUpdate();
  }

  function getState() {
    return {
      currentTime: currentTime,
      duration: duration,
      progress: duration > 0 ? (currentTime / duration) : 0,
      isPlaying: isPlaying,
      isEnded: isEnded
    };
  }

  function getDuration() {
    return duration;
  }

  function getCurrentTime() {
    return currentTime;
  }

  function onTimeUpdate(callback) {
    if (typeof callback === 'function') {
      timeListeners.push(callback);
      callback(getState());
    }
  }

  // Render & Animasyon Döngüsü
  var clock = 0;
  function animate(now) {
    animFrameId = requestAnimationFrame(animate);
    clock += 0.02;

    // Video Zamanı İlerlemesi (Gerçek Zaman Senkronu)
    if (isPlaying) {
      if (!lastTimestamp) lastTimestamp = now || performance.now();
      var currentNow = now || performance.now();
      var dt = (currentNow - lastTimestamp) / 1000.0;
      lastTimestamp = currentNow;
      if (dt > 0.1) dt = 0.1; // Sekme geçişi veya donma koruması

      currentTime += dt;
      if (currentTime >= duration) {
        currentTime = duration;
        isPlaying = false;
        isEnded = true;
        lastTimestamp = null;
        if (endOverlayEl) endOverlayEl.style.display = 'flex';
      }
      notifyTimeUpdate();
    } else {
      lastTimestamp = null;
    }

    var progress = duration > 0 ? (currentTime / duration) : 0;

    // 3D Vaka Dönüşümünü Güncelle (p ∈ [0, 1])
    if (caseUpdater) {
      caseUpdater(progress, clock, isPlaying);
    }

    // Yumuşak İnterpolasyonlu Döndürme
    if (autoRotate && !isDragging) {
      targetRotation.y += 0.003;
    }

    currentRotation.x += (targetRotation.x - currentRotation.x) * 0.1;
    currentRotation.y += (targetRotation.y - currentRotation.y) * 0.1;
    cameraDistance += (targetCameraDistance - cameraDistance) * 0.1;
    updateCameraPosition();

    if (rootGroup) {
      rootGroup.rotation.x = currentRotation.x;
      rootGroup.rotation.y = currentRotation.y;
    }

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  function resize() {
    if (!container || !renderer || !camera) return;
    var wrap = container.querySelector('.three-canvas-wrap');
    if (!wrap) return;
    var w = wrap.clientWidth;
    var h = wrap.clientHeight;
    if (w > 0 && h > 0) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
  }

  function stop() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    isPlaying = false;
    isEnded = false;
    lastTimestamp = null;
    timeListeners = [];
    caseUpdater = null;
    dynamicObjects = [];

    if (renderer && renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    renderer = null;
    scene = null;
    camera = null;
    rootGroup = null;
    wrapElement = null;
    startOverlayEl = null;
    endOverlayEl = null;
    canvasPlayBtn = null;
    canvasScrubberFill = null;
    canvasScrubberThumb = null;
    canvasTimeBadge = null;
    watermarkEl = null;
  }

  return {
    init: init,
    stop: stop,
    resize: resize,
    play: play,
    pause: pause,
    togglePlay: togglePlay,
    restart: restart,
    seek: seek,
    getState: getState,
    getDuration: getDuration,
    getCurrentTime: getCurrentTime,
    onTimeUpdate: onTimeUpdate
  };
})();

// Geriye dönük uyumluluk için alias
window.MolecularSimulator = window.ThreeMolecularSimulator;
