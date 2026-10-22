import * as THREE from 'three';
import { CELL_SIZE, TYPE_MAP, mechanismColor } from './level.js';
const cache = new Map();
const supported = new Set(['ground','box1x1','box2x1x2','glass','glass2x1x2','laser1x1x1','laser2x1x1','laser2x1x2','player','soldier','target','trigger','laserTrigger','portal','door','spring','slider1x1x3','slider2x1x3','boundary']);
const root = `${import.meta.env.BASE_URL}unity/`;
const loader = new THREE.TextureLoader();
const color = (v = [1,1,1]) => new THREE.Color(v[0],v[1],v[2]);
function texture(t, srgb = true) {
  if (!t) return null;
  const map = loader.load(root + t.file);
  map.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.fromArray(t.scale); map.offset.fromArray(t.offset);
  return map;
}
function material(data) {
  const f = data.floats, c = data.colors, t = data.textures;
  const tint = c._Color || [1,1,1,1];
  if (data.shader === 'PuppetGo/Portal Glow' || data.shader === 'PuppetGo/Goal Beam') {
    const beam = data.shader.endsWith('Goal Beam');
    return new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: beam ? THREE.NormalBlending : THREE.AdditiveBlending,
      uniforms: { tint: { value: new THREE.Vector4(...tint) }, intensity: { value: f._Intensity ?? 1 }, time: { value: 0 } },
      vertexShader: 'varying vec2 artUv; void main(){artUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: beam ? `uniform vec4 tint;uniform float intensity,time;varying vec2 artUv;
      void main(){float fade=(1.-smoothstep(.72,1.,artUv.y))*smoothstep(0.,.015,artUv.y);
      float ribbons=.78+.14*sin(artUv.x*50.265)+.08*sin(artUv.x*94.248+time*.45);
      float pulse=.92+.08*sin(time*1.8-artUv.y*5.);gl_FragColor=vec4(tint.rgb*intensity,tint.a*fade*ribbons*pulse);}`
      : 'uniform vec4 tint;void main(){gl_FragColor=tint;}'
    });
  }
  const mat = new THREE.MeshStandardMaterial({ color: color(tint), map: texture(t._MainTex || t._BaseMap),
    metalness: f._Metallic ?? 0, roughness: 1-(f._Glossiness ?? .5),
    transparent: (f._Mode ?? 0) >= 2 || tint[3] < 1, opacity: tint[3],
    normalMap: texture(t._BumpMap, false), normalScale: new THREE.Vector2(f._BumpScale ?? 1, f._BumpScale ?? 1),
    aoMap: texture(t._OcclusionMap, false), aoMapIntensity: f._OcclusionStrength ?? 1,
    emissive: color(c._EmissionColor || [0,0,0]), emissiveMap: texture(t._EmissionMap),
    alphaTest: f._Mode === 1 ? (f._Cutoff ?? .5) : 0,
    side: f._Cull === 0 ? THREE.DoubleSide : THREE.FrontSide });
  mat.depthWrite = !mat.transparent;
  mat.userData.unityShader = data.shader;
  if (data.shader === 'PuppetGo/Bright Grove') {
    mat.roughness = .8;
    mat.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, {
        paletteScale:{value:new THREE.Vector2(...(t._MainTex?.scale || [1,1]))},
        paletteOffset:{value:new THREE.Vector2(...(t._MainTex?.offset || [0,0]))},
        groveDetail: { value: texture(t._DetailTex) }, groveWood: { value: texture(t._WoodTex) }, groveStone: { value: texture(t._StoneTex) },
        woodMean: { value: color(c._WoodMean) }, groveStoneMean: { value: color(c._StoneMean) },
        detailStrength: { value: f._DetailStrength ?? 0 }, detailScale: { value: f._DetailScale ?? 1.5 },
        woodAmount: { value: f._WoodAmount ?? 0 }, stoneAmount: { value: f._StoneAmount ?? 0 },
        woodScale: { value: f._WoodScale ?? 1.25 }, stoneScale: { value: f._StoneScale ?? 1.25 }, groveGlow: { value: f._Glow ?? .25 }
      });
      shader.vertexShader = 'varying vec3 grovePosition,groveNormal;varying vec2 groveUv;uniform vec2 paletteScale,paletteOffset;\n'+shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ngrovePosition=position;groveNormal=normal;groveUv=uv*paletteScale+paletteOffset;');
      shader.fragmentShader = `varying vec3 grovePosition,groveNormal;varying vec2 groveUv;
        uniform sampler2D groveDetail,groveWood,groveStone;uniform vec3 woodMean,groveStoneMean;
        uniform float detailStrength,detailScale,woodAmount,stoneAmount,woodScale,stoneScale,groveGlow;
        vec3 groveSample(sampler2D tex,vec3 p,vec3 w){return texture2D(tex,p.yz).rgb*w.x+texture2D(tex,p.xz).rgb*w.y+texture2D(tex,p.xy).rgb*w.z;}
        `+shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        vec3 weights=pow(abs(groveNormal),vec3(4.));weights/=max(dot(weights,vec3(1.)),.0001);
        float swatch=floor(groveUv.x*8.)+floor(groveUv.y*4.)*8.;
        float wood=step(7.5,swatch)*(1.-step(11.5,swatch));
        float stone=1.-step(3.5,swatch)+step(23.5,swatch)*(1.-step(27.5,swatch));
        vec3 original=diffuseColor.rgb,detail=groveSample(groveDetail,grovePosition*detailScale,weights);
        diffuseColor.rgb*=1.+detailStrength*(wood*(detail.r-.5)+stone*(detail.g-.5));
        if(wood>.5&&woodAmount>0.)diffuseColor.rgb=mix(diffuseColor.rgb,original*groveSample(groveWood,grovePosition*woodScale,weights)/max(woodMean,vec3(.01)),woodAmount);
        if(stone>.5&&stoneAmount>0.)diffuseColor.rgb=mix(diffuseColor.rgb,original*groveSample(groveStone,grovePosition*stoneScale,weights)/max(groveStoneMean,vec3(.01)),stoneAmount);
        totalEmissiveRadiance+=original*groveGlow*step(original.r+.12,original.b)*step(.5,original.b);`);
    };
    mat.customProgramCacheKey = () => 'unity-bright-grove-v1';
  }
  if (data.shader === 'PuppetGo/Mechanism Paint') {
    mat.userData.mechanism = true;
    mat.onBeforeCompile = shader => {
      shader.uniforms.pairedAccent = { value: color(c._MechanismColor) };
      shader.uniforms.pairedAmount = { value: f._MechanismColorAmount ?? 0 };
      shader.uniforms.paintReference = { value: f._PaintValueReference ?? .18434186 };
      mat.userData.shader = shader;
      shader.fragmentShader = 'uniform vec3 pairedAccent;uniform float pairedAmount,paintReference;\n'+shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        float paintValue=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
        diffuseColor.rgb=mix(diffuseColor.rgb,pairedAccent*clamp(paintValue/max(paintReference,.001),.5,1.45),pairedAmount);`);
    };
    mat.customProgramCacheKey = () => 'unity-mechanism-paint-v1';
  }
  if (data.shader === 'PuppetGo/Boundary Limestone') {
    mat.map = null;
    mat.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, {
        stoneTex: { value: texture(t._StoneTex) }, stoneMean: { value: color(c._StoneMean || [.8707296,.73791426,.518129]) },
        mortar: { value: color(c._Mortar) }, brickWidth: { value: f._BrickWidth ?? .8 }, brickHeight: { value: f._BrickHeight ?? .4 },
        jointWidth: { value: f._Joint ?? .009 }, grainAmount: { value: f._TextureAmount ?? .58 }
      });
      shader.vertexShader = 'varying vec3 artWorld;\n'+shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nartWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
      shader.fragmentShader = 'varying vec3 artWorld;uniform sampler2D stoneTex;uniform vec3 stoneMean,mortar;uniform float brickWidth,brickHeight,jointWidth,grainAmount;\n'+shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        vec3 n=abs(normalize(cross(dFdx(artWorld),dFdy(artWorld))));
        bool top=n.y>max(n.x,n.z);vec2 p=top?artWorld.xz:(n.x>n.z?artWorld.zy:artWorld.xy);
        vec2 sz=top?vec2(brickHeight):vec2(brickWidth,brickHeight);
        float row=floor(p.y/sz.y);vec2 shifted=p+vec2(top?0.:mod(abs(row),2.)*sz.x*.5,0.);
        vec2 brick=floor(shifted/sz),local=fract(shifted/sz)*sz,dist=min(local,sz-local);
        float d=min(dist.x,dist.y),chip=(sin(p.x*53.+p.y*29.)*.5+.5)*.0018,aa=max(fwidth(d),.0005);
        float body=smoothstep(jointWidth*.5+chip-aa,jointWidth*.5+chip+aa,d);
        float edge=smoothstep(jointWidth*.5,jointWidth*.5+.012,d);
        float variation=.95+.10*fract(sin(dot(brick,vec2(127.1,311.7)))*43758.5453);
        vec3 weights=pow(n,vec3(4.));weights/=max(dot(weights,vec3(1.)),.0001);vec3 q=artWorld*1.15;
        vec3 grain=texture2D(stoneTex,q.yz).rgb*weights.x+texture2D(stoneTex,q.xz).rgb*weights.y+texture2D(stoneTex,q.xy).rgb*weights.z;
        vec3 stone=diffuseColor.rgb*variation*mix(vec3(1.),grain/max(stoneMean,vec3(.01)),grainAmount)*mix(.94,1.,edge);
        diffuseColor.rgb=mix(mortar,stone,body);`);
    };
    mat.customProgramCacheKey = () => 'unity-limestone-v1';
  }
  return mat;
}
export async function loadUnityArt(type) {
  if (!supported.has(type)) return null;
  if (cache.has(type)) return cache.get(type);
  const pending = (async () => {
    const source = type === 'glass2x1x2' ? 'glass' : type;
    const response = await fetch(root+source+'.json');
    if (!response.ok) throw new Error(`Unity art ${source}: ${response.status}`);
    const data = await response.json();
    const object = new THREE.Group();object.userData.unityArt = true;
    for (const part of data.parts) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(part.positions,3));
      if (part.normals.length) geo.setAttribute('normal',new THREE.Float32BufferAttribute(part.normals,3)); else geo.computeVertexNormals();
      if(part.uv.length) { geo.setAttribute('uv',new THREE.Float32BufferAttribute(part.uv,2)); geo.setAttribute('uv1',new THREE.Float32BufferAttribute(part.uv,2)); }
      geo.setIndex(part.indices);
      const mesh = new THREE.Mesh(geo,material(part.material));mesh.name=part.name;
      mesh.castShadow=!mesh.material.transparent;mesh.receiveShadow=true;object.add(mesh);
    }
    // Unity long-laser models extend along Z; the editor's zero rotation extends along X.
    if (type === 'laser2x1x1' || type === 'laser2x1x2') { object.rotation.y=-Math.PI/2; object.updateMatrixWorld(true); }
    if (TYPE_MAP[type]?.hasFacing && !TYPE_MAP[type]?.hasRotation) { object.rotation.y=Math.PI; object.updateMatrixWorld(true); }
    const bounds = new THREE.Box3().setFromObject(object), size=bounds.getSize(new THREE.Vector3());
    const info=TYPE_MAP[type];
    const dimensions=type==='player'?[.64,1.6,.45]:type==='soldier'?[.64,1.2,.45]:type==='target'?[.8,4.8,.8]:type==='spring'?[.8,1.6,.8]:type==='boundary'?[.8,.4,.8]:type==='trigger'?[.5,.004,.5]:[info.size.nx*CELL_SIZE,info.size.ny*CELL_SIZE,info.size.nz*CELL_SIZE];
    // Bake normalization into geometry so rotations can use grid-facing conventions.
    const scale=new THREE.Vector3(...dimensions).divide(size);
    const center=bounds.getCenter(new THREE.Vector3());
    for(const child of object.children) {
      child.geometry.applyMatrix4(object.matrixWorld);
      child.geometry.translate(-center.x,-bounds.min.y,-center.z);
      child.geometry.scale(scale.x,scale.y,scale.z);
    }
    object.rotation.set(0,0,0);object.updateMatrixWorld(true);
    return object;
  })().catch(error => { console.warn(error); return null; });
  cache.set(type,pending);return pending;
}
export function applyUnityProperties(object, scene, entity, disposables = []) {
  object.traverse(child => {
    if (!child.isMesh) return;
    if (child.material.userData.mechanism) {
      const original=child.material.onBeforeCompile;
      const cacheKey=child.material.customProgramCacheKey;
      child.material=child.material.clone();
      child.material.customProgramCacheKey=cacheKey;
      disposables.push(child.material);
      const c=new THREE.Color(mechanismColor(scene,entity));
      child.material.onBeforeCompile=shader=>{original(shader);shader.uniforms.pairedAccent.value.copy(c);shader.uniforms.pairedAmount.value=entity.number==null?0:1;};
    }
  });
}
export function animateUnityArt(scene,time) {
  scene.traverse(object=>{const u=object.material?.uniforms;if(u?.time)u.time.value=time;});
}
