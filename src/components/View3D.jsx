import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadUnityArt, applyUnityProperties, animateUnityArt } from '../unityArt.js';
import { loadFbxModel, cloneFbxTemplate } from '../fbxModels.js';
import {
  CELL_SIZE,
  boundaryProfile,
  TYPE_MAP,
  mechanismColor,
  FACING_ROTATION,
  FACING_DELTA,
  occupiedCells,
  isSpanningType,
  isLaserType,
  isDoorType,
  isSliderType,
  laserAxisFacing,
  laserMuzzleCell,
  doorLeafCells,
  normalizeTrack,
} from '../level.js';

export default function View3D({ scene }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const cameraReadyRef = useRef(false);
  const rafRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);

    const threeScene = new THREE.Scene();
    threeScene.background = new THREE.Color(0x0f172a);
    sceneRef.current = threeScene;

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
    camera.position.set(8, 9, 11);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 1, 0);
    controls.update();
    controlsRef.current = controls;

    const hemi = new THREE.HemisphereLight(0xffffff, 0x334155, 0.85);
    const dir = new THREE.DirectionalLight(0xffffff, 1.4);
    dir.position.set(6, 12, 8);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    const s = 16;
    dir.shadow.camera.left = -s;
    dir.shadow.camera.right = s;
    dir.shadow.camera.top = s;
    dir.shadow.camera.bottom = -s;
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 80;
    threeScene.add(hemi, dir);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    floor.receiveShadow = true;
    threeScene.add(floor);

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      if (!container.clientWidth || !container.clientHeight) return;
      controls.update();
      animateUnityArt(threeScene, performance.now() / 1000);
      renderer.render(threeScene, camera);
    };
    animate();

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // 窄分屏保留水平视野，避免只改变宽高比后关卡两侧被裁掉。
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(50) / 2) / Math.min(1, camera.aspect)));
      camera.updateProjectionMatrix();
    };
    onResize();
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(rafRef.current);
      controls.dispose();
      floor.geometry.dispose();
      floor.material.dispose();
      dir.shadow.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    const threeScene = sceneRef.current;
    if (!threeScene) return;

    const group = new THREE.Group();
    const disposables = [];
    const { width, depth } = scene.grid;
    const layerCount = scene.layerCount;
    const hw = (width * CELL_SIZE) / 2;
    const hd = (depth * CELL_SIZE) / 2;

    const gridMat = new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.7 });
    const gridPoints = [];
    for (let i = 0; i <= width; i++) {
      const x = -hw + i * CELL_SIZE;
      gridPoints.push(new THREE.Vector3(x, 0.001, -hd), new THREE.Vector3(x, 0.001, hd));
    }
    for (let j = 0; j <= depth; j++) {
      const z = -hd + j * CELL_SIZE;
      gridPoints.push(new THREE.Vector3(-hw, 0.001, z), new THREE.Vector3(hw, 0.001, z));
    }
    const gridGeo = new THREE.BufferGeometry().setFromPoints(gridPoints);
    group.add(new THREE.LineSegments(gridGeo, gridMat));
    disposables.push(gridGeo, gridMat);

    let cancelled = false;

    (async () => {
      for (const e of scene.entities) {
        if (cancelled) return;
        const info = TYPE_MAP[e.type];
        if (!info) continue;
        if (info.annotation) {
          const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
          const ctx=canvas.getContext('2d');ctx.fillStyle='#0284c7';ctx.beginPath();ctx.roundRect(4,4,248,100,24);ctx.fill();ctx.fillStyle='white';ctx.font='bold 66px sans-serif';ctx.textAlign='center';ctx.fillText('···',128,76);
          const texture=new THREE.CanvasTexture(canvas);const material=new THREE.SpriteMaterial({map:texture,depthTest:false});const marker=new THREE.Sprite(material);
          marker.position.set((e.x-(width-1)/2)*CELL_SIZE,e.layer*CELL_SIZE+.3,((depth-1)/2-e.z)*CELL_SIZE);marker.scale.set(.52,.26,1);marker.renderOrder=50;group.add(marker);disposables.push(texture,material);continue;
        }
        const preferredFbx = info.preferFbx ? await loadFbxModel(info) : null;
        const unityTemplate = preferredFbx ? null : await loadUnityArt(e.type);
        const template = preferredFbx || unityTemplate || await loadFbxModel(info);
        if (cancelled) return;
        let mesh;
        if (template) {
          mesh = unityTemplate ? template.clone() : cloneFbxTemplate(template);
          if (!unityTemplate && e.type === 'glass2x1x2') {
            mesh.scale.x *= 2;
            mesh.scale.y *= 2;
            mesh.rotation.y = e.rotation === 90 ? Math.PI / 2 : 0;
          }
          if (unityTemplate) applyUnityProperties(mesh, scene, e, disposables);
          mesh.traverse((child) => {
            if (unityTemplate) return;
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (e.type === 'laserTrigger') {
                const lens = child.name === 'ReceiverLens';
                child.material = new THREE.MeshStandardMaterial({ color: lens ? '#03B9F0' : mechanismColor(scene, e), metalness: lens ? 0.12 : 0.35, roughness: lens ? 0.18 : 0.52, transparent: lens, opacity: lens ? 0.85 : 1, emissive: lens ? '#035366' : '#000000' });
                disposables.push(child.material);
              }
              if (e.type === 'glass' || e.type === 'glass2x1x2') {
                const body = child.name === 'GlassBody';
                child.material = new THREE.MeshStandardMaterial({ color: body ? '#298DBB' : '#A3E8FF', transparent: body, opacity: body ? .62 : 1, depthWrite: !body, metalness: body ? .03 : .15, roughness: body ? .06 : .2 });
                child.castShadow = !body; disposables.push(child.material);
              }
              if (e.type === 'target') {
                const beam = child.name.startsWith('GoalBeam');
                const gold = child.name.startsWith('GoalGold');
                const stone = child.name === 'GoalStone' || child.name === 'GoalCentre';
                const imported = Array.isArray(child.material) ? child.material[0] : child.material;
                child.material = beam ? new THREE.ShaderMaterial({ transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.NormalBlending,vertexShader:'varying vec2 beamUV; void main(){beamUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 beamUV;void main(){float a=0.68*(1.0-smoothstep(0.72,1.0,beamUV.y))*(0.78+0.14*sin(beamUV.x*50.265));gl_FragColor=vec4(0.08,0.55,1.0,a);}' })
                  : new THREE.MeshStandardMaterial({ color:gold?'#FFB32E':child.name==='GoalCentre'?'#063D8C':stone?'#FFFFFF':'#0DA6FF',map:stone?imported.map:null,metalness:gold ? .5 : 0,roughness:.4,emissive:stone||gold?'#000000':'#0873CC',emissiveIntensity:1.2 });
                child.castShadow = !beam; disposables.push(child.material);
              }
              if (isSliderType(e.type)) {
                const accent = child.name.includes('Arrow');
                const imported = Array.isArray(child.material) ? child.material[0] : child.material;
                const panel = mesh.getObjectByName('SliderStone');
                const stoneMaterial = panel && (Array.isArray(panel.material) ? panel.material[0] : panel.material);
                child.material = new THREE.MeshStandardMaterial({ color: accent ? mechanismColor(scene, e) : '#E8DBC1', map: accent ? null : imported.map || stoneMaterial?.map, metalness: accent ? .2 : 0, roughness: .78 });
                disposables.push(child.material);
              }
            }
          });
        } else if (e.type === 'portal') {
          mesh = new THREE.Group();
          const metal = new THREE.MeshStandardMaterial({ color: 0x59b8f0, metalness: 0.22, roughness: 0.6 });
          const energy = new THREE.MeshBasicMaterial({ color: 0x33ddff, transparent: true, opacity: 0.65 });
          const wallGeo = new THREE.BoxGeometry(CELL_SIZE * 0.05, CELL_SIZE * 2.92, CELL_SIZE);
          const backGeo = new THREE.BoxGeometry(CELL_SIZE * 0.90, CELL_SIZE * 2.92, CELL_SIZE * 0.05);
          const roofGeo = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE * 0.05, CELL_SIZE);
          const floorGeo = new THREE.BoxGeometry(CELL_SIZE * 0.96, CELL_SIZE * 0.00625, CELL_SIZE * 0.96);
          const railGeo = new THREE.CylinderGeometry(0.007, 0.007, CELL_SIZE * 2.8, 6);
          for (const x of [-CELL_SIZE * 0.472, CELL_SIZE * 0.472]) {
            const wall = new THREE.Mesh(wallGeo, metal); wall.position.set(x, -CELL_SIZE * 0.01, 0); mesh.add(wall);
          }
          const back = new THREE.Mesh(backGeo, metal); back.position.set(0, -CELL_SIZE * 0.01, CELL_SIZE * 0.472); mesh.add(back);
          const roof = new THREE.Mesh(roofGeo, metal); roof.position.y = CELL_SIZE * 1.475; mesh.add(roof);
          const floor = new THREE.Mesh(floorGeo, metal); floor.position.y = -CELL_SIZE * 1.496875; mesh.add(floor);
          for (const x of [-0.32, 0.32]) for (const z of [-0.32]) {
            const rail = new THREE.Mesh(railGeo, energy); rail.position.set(x, 0, z); mesh.add(rail);
          }
          const lightRingGeo = new THREE.TorusGeometry(0.29, 0.008, 6, 40);
          for (const y of [-0.7, 0, 0.7]) {
            const ring = new THREE.Mesh(lightRingGeo, energy); ring.rotation.x = -Math.PI / 2; ring.position.y = y; mesh.add(ring);
          }
          mesh.traverse((part) => { if (part.isMesh) { part.castShadow = part.material === metal; part.receiveShadow = true; } });
          disposables.push(metal, energy, wallGeo, backGeo, roofGeo, floorGeo, railGeo, lightRingGeo);
        } else if (isDoorType(e.type) || e.type === 'lamp') {
          // 门 / 路灯用自定义几何体（门板 + 开门位、灯杆 + 灯头），见下面各自的分支
          mesh = null;
        } else {
          const size = info.size || { nx: 1, nz: 1, ny: 1 };
          let gw = info.visual?.w ?? size.nx * CELL_SIZE;
          let gd = info.visual?.d ?? size.nz * CELL_SIZE;
          const geoH = info.visual?.h ?? size.ny * CELL_SIZE;
          if (isSpanningType(e.type) && e.rotation === 90) {
            const tmp = gw;
            gw = gd;
            gd = tmp;
          }
          const geo = new THREE.BoxGeometry(gw, geoH, gd);
          const mat = new THREE.MeshStandardMaterial({
            color: mechanismColor(scene, e),
            roughness: 0.7,
            metalness: 0.05,
            transparent: Boolean(info.translucent),
            opacity: info.translucent ? 0.5 : 1,
          });
          mesh = new THREE.Mesh(geo, mat);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(geo),
            new THREE.LineBasicMaterial({ color: 0x1e293b })
          );
          mesh.add(edges);
          disposables.push(geo, mat, edges.geometry, edges.material);
        }
        const cells = occupiedCells(e);
        const cx = cells.reduce((s, c) => s + c.x, 0) / cells.length;
        const cz = cells.reduce((s, c) => s + c.z, 0) / cells.length;
        const blockH = info.visual?.h ?? (info.size?.ny || 1) * CELL_SIZE;
        const worldX = (cx - (width - 1) / 2) * CELL_SIZE;
        const worldZ = (cz - (depth - 1) / 2) * CELL_SIZE;
        const cellX = (c) => (c.x - (width - 1) / 2) * CELL_SIZE;
        const cellZ = (c) => (c.z - (depth - 1) / 2) * CELL_SIZE;
        let meshY;
        if (template) {
          meshY = e.layer * CELL_SIZE;
        } else {
          const bottomOffset =
            info.visual?.align === 'bottom' ? 0 : info.visual ? CELL_SIZE - blockH : 0;
          const bottomY = e.layer * CELL_SIZE + bottomOffset;
          meshY = bottomY + blockH / 2;
        }
        if (mesh) {
          mesh.position.set(worldX, meshY, worldZ);
          if (unityTemplate && info.hasRotation) mesh.rotation.y = e.rotation === 90 ? Math.PI / 2 : 0;
          if (unityTemplate && isLaserType(e.type) && isSpanningType(e.type)) mesh.rotation.y = ({ E: 0, W: Math.PI, N: Math.PI/2, S: -Math.PI/2 })[e.facing] ?? 0;
          if (info?.hasFacing && !isSpanningType(e.type)) {
            // 传送门几何的开口在 -Z；角色模型默认正面在 +Z。
            mesh.rotation.y = (FACING_ROTATION[e.facing] || 0) + (e.type === 'portal' && !unityTemplate ? Math.PI : 0);
          }
        }
        if (e.type === 'boundary' && mesh) {
          const profile = boundaryProfile(scene, e);
          if (unityTemplate) mesh.scale.set(profile.w, profile.h / .5, profile.d);
          else { mesh.scale.set(profile.w, 1, profile.d / .5); mesh.position.y = e.layer * CELL_SIZE + CELL_SIZE * profile.h / 2; }
          mesh.position.x += profile.offsetX * CELL_SIZE;
          mesh.position.z += profile.offsetZ * CELL_SIZE;
        }
        if (isLaserType(e.type)) {
          // 发射方向固定平行于长边：炮口画在长边最前端那一格的外侧，每个高度层一个炮口。
          const facing = laserAxisFacing(e.rotation, e.facing, e.type);
          const delta = FACING_DELTA[facing] || FACING_DELTA.S;
          const dir = new THREE.Vector3(delta.x, 0, delta.z);
          const muzzle = laserMuzzleCell(e);
          const muzzleX = (muzzle.x - (width - 1) / 2) * CELL_SIZE + delta.x * (CELL_SIZE / 2 + 0.06);
          const muzzleZ = (muzzle.z - (depth - 1) / 2) * CELL_SIZE + delta.z * (CELL_SIZE / 2 + 0.06);
          const ports = Math.max(1, info.size?.ny || 1);
          const laserConeGeo = new THREE.ConeGeometry(0.09, 0.3, 8);
          const laserConeMat = new THREE.MeshBasicMaterial({ color: 0xf0abfc });
          for (let p = 0; p < ports; p++) {
            const laserCone = new THREE.Mesh(laserConeGeo, laserConeMat);
            laserCone.position.set(
              muzzleX,
              e.layer * CELL_SIZE + blockH * ((p + 0.5) / ports),
              muzzleZ
            );
            laserCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
            group.add(laserCone);
          }
          disposables.push(laserConeGeo, laserConeMat);
        }
        if (isDoorType(e.type) && !unityTemplate) {
          // 门：占 2 格、高 3 格，画成两扇门板；两端开门位用虚线框标出
          const doorGeo = new THREE.BoxGeometry(CELL_SIZE * 0.92, blockH, CELL_SIZE * 0.12);
          const doorMat = new THREE.MeshStandardMaterial({
            color: mechanismColor(scene, e),
            roughness: 0.6,
            metalness: 0.1,
          });
          const slotGeo = new THREE.BoxGeometry(CELL_SIZE * 0.7, blockH * 0.96, CELL_SIZE * 0.7);
          const slotEdges = new THREE.EdgesGeometry(slotGeo);
          const slotMat = new THREE.LineBasicMaterial({
            color: 0xfdba74,
            transparent: true,
            opacity: 0.55,
          });
          const gateCells = occupiedCells(e);
          const pillarGeo = new THREE.BoxGeometry(CELL_SIZE * 0.94, blockH, CELL_SIZE * 0.72);
          const pillarMat = new THREE.MeshStandardMaterial({ color: 0xeee4c8, roughness: 0.85 });
          const barGeo = new THREE.BoxGeometry(CELL_SIZE * 0.065, blockH * 0.82, CELL_SIZE * 0.14);
          const capGeo = new THREE.BoxGeometry(CELL_SIZE * 0.98, CELL_SIZE * 0.18, CELL_SIZE * 0.9);
          const capMat = new THREE.MeshStandardMaterial({ color: 0xffcb53, metalness: 0.4, roughness: 0.38 });
          for (const [index, c] of gateCells.entries()) {
            const panel = new THREE.Mesh(doorGeo, doorMat);
            panel.position.set(cellX(c), e.layer * CELL_SIZE + blockH / 2, cellZ(c));
            if (e.rotation === 90) panel.rotation.y = Math.PI / 2;
            panel.castShadow = true;
            panel.receiveShadow = true;
            if (index === 0 || index === 3) {
              panel.geometry = pillarGeo; panel.material = pillarMat; group.add(panel);
              const cap = new THREE.Mesh(capGeo, capMat);
              cap.position.copy(panel.position); cap.position.y += blockH / 2 - CELL_SIZE * 0.09;
              cap.rotation.copy(panel.rotation); group.add(cap);
            } else {
              for (let barIndex = 0; barIndex < 5; barIndex++) {
                const bar = new THREE.Mesh(barGeo, doorMat);
                bar.position.copy(panel.position);
                const offset = (barIndex - 2) * CELL_SIZE * 0.19;
                if (e.rotation === 90) bar.position.z += offset; else bar.position.x += offset;
                bar.rotation.copy(panel.rotation); bar.castShadow = true; group.add(bar);
              }
            }
          }
          const lintelGeo = new THREE.BoxGeometry(CELL_SIZE * 2, CELL_SIZE * 0.025, CELL_SIZE * 0.72);
          const lintel = new THREE.Mesh(lintelGeo, pillarMat);
          lintel.position.set((cellX(gateCells[0]) + cellX(gateCells[3])) / 2,
            e.layer * CELL_SIZE + blockH - CELL_SIZE * 0.0125,
            (cellZ(gateCells[0]) + cellZ(gateCells[3])) / 2);
          if (e.rotation === 90) lintel.rotation.y = Math.PI / 2;
          lintel.castShadow = true; group.add(lintel); disposables.push(lintelGeo);
          for (const c of doorLeafCells(e)) {
            const slot = new THREE.LineSegments(slotEdges, slotMat);
            slot.position.set(cellX(c), e.layer * CELL_SIZE + blockH / 2, cellZ(c));
            group.add(slot);
          }
          disposables.push(doorGeo, doorMat, slotGeo, slotEdges, slotMat);
          disposables.push(pillarGeo, pillarMat, barGeo, capGeo, capMat);
        } else if (e.type === 'lamp') {
          // 路灯：灯杆 + 发光灯头
          const postGeo = new THREE.CylinderGeometry(0.03, 0.045, CELL_SIZE * 0.8, 8);
          const postMat = new THREE.MeshStandardMaterial({
            color: 0x334155,
            roughness: 0.5,
            metalness: 0.4,
          });
          const headGeo = new THREE.SphereGeometry(0.075, 12, 12);
          const headMat = new THREE.MeshBasicMaterial({ color: 0xfde68a });
          const post = new THREE.Mesh(postGeo, postMat);
          post.position.set(worldX, e.layer * CELL_SIZE + CELL_SIZE * 0.4, worldZ);
          post.castShadow = true;
          const head = new THREE.Mesh(headGeo, headMat);
          head.position.set(worldX, e.layer * CELL_SIZE + CELL_SIZE * 0.85, worldZ);
          group.add(post, head);
          disposables.push(postGeo, postMat, headGeo, headMat);
        }
        if (mesh) group.add(mesh);

        if (isSliderType(e.type)) {
          const path = [{ x: e.x, z: e.z }, ...normalizeTrack(e, e.track)];
          if (template && e.rotation === 90) mesh.rotation.y = Math.PI / 2;
          if (unityTemplate && !mesh.getObjectByName('DirectionArrows')) {
            const arrows=new THREE.Group();arrows.name='DirectionArrows';
            for(const child of [...mesh.children])if(child.name.includes('Arrow'))arrows.add(child);
            const tail=new THREE.Object3D(),tip=new THREE.Object3D();tail.name='ArrowTail';tip.name='ArrowTip';
            // Unity art export mirrors X; retain its baked initial arrow direction.
            tail.position.x=.24;tip.position.x=-.24;arrows.add(tail,tip);mesh.add(arrows);
          }
          if (template && path.length > 1) {
            mesh.updateMatrixWorld(true);
            const arrows = mesh.getObjectByName('DirectionArrows'), tail = mesh.getObjectByName('ArrowTail'), tip = mesh.getObjectByName('ArrowTip');
            if (arrows && tail && tip) {
              const direction = tip.getWorldPosition(new THREE.Vector3()).sub(tail.getWorldPosition(new THREE.Vector3()));
              const targetAngle = Math.atan2(-(path[1].z - e.z), path[1].x - e.x);
              const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), targetAngle - Math.atan2(-direction.z,direction.x));
              const current = arrows.getWorldQuaternion(new THREE.Quaternion());
              const parentInverse = arrows.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
              arrows.quaternion.copy(parentInverse.multiply(turn).multiply(current));
            }
          }
          const railTemplate = path.length > 1 ? await loadFbxModel({type:'sliderRail',fbx:'SliderRail.fbx',visualScale:1}) : null;
          if (cancelled) return;
          const seen = new Set();
          if (railTemplate) for (const p of path) {
            const d = { x:path[1].x-e.x, z:path[1].z-e.z };
            for (const c of occupiedCells({...e,x:p.x,z:p.z})) {
              const key = `${c.x},${c.z}`; if(seen.has(key)) continue; seen.add(key);
              const marking = railTemplate.clone();
              marking.position.set(cellX(c),e.layer*CELL_SIZE+.0005,cellZ(c));
              const tail=marking.getObjectByName('ArrowTail'), tip=marking.getObjectByName('ArrowTip');
              marking.updateMatrixWorld(true);
              const direction=tip.getWorldPosition(new THREE.Vector3()).sub(tail.getWorldPosition(new THREE.Vector3()));
              marking.rotation.y += Math.atan2(-d.z,d.x)-Math.atan2(-direction.z,direction.x);
              marking.traverse(child=>{if(child.isMesh && child.name.startsWith('RailAccent')){
                child.material=new THREE.MeshStandardMaterial({color:mechanismColor(scene,e),roughness:.62});
                disposables.push(child.material);
              }});
              group.add(marking);
            }
          }
        }

        if (e.type === 'soldier' && Array.isArray(e.route) && e.route.length >= 1) {
          const routeY = (e.layer + 1) * CELL_SIZE + 0.18;
          const routePts = [{ x: e.x, z: e.z, wait: 0 }, ...e.route].map((p) => ({
            v: new THREE.Vector3(
              (p.x - (width - 1) / 2) * CELL_SIZE,
              routeY,
              (p.z - (depth - 1) / 2) * CELL_SIZE
            ),
            wait: p.wait || 0,
          }));
          const routeGeo = new THREE.BufferGeometry().setFromPoints(routePts.map((p) => p.v));
          const routeMat = new THREE.LineBasicMaterial({ color: 0xef4444 });
          group.add(new THREE.Line(routeGeo, routeMat));
          disposables.push(routeGeo, routeMat);

          const dotGeo = new THREE.SphereGeometry(0.06, 12, 12);
          const dotMatA = new THREE.MeshBasicMaterial({ color: 0xffffff });
          const dotMatB = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
          for (const p of routePts) {
            const dot = new THREE.Mesh(dotGeo, p.wait > 0 ? dotMatB : dotMatA);
            dot.position.copy(p.v);
            group.add(dot);
          }
          disposables.push(dotGeo, dotMatA, dotMatB);

          const coneGeo = new THREE.ConeGeometry(0.07, 0.22, 8);
          const coneMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
          const up = new THREE.Vector3(0, 1, 0);
          for (let i = 0; i < routePts.length - 1; i++) {
            const a = routePts[i];
            const b = routePts[i + 1];
            const dir = new THREE.Vector3().subVectors(b.v, a.v);
            if (dir.lengthSq() === 0) continue;
            dir.normalize();
            const cone = new THREE.Mesh(coneGeo, coneMat);
            cone.position.copy(a.v).lerp(b.v, 0.5);
            cone.quaternion.setFromUnitVectors(up, dir);
            group.add(cone);
          }
          disposables.push(coneGeo, coneMat);
        }
      }
      if (!cancelled) threeScene.add(group);
    })();

    if (!cameraReadyRef.current) {
      cameraReadyRef.current = true;
      const cam = cameraRef.current;
      const controls = controlsRef.current;
      if (cam && controls) {
        const targetY = Math.max(1, (layerCount * CELL_SIZE) / 2);
        controls.target.set(0, targetY, 0);
        cam.position.set(hw * 0.9 + 3, hw * 0.75 + targetY + 2.5, hd * 1.1 + 4);
        controls.update();
      }
    }

    return () => {
      cancelled = true;
      if (group.parent === threeScene) threeScene.remove(group);
      for (const d of disposables) {
        if (d && typeof d.dispose === 'function') d.dispose();
      }
      group.clear();
    };
  }, [scene]);

  return <div ref={containerRef} className="viewport-canvas" />;
}
