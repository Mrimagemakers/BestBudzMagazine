import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';

// Public Three.js example character assets. Models are loaded once, cloned with
// independent skeletons, and safely fall back to the built-in detailed residents.
// Models are supplied as locally hosted GLBs under assets/characters.
// Do not download the same demo character repeatedly for different residents.
const SOURCES={
  'maya.glb':'./assets/characters/maya.glb',
  'jules.glb':'./assets/characters/jules.glb',
  'ellis.glb':'./assets/characters/ellis.glb',
  'devin.glb':'./assets/characters/devin.glb',
  'simone.glb':'./assets/characters/simone.glb',
  'morgan.glb':'./assets/characters/morgan.glb'
};
const loader=new GLTFLoader();
const cache=new Map();
const available=fetch(new URL('./assets/characters/manifest.json',import.meta.url)).then(r=>r.ok?r.json():{available:[]}).then(m=>new Set(m.available||[])).catch(()=>new Set());
function fetchAsset(type){
  if(!SOURCES[type])return Promise.resolve(null);
  if(!cache.has(type))cache.set(type,new Promise((resolve,reject)=>{
    loader.load(new URL(SOURCES[type],import.meta.url).href,resolve,undefined,reject);
  }).catch(error=>{console.warn('Optional character GLB unavailable',type,error);return null}));
  return cache.get(type);
}
export async function upgradeResident(resident,type,{mobile=false,walking=false}={}){
  if(!(await available).has(type))return false;
  const asset=await fetchAsset(type);
  if(!asset||!resident?.root?.parent)return false;
  const model=cloneSkeleton(asset.scene);
  const bounds=new THREE.Box3().setFromObject(model);
  const dimensions=bounds.getSize(new THREE.Vector3());
  if(dimensions.y<.01)return false;
  const targetHeight=1.87;
  model.scale.setScalar(targetHeight/dimensions.y);
  model.updateMatrixWorld(true);
  const fitted=new THREE.Box3().setFromObject(model);
  model.position.y=-fitted.min.y;
  model.position.x=-fitted.getCenter(new THREE.Vector3()).x;
  model.position.z=-fitted.getCenter(new THREE.Vector3()).z;
  model.traverse(node=>{
    if(!node.isMesh)return;
    node.castShadow=!mobile;node.receiveShadow=!mobile;
    node.userData.npc=resident.info;
    const mats=Array.isArray(node.material)?node.material:[node.material];
    for(const material of mats)if(material?.map)material.map.anisotropy=mobile?1:4;
  });
  resident.root.add(model);
  // Hide the original mesh while retaining its transform and click metadata.
  resident.root.children.forEach(child=>{if(child!==model)child.visible=false});
  resident.limbs=[];resident.highFidelity=true;
  const mixer=new THREE.AnimationMixer(model);
  const preferred=walking?['Walk','walk','Walking','Run']:['Idle','idle','SambaDance'];
  const clip=preferred.map(name=>asset.animations.find(a=>a.name.toLowerCase()===name.toLowerCase())).find(Boolean)||asset.animations[0];
  if(clip)mixer.clipAction(clip).play();
  resident.mixer=mixer;
  return true;
}
