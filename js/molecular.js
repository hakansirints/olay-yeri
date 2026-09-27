// ========================================================
// KİMYASAL OLAY YERİ UZMANI - 3 BOYUTLU MOLEKÜLER SİMÜLASYON MOTORU
// Three.js (WebGL) Destekli Atom-Molekül 3D Canlandırma Motoru
// COREY-PAULING-KOLTUN (CPK) ULUSLARARASI RENK STANDARDI
// Fare / Dokunmatik 360° Döndürme • Zoom • Minimal Açıklama
// ========================================================

window.ThreeMolecularSimulator = (function () {
  'use strict';

  var renderer = null;
  var scene = null;
  var camera = null;
  var animFrameId = null;
  var container = null;
  var rootGroup = null;
  var currentCase = null;
  var dynamicObjects = [];

  // Fare / Dokunmatik Döndürme & Zoom Değişkenleri
  var isDragging = false;
  var previousMousePosition = { x: 0, y: 0 };
  var rotationVelocity = { x: 0, y: 0 };
  var targetRotation = { x: 0.2, y: 0.4 };
  var currentRotation = { x: 0.2, y: 0.4 };
  var cameraDistance = 24;
  var targetCameraDistance = 24;
  var minDistance = 10;
  var maxDistance = 45;
  var autoRotate = true;

  // ========================================================
  // COREY-PAULING-KOLTUN (CPK) RESMİ KİMYASAL RENK STANDARDI
  // H: Beyaz (#FFFFFF)
  // C: Kömür Siyahı (#222222)
  // N: Koyu Mavi (#1D4ED8)
  // O: Canlı Kırmızı (#DC2626)
  // Fe: Pas/Kızıl-Turuncu (#C85A17 / #B45309)
  // Cu: Bakır Bronz (#B87333 / #D97736)
  // Ca: Koyu Yeşil (#16A34A / #15803D)
  // Si: Altın Sarısı / Hardal (#DAA520 / #F59E0B)
  // S: Limon Sarısı (#FACC15)
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

  // ========================================================
  // 12 VAKA İÇİN COREY-PAULING-KOLTUN (CPK) 3D SAHNE MODELLERİ
  // ========================================================

  function buildCaseScene(caseItem) {
    dynamicObjects = [];
    var cid = caseItem.id;

    switch (cid) {
      case 1:
        // DEMİRİN PASLANMASI (4Fe + 3O₂ ➔ 2Fe₂O₃)
        // CPK: Fe (Metalik Çelik Gümüş & Kızıl-Pas Turuncusu), O (Kırmızı)
        var feGrid = new THREE.Group();
        for (var x = -3; x <= 3; x += 1.8) {
          for (var z = -3; z <= 3; z += 1.8) {
            // Saf demir kristal kafesi (altta)
            var fe1 = createAtom(0.8, colors.FeMetal, x, -2.5, z, true);
            var fe2 = createAtom(0.8, colors.FeMetal, x, -1.0, z, true);
            feGrid.add(fe1);
            feGrid.add(fe2);

            // Yüzeyde oluşan pas (kızıl-turuncu demir oksit kristalleri)
            var isOxidized = (Math.abs(x) + Math.abs(z)) < 5.0;
            if (isOxidized) {
              var rustAtom = createAtom(0.82, colors.Fe, x, 0.5 + Math.sin(x * z) * 0.3, z, false);
              feGrid.add(rustAtom);
              // Pası bağlayan oksijen atomları (Kırmızı CPK)
              var oAtom = createAtom(0.65, colors.O, x + 0.65, 1.3, z + 0.5, false);
              feGrid.add(oAtom);
              feGrid.add(createBond(rustAtom.position, oAtom.position, 0.14, colors.Fe));
              feGrid.add(createBond(fe2.position, rustAtom.position, 0.12, colors.Bond));
            }
          }
        }
        rootGroup.add(feGrid);

        // Havadaki serbest O₂ molekülleri (Kırmızı küreler)
        for (var i = 0; i < 6; i++) {
          var o2 = createO2Molecule((Math.random() - 0.5) * 12, 3.5 + Math.random() * 3, (Math.random() - 0.5) * 12);
          rootGroup.add(o2);
          dynamicObjects.push({ mesh: o2, type: 'float', speed: 0.02 + Math.random() * 0.02, baseY: o2.position.y });
        }
        break;

      case 2:
        // KAĞIDIN YANMASI ((C₆H₁₀O₅)n + O₂ ➔ CO₂ + H₂O + Isı)
        // CPK: Karbon (Siyah), Hidrojen (Beyaz), Oksijen (Kırmızı)
        var celluloseGroup = new THREE.Group();
        var ringPoints = [];
        for (var a = 0; a < 6; a++) {
          var angle = (a * Math.PI) / 3;
          var cx = Math.cos(angle) * 2.2;
          var cz = Math.sin(angle) * 2.2;
          // 5 Karbon (Siyah), 1 Halka Oksijeni (Kırmızı)
          var atomColor = (a === 5) ? colors.O : colors.C;
          var catom = createAtom(0.72, atomColor, cx, -1.8, cz, false);
          celluloseGroup.add(catom);
          ringPoints.push(new THREE.Vector3(cx, -1.8, cz));

          // Karbona bağlı Hidrojenler (Beyaz)
          if (a !== 5) {
            var hMesh = createAtom(0.46, colors.H, cx * 1.35, -1.4, cz * 1.35, false);
            celluloseGroup.add(hMesh);
            celluloseGroup.add(createBond(catom.position, hMesh.position, 0.1, colors.Bond));
          }
        }
        for (var b = 0; b < 6; b++) {
          celluloseGroup.add(createBond(ringPoints[b], ringPoints[(b + 1) % 6], 0.14, colors.Bond));
        }
        rootGroup.add(celluloseGroup);

        // Yanma alev alanı ve yükselen CO₂ (Siyah-Kırmızı) ve H₂O (Kırmızı-Beyaz) gaz molekülleri
        for (var c = 0; c < 5; c++) {
          var co2 = createCO2Molecule((Math.random() - 0.5) * 8, 0.5 + c * 1.4, (Math.random() - 0.5) * 8);
          rootGroup.add(co2);
          dynamicObjects.push({ mesh: co2, type: 'rise', speed: 0.035, minY: -0.5, maxY: 6.5 });
        }
        for (var w = 0; w < 5; w++) {
          var h2o = createWaterMolecule((Math.random() - 0.5) * 8, 1.2 + w * 1.2, (Math.random() - 0.5) * 8);
          rootGroup.add(h2o);
          dynamicObjects.push({ mesh: h2o, type: 'rise', speed: 0.04, minY: -0.5, maxY: 6.5 });
        }
        break;

      case 3:
        // ELMANIN ÇÜRÜMESİ (Polifenol Oksidasyonu)
        // CPK: Karbon (Siyah), Oksijen (Kırmızı), Hidrojen (Beyaz)
        var decayGroup = new THREE.Group();
        for (var ring = -2; ring <= 2; ring += 2) {
          var rCenter = new THREE.Vector3(ring * 2.5, 0, 0);
          for (var k = 0; k < 6; k++) {
            var ang = (k * Math.PI) / 3;
            var px = rCenter.x + Math.cos(ang) * 1.5;
            var py = rCenter.y + Math.sin(ang) * 1.5;
            var cMesh = createAtom(0.72, colors.C, px, py, 0, false);
            decayGroup.add(cMesh);

            // Çeperde hidroksil -OH grupları: O (Kırmızı) ve H (Beyaz)
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

        // Biyokimyasal oksidasyon enzimleri ve serbest oksijen molekülleri
        for (var e = 0; e < 4; e++) {
          var enz = createAtom(1.1, colors.Enzyme, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6, 2.5 + Math.random() * 2, false);
          rootGroup.add(enz);
          dynamicObjects.push({ mesh: enz, type: 'pulse', speed: 0.03, baseScale: 1.0 });
        }
        break;

      case 4:
        // BUZUN ERİMESİ (H₂O Katı ➔ Sıvı - Fiziksel Değişim)
        // CPK: Oksijen (Kırmızı), Hidrojen (Beyaz), Hidrojen Bağı (Buz Mavisi Kesikli)
        var iceGroup = new THREE.Group();
        var icePos = [
          [-3, 0, -2], [0, 0, -3.5], [3, 0, -2],
          [-3, 0, 2], [0, 0, 3.5], [3, 0, 2],
          [-1.5, 2.2, 0], [1.5, 2.2, 0],
          [-1.5, -2.2, 0], [1.5, -2.2, 0]
        ];

        icePos.forEach(function (p, idx) {
          var wm = createWaterMolecule(p[0], p[1], p[2]);
          iceGroup.add(wm);
          if (idx >= 6) {
            dynamicObjects.push({ mesh: wm, type: 'drift', speed: 0.02, rx: p[0], ry: p[1], rz: p[2] });
          }
        });

        for (var hIdx = 0; hIdx < 5; hIdx++) {
          var p1 = icePos[hIdx];
          var p2 = icePos[(hIdx + 1) % 6];
          iceGroup.add(createDashedBond(new THREE.Vector3(p1[0], p1[1], p1[2]), new THREE.Vector3(p2[0], p2[1], p2[2]), colors.HBond));
        }
        rootGroup.add(iceGroup);
        break;

      case 5:
        // BAKIR TELİN DÖVÜLMESİ (Cu Metalik Kristal Kayması)
        // CPK: Bakır (Cu - Bronz/Bakır Turuncusu Metalik Küreler)
        var copperGroup = new THREE.Group();
        var layer1 = new THREE.Group(); // Sabit alt katman
        var layer2 = new THREE.Group(); // Çekiç darbesiyle kayan üst katman

        for (var ix = -3; ix <= 3; ix += 1.6) {
          for (var iz = -3; iz <= 3; iz += 1.6) {
            var cu1 = createAtom(0.78, colors.Cu, ix, -1.2, iz, true);
            var cu2 = createAtom(0.78, colors.Cu, ix, -2.6, iz, true);
            layer1.add(cu1);
            layer1.add(cu2);

            var cuTop = createAtom(0.78, colors.Cu, ix + 0.8, 0.2, iz, true);
            layer2.add(cuTop);
          }
        }
        copperGroup.add(layer1);
        copperGroup.add(layer2);
        rootGroup.add(copperGroup);

        dynamicObjects.push({ mesh: layer2, type: 'slide', speed: 0.025, maxSlide: 1.8 });
        break;

      case 6:
        // SUYUN DONMASI (H₂O Sıvı ➔ Katı Altıgen Kristal)
        // CPK: Oksijen (Kırmızı), Hidrojen (Beyaz)
        var freezeGroup = new THREE.Group();
        for (var f = 0; f < 8; f++) {
          var fAngle = (f * Math.PI * 2) / 6;
          var fx = Math.cos(fAngle) * 3.6;
          var fz = Math.sin(fAngle) * 3.6;
          var fWater = createWaterMolecule(fx, Math.sin(f) * 0.8, fz);
          freezeGroup.add(fWater);
          dynamicObjects.push({ mesh: fWater, type: 'lockIn', speed: 0.02, origX: fx, origZ: fz });
        }
        var centerH2O = createWaterMolecule(0, 0, 0);
        freezeGroup.add(centerH2O);
        rootGroup.add(freezeGroup);
        break;

      case 7:
        // BETONUN SERTLEŞMESİ (Ca-Si-O Hidratasyonu ve C-S-H İğnemsi Kristalleri)
        // CPK: Kalsiyum (Koyu Yeşil), Silisyum (Altın Sarısı / Hardal), Oksijen (Kırmızı)
        var concreteGroup = new THREE.Group();
        var caAtom1 = createAtom(1.2, colors.Ca, -2.5, 0, 0, false);
        var siAtom = createAtom(1.1, colors.Si, 2.5, 0, 0, false);
        var caAtom2 = createAtom(1.0, colors.Ca, 0, 2.5, 0, false);
        concreteGroup.add(caAtom1);
        concreteGroup.add(siAtom);
        concreteGroup.add(caAtom2);

        // Kalsiyum Silikat Hidrat (C-S-H) iğnemsi kristal lifleri
        for (var n = 0; n < 14; n++) {
          var needleGeom = new THREE.CylinderGeometry(0.07, 0.07, 4.0, 8);
          var needleMat = new THREE.MeshPhongMaterial({ color: 0x94a3b8, shininess: 60 });
          var needle = new THREE.Mesh(needleGeom, needleMat);
          needle.position.set((Math.random() - 0.5) * 3.5, (Math.random() - 0.5) * 3.5, (Math.random() - 0.5) * 2.5);
          needle.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
          concreteGroup.add(needle);
          dynamicObjects.push({ mesh: needle, type: 'pulse', speed: 0.015, baseScale: 1.0 });
        }
        rootGroup.add(concreteGroup);
        break;

      case 8:
        // EKMEĞİN KÜFLENMESİ (Nişasta Polimerinin Parçalanması)
        // CPK: Karbon (Siyah), Oksijen (Kırmızı), Hidrojen (Beyaz)
        var moldGroup = new THREE.Group();
        var starchNodes = [];
        for (var s = -4; s <= 4; s++) {
          var sAtom = createAtom(0.72, colors.C, s * 1.2, Math.sin(s * 0.8) * 1.2 - 1.0, 0, false);
          moldGroup.add(sAtom);
          starchNodes.push(sAtom.position);

          // Oksijen ve Hidrojen yan grupları
          var sO = createAtom(0.58, colors.O, s * 1.2, Math.sin(s * 0.8) * 1.2 - 0.1, 0.3, false);
          moldGroup.add(sO);
          moldGroup.add(createBond(sAtom.position, sO.position, 0.1, colors.Bond));
        }
        for (var sb = 0; sb < starchNodes.length - 1; sb++) {
          moldGroup.add(createBond(starchNodes[sb], starchNodes[sb + 1], 0.14, colors.Bond));
        }
        rootGroup.add(moldGroup);

        // Küf sporları
        for (var sp = 0; sp < 10; sp++) {
          var spore = createAtom(0.48, 0x10b981, (Math.random() - 0.5) * 8, 1.2 + Math.random() * 2.5, (Math.random() - 0.5) * 6, false);
          rootGroup.add(spore);
          dynamicObjects.push({ mesh: spore, type: 'float', speed: 0.03, baseY: spore.position.y });
        }
        break;

      case 9:
        // SUYUN ELEKTROLİZİ (2H₂O ➔ 2H₂ + O₂)
        // CPK: H (Beyaz), O (Kırmızı)
        var electroGroup = new THREE.Group();
        var elGeom = new THREE.CylinderGeometry(0.35, 0.35, 7.5, 16);
        var elMatMinus = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.7, roughness: 0.3 });
        var elMatPlus = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.7, roughness: 0.3 });
        var elMinus = new THREE.Mesh(elGeom, elMatMinus);
        var elPlus = new THREE.Mesh(elGeom, elMatPlus);
        elMinus.position.set(-3.5, 0, 0);
        elPlus.position.set(3.5, 0, 0);
        electroGroup.add(elMinus);
        electroGroup.add(elPlus);
        rootGroup.add(electroGroup);

        // Katotta ayrışan H₂ gaz kabarcıkları (CPK Beyaz H çiftleri)
        for (var hg = 0; hg < 5; hg++) {
          var h2 = createH2Molecule(-3.5 + (Math.random() - 0.5) * 1.5, -2.5 + hg * 1.3, (Math.random() - 0.5) * 1.5);
          rootGroup.add(h2);
          dynamicObjects.push({ mesh: h2, type: 'rise', speed: 0.045, minY: -3.0, maxY: 4.5 });
        }
        // Anotta ayrışan O₂ gaz kabarcıkları (CPK Kırmızı O çiftleri)
        for (var og = 0; og < 4; og++) {
          var o2e = createO2Molecule(3.5 + (Math.random() - 0.5) * 1.5, -2.5 + og * 1.5, (Math.random() - 0.5) * 1.5);
          rootGroup.add(o2e);
          dynamicObjects.push({ mesh: o2e, type: 'rise', speed: 0.035, minY: -3.0, maxY: 4.5 });
        }
        break;

      case 10:
        // MUMUN YANMASI (Parafin C₂₅H₅₂ + O₂ ➔ CO₂ + H₂O)
        // CPK: Karbon (Siyah), Hidrojen (Beyaz), Oksijen (Kırmızı)
        var candleGroup = new THREE.Group();
        var wickGeom = new THREE.CylinderGeometry(0.2, 0.2, 3.5, 12);
        var wickMat = new THREE.MeshPhongMaterial({ color: 0x1f2937 });
        var wick = new THREE.Mesh(wickGeom, wickMat);
        wick.position.set(0, -1.8, 0);
        candleGroup.add(wick);

        // Parafin zigzag hidrokarbon zinciri: C (Siyah) + H (Beyaz)
        for (var p = -2; p <= 2; p++) {
          var cPara = createAtom(0.72, colors.C, p * 1.1, -2.8, 0, false);
          var hPara1 = createAtom(0.45, colors.H, p * 1.1, -2.2, 0.4, false);
          var hPara2 = createAtom(0.45, colors.H, p * 1.1, -3.4, -0.4, false);
          candleGroup.add(cPara);
          candleGroup.add(hPara1);
          candleGroup.add(hPara2);
          candleGroup.add(createBond(cPara.position, hPara1.position, 0.1, colors.Bond));
          candleGroup.add(createBond(cPara.position, hPara2.position, 0.1, colors.Bond));
        }
        rootGroup.add(candleGroup);

        // Alev bölgesinde ayrışan CO₂ ve H₂O molekülleri
        for (var m = 0; m < 5; m++) {
          var molP = (m % 2 === 0)
            ? createCO2Molecule((Math.random() - 0.5) * 3, 0.2 + m * 0.9, (Math.random() - 0.5) * 3)
            : createWaterMolecule((Math.random() - 0.5) * 3, 0.2 + m * 0.9, (Math.random() - 0.5) * 3);
          rootGroup.add(molP);
          dynamicObjects.push({ mesh: molP, type: 'rise', speed: 0.04, minY: 0.0, maxY: 5.5 });
        }
        break;

      case 11:
        // ŞEKERİN SUDA ÇÖZÜNMESİ (Sükroz C₁₂H₂₂O₁₁ + Su)
        // CPK: Karbon (Siyah), Oksijen (Kırmızı), Hidrojen (Beyaz)
        var dissolveGroup = new THREE.Group();
        // Sükroz disakkarit modeli: Glikoz halkası + Fruktoz halkası
        // Halka 1 (Glikoz)
        for (var g = 0; g < 6; g++) {
          var gAng = (g * Math.PI) / 3;
          var gx = -1.6 + Math.cos(gAng) * 1.2;
          var gy = Math.sin(gAng) * 1.2;
          var gAtom = createAtom(0.68, g === 5 ? colors.O : colors.C, gx, gy, 0, false);
          dissolveGroup.add(gAtom);
        }
        // Halka 2 (Fruktoz)
        for (var fr = 0; fr < 5; fr++) {
          var frAng = (fr * Math.PI * 2) / 5;
          var frx = 1.6 + Math.cos(frAng) * 1.1;
          var fry = Math.sin(frAng) * 1.1;
          var frAtom = createAtom(0.68, fr === 4 ? colors.O : colors.C, frx, fry, 0, false);
          dissolveGroup.add(frAtom);
        }
        // Glikozidik bağ köprüsü: Oksijen (Kırmızı CPK)
        var bridgeO = createAtom(0.65, colors.O, 0, 0, 0, false);
        dissolveGroup.add(bridgeO);
        rootGroup.add(dissolveGroup);

        // Çevresini saran su molekülleri (CPK H₂O: Kırmızı O ve Beyaz H)
        for (var sw = 0; sw < 8; sw++) {
          var sAng = (sw * Math.PI * 2) / 8;
          var sx = Math.cos(sAng) * 3.6;
          var sy = Math.sin(sAng) * 3.6;
          var wSolv = createWaterMolecule(sx, sy, (Math.random() - 0.5) * 2);
          rootGroup.add(wSolv);
          dynamicObjects.push({ mesh: wSolv, type: 'swirl', speed: 0.02, radius: 3.6, angle: sAng });
        }
        break;

      case 12:
        // SÜTÜN EKŞİMESİ (Kazein Protein Denatürasyonu & Laktik Asit)
        // CPK: Karbon (Siyah), Azot (Mavi), Oksijen (Kırmızı), Hidrojen (Beyaz)
        var milkGroup = new THREE.Group();
        // Kazein amino asit zinciri ve pıhtılaşma ağı
        for (var mi = 0; mi < 14; mi++) {
          var mx = (Math.random() - 0.5) * 4.5;
          var my = (Math.random() - 0.5) * 4.5;
          var mz = (Math.random() - 0.5) * 3.5;
          // Peptit bağı atomları: C (Siyah) veya N (Mavi)
          var curdColor = (mi % 2 === 0) ? colors.C : colors.N;
          var curdAtom = createAtom(0.72, curdColor, mx, my, mz, false);
          milkGroup.add(curdAtom);
        }
        rootGroup.add(milkGroup);

        // Çevredeki Laktik Asit molekülleri (C, O, H)
        for (var la = 0; la < 4; la++) {
          var laGroup = new THREE.Group();
          var laC = createAtom(0.68, colors.C, 0, 0, 0, false);
          var laO1 = createAtom(0.62, colors.O, -0.9, 0.4, 0, false);
          var laO2 = createAtom(0.62, colors.O, 0.9, -0.4, 0, false);
          laGroup.add(laC);
          laGroup.add(laO1);
          laGroup.add(laO2);
          laGroup.position.set((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 5);
          rootGroup.add(laGroup);
          dynamicObjects.push({ mesh: laGroup, type: 'float', speed: 0.025, baseY: laGroup.position.y });
        }
        break;

      default:
        rootGroup.add(createAtom(1.2, colors.Fe, 0, 0, 0, true));
        break;
    }
  }

  // ========================================================
  // THREE.JS SAHNE, IŞIKLANDIRMA VE ETKİLEŞİM YÖNETİMİ
  // ========================================================

  function init(containerEl, caseItem) {
    stop();
    if (!containerEl || !window.THREE) return;
    container = containerEl;
    currentCase = caseItem;

    container.innerHTML = '';

    // Wrap yapısı
    var wrap = document.createElement('div');
    wrap.className = 'three-canvas-wrap';
    wrap.style.cssText = 'position:relative; width:100%; height:100%; min-height:280px; overflow:hidden; border-radius:18px; background:radial-gradient(circle at center, #16202e 0%, #090e15 100%); touch-action:none; user-select:none;';

    // Üst Bilgi Barı: CPK Standardı & Kimyasal Formül
    var topBadge = document.createElement('div');
    topBadge.style.cssText = 'position:absolute; top:10px; left:12px; right:12px; z-index:5; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px; pointer-events:none;';
    topBadge.innerHTML = 
      '<div style="background:rgba(14,20,27,0.85); backdrop-filter:blur(8px); padding:4px 10px; border-radius:9999px; border:1px solid rgba(126,208,255,0.3); color:#7ed0ff; font-family:monospace; font-size:0.75rem; font-weight:700;">' +
        '⚛ CPK STANDARDI 3D MOLEKÜL' +
      '</div>' +
      '<div style="background:rgba(14,20,27,0.85); backdrop-filter:blur(8px); padding:4px 12px; border-radius:9999px; border:1px solid rgba(255,255,255,0.15); color:#ffffff; font-size:0.78rem; font-weight:700;">' +
        (caseItem.chemicalEquation || 'Moleküler Reorganizasyon') +
      '</div>';
    wrap.appendChild(topBadge);

    // Alt İpucu Barı (Corey-Pauling-Koltun Element Renk Rehberi & Fare Döndürme)
    var bottomHint = document.createElement('div');
    bottomHint.style.cssText = 'position:absolute; bottom:8px; left:12px; right:12px; z-index:5; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px; pointer-events:none; font-size:0.72rem; color:#94a3b8;';
    bottomHint.innerHTML = 
      '<div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">' +
        '<span style="background:rgba(9,14,21,0.8); padding:3px 8px; border-radius:6px;">🖱 360° Çevir • Yakınlaştır</span>' +
        '<span style="background:rgba(9,14,21,0.8); padding:3px 8px; border-radius:6px; font-family:monospace; font-size:0.68rem;">' +
          '<strong style="color:#ffffff;">H</strong>: Beyaz • <strong style="color:#a1a1aa;">C</strong>: Siyah • <strong style="color:#ef4444;">O</strong>: Kırmızı • <strong style="color:#c85a17;">Fe/Cu</strong>: Metal • <strong style="color:#16a34a;">Ca</strong>: Yeşil • <strong style="color:#daa520;">Si</strong>: Altın' +
        '</span>' +
      '</div>' +
      '<span style="background:' + (caseItem.correctType === 'chemical' ? 'rgba(217,119,6,0.35); color:#fde68a;' : 'rgba(2,132,199,0.35); color:#bae6fd;') + ' padding:3px 8px; border-radius:6px; font-weight:700;">' +
        (caseItem.correctType === 'chemical' ? 'Kimyasal: Bağlar Değişir' : 'Fiziksel: Molekül Korunur') +
      '</span>';
    wrap.appendChild(bottomHint);

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

    // Mouse Down
    el.addEventListener('mousedown', function (e) {
      isDragging = true;
      autoRotate = false;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    // Mouse Move
    window.addEventListener('mousemove', function (e) {
      if (!isDragging) return;
      var deltaX = e.clientX - previousMousePosition.x;
      var deltaY = e.clientY - previousMousePosition.y;

      targetRotation.y += deltaX * 0.008;
      targetRotation.x += deltaY * 0.008;
      targetRotation.x = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, targetRotation.x));

      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    // Mouse Up
    window.addEventListener('mouseup', function () {
      isDragging = false;
    });

    // Wheel Zoom
    el.addEventListener('wheel', function (e) {
      e.preventDefault();
      targetCameraDistance += e.deltaY * 0.02;
      targetCameraDistance = Math.max(minDistance, Math.min(maxDistance, targetCameraDistance));
    }, { passive: false });

    // Touch Support (Mobil)
    var initialTouchDistance = null;

    el.addEventListener('touchstart', function (e) {
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

  // Render & Animasyon Döngüsü
  var clock = 0;
  function animate() {
    animFrameId = requestAnimationFrame(animate);
    clock += 0.02;

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

    // Dinamik Parçacık Animasyonları (Yükselme, Titreşim, Kayma)
    for (var i = 0; i < dynamicObjects.length; i++) {
      var item = dynamicObjects[i];
      var m = item.mesh;
      if (!m) continue;

      if (item.type === 'rise') {
        m.position.y += item.speed;
        if (m.position.y > item.maxY) {
          m.position.y = item.minY;
        }
      } else if (item.type === 'float') {
        m.position.y = item.baseY + Math.sin(clock * 2 + i) * 0.35;
      } else if (item.type === 'slide') {
        m.position.x = Math.sin(clock * 1.5) * item.maxSlide;
      } else if (item.type === 'pulse') {
        var scale = item.baseScale + Math.sin(clock * 3 + i) * 0.08;
        m.scale.set(scale, scale, scale);
      } else if (item.type === 'swirl') {
        item.angle += item.speed;
        m.position.x = Math.cos(item.angle) * item.radius;
        m.position.y = Math.sin(item.angle) * item.radius;
      } else if (item.type === 'drift') {
        m.position.x = item.rx + Math.sin(clock + i) * 0.6;
        m.position.y = item.ry + Math.cos(clock * 1.2 + i) * 0.4;
      }
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
    dynamicObjects = [];
    if (renderer && renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    renderer = null;
    scene = null;
    camera = null;
    rootGroup = null;
  }

  return {
    init: init,
    stop: stop,
    resize: resize
  };
})();

// Geriye dönük uyumluluk için alias
window.MolecularSimulator = window.ThreeMolecularSimulator;
