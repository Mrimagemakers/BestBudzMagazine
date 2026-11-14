import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';

// Public Three.js example character assets. Models are loaded once, cloned with
// independent skeletons, and safely fall back to the built-in detailed residents.
const SOURCES={
  michelle:'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/models/gltf/Michelle.glb',
  security:'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/models/gltf/Soldier.glb'
};
const loader=new GLTFLoader();
const cache=new Map();
function fetchAsset(type){
  if(!cache.has(type))cache.set(type,new Promise((resolve,reject)=>{
    loader.load(SOURCES[type],resolve,undefined,reject);
  }).catch(error=>{console.warn('Optional character GLB unavailable',type,error);return null}));
  return cache.get(type);
}
export async function upgradeResident(resident,type,{mobile=false,walking=false}={}){
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
