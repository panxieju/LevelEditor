import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { CELL_SIZE } from './level.js';

const modelCache = new Map();

export function withFbxAnimation(mesh, animation) {
  // 两个源文件的骨骼名称一致。保留模型的 Z-up → Y-up 转换和实体朝向，去除动作的全局根运动。
  mesh.animations = animation.animations.map(source => {
    const clip = source.clone();
    clip.tracks = clip.tracks.filter(track => !track.name.startsWith('root.'));
    return clip;
  });
  return mesh;
}

export function normalizeFbxTemplate(object, info) {
  // Rockman 的 FBX 带待机动作；先采样姿态，避免显示绑定姿态。
  if (info.preferFbx && object.animations?.length) {
    const mixer = new THREE.AnimationMixer(object);
    const clip = object.animations.find(animation => /idle/i.test(animation.name)) || object.animations[0];
    mixer.clipAction(clip).play();
    mixer.setTime(0);
    object.updateMatrixWorld(true);
    object.traverse(child => { if (child.isSkinnedMesh) child.skeleton.update(); });
  }
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  if (Number.isFinite(maxDim) && maxDim > 0) {
    object.scale.multiplyScalar(CELL_SIZE * (info.visualScale ?? 1) / maxDim);
    object.updateMatrixWorld(true);
    const normalizedBox = new THREE.Box3().setFromObject(object);
    const center = normalizedBox.getCenter(new THREE.Vector3());
    object.position.x -= center.x;
    object.position.z -= center.z;
    object.position.y -= normalizedBox.min.y;
  }
  // 把归一化偏移留在子对象中，实例的世界位置不会覆盖模型脚底对齐。
  const template = new THREE.Group();
  template.add(object);
  template.updateMatrixWorld(true);
  template.traverse(child => {
    if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
  });
  return template;
}

export function cloneFbxTemplate(template) {
  return cloneSkeleton(template);
}

export function loadFbxModel(info) {
  if (!info.fbx) return Promise.resolve(null);
  const key = `${info.fbx}|${info.meshFbx || ''}`;
  if (modelCache.has(key)) return modelCache.get(key);
  const loadSource = file => new Promise((resolve, reject) => {
    new FBXLoader().load(`${import.meta.env?.BASE_URL ?? '/'}models/${file}`, resolve, undefined, reject);
  });
  const promise = (async () => {
    try {
      let object = await loadSource(info.fbx);
      let hasMesh = false;
      object.traverse(child => { if (child.isMesh) hasMesh = true; });
      if (!hasMesh && info.meshFbx) object = withFbxAnimation(await loadSource(info.meshFbx), object);
      object.traverse(child => { if (child.isMesh) hasMesh = true; });
      if (!hasMesh) throw new Error('FBX 中没有可渲染网格');
      return normalizeFbxTemplate(object, info);
    } catch (error) {
      console.warn(`[PuppetGo] 加载 models/${info.fbx} 失败，使用备用模型。`, error);
      return null;
    }
  })();
  modelCache.set(key, promise);
  return promise;
}
