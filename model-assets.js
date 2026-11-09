import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// Optional licensed architecture. These models are loaded only after the core world is ready.
export function loadStageOneModels(scene, mobile=false) {
  const loader = new GLTFLoader();
  const models = [
    {file:'distressed_house.glb', name:'Distressed House', position:[-34,0,22], width:13, depth:16},
    {file:'vela_architecture.glb', name:'Vela Architecture', position:[34,0,22], width:19, depth:20}
  ];
  const status = document.getElementById('worldStatus');
  models.forEach(({file,name,position,width,depth})=>{
    loader.load(new URL('./assets/models/'+file,import.meta.url).href, gltf=>{
      const root=gltf.scene;
      const bounds=new THREE.Box3().setFromObject(root);
      const size=bounds.getSize(new THREE.Vector3());
      if(!size.x||!size.y||!size.z)return;
      const scale=Math.min(width/size.x,depth/size.z,1.8);
      root.scale.setScalar(scale);
      root.updateMatrixWorld(true);
      const scaled=new THREE.Box3().setFromObject(root);
      const center=scaled.getCenter(new THREE.Vector3());
      root.position.set(position[0]-center.x,-scaled.min.y,position[2]-center.z);
      root.name=name;
      root.traverse(node=>{
        if(!node.isMesh)return;
        node.castShadow=!mobile;
        node.receiveShadow=!mobile;
        if(node.material){
          for(const m of (Array.isArray(node.material)?node.material:[node.material])){
            if(m.map)m.map.anisotropy=mobile?1:4;
          }
        }
      });
      scene.add(root);
      if(status && status.textContent.includes('Loading'))status.textContent='World ready · licensed 3D buildings loaded';
    },undefined,error=>{
      console.warn('Optional 3D model unavailable:',name,error);
    });
  });
}
