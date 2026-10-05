import {Box3, Matrix4} from '../vendor/three/three.module.js';

// Preserve exact contact with the viewport. Cache the bind-pose coordinates
// once, and compose each joint's matrix once per pose instead of once per
// vertex/influence in SkinnedMesh.computeBoundingBox(). No mesh simplification.
export function createCharacterBounds(model) {
  const meshes=[], worldBox=new Box3(), staticBox=new Box3(), matrix=new Matrix4();
  model.traverse(mesh=>{
    if(!mesh.isMesh)return;
    if(!mesh.isSkinnedMesh){
      mesh.geometry.computeBoundingBox();meshes.push({mesh,rest:mesh.geometry.boundingBox.clone()});return;
    }
    const {position,skinIndex,skinWeight}=mesh.geometry.attributes;
    const coordinates=new Float64Array(position.count*3), joints=new Uint32Array(position.count*4), weights=new Float64Array(position.count*4);
    for(let vertex=0;vertex<position.count;vertex++){
      const p=vertex*3;coordinates[p]=position.getX(vertex);coordinates[p+1]=position.getY(vertex);coordinates[p+2]=position.getZ(vertex);
      for(let axis=0;axis<4;axis++){
        const offset=vertex*4+axis;joints[offset]=skinIndex.getComponent(vertex,axis)*16;weights[offset]=skinWeight.getComponent(vertex,axis);
      }
    }
    meshes.push({mesh,coordinates,joints,weights,matrices:new Float64Array(mesh.skeleton.bones.length*16)});
  });
  return ()=>{
    model.updateMatrixWorld(true);worldBox.makeEmpty();
    for(const entry of meshes){
      const {mesh,coordinates,joints,weights,matrices}=entry;
      if(entry.rest){worldBox.union(staticBox.copy(entry.rest).applyMatrix4(mesh.matrixWorld));continue;}
      mesh.skeleton.bones.forEach((bone,index)=>{
        matrix.multiplyMatrices(mesh.matrixWorld,mesh.bindMatrixInverse)
          .multiply(bone.matrixWorld).multiply(mesh.skeleton.boneInverses[index]).multiply(mesh.bindMatrix);
        matrices.set(matrix.elements,index*16);
      });
      let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
      for(let p=0,vertex=0;p<coordinates.length;p+=3,vertex++){
        const px=coordinates[p],py=coordinates[p+1],pz=coordinates[p+2];let x=0,y=0,z=0;
        for(let axis=0;axis<4;axis++){
          const offset=vertex*4+axis,w=weights[offset];if(w===0)continue;
          const m=joints[offset];
          x+=(matrices[m]*px+matrices[m+4]*py+matrices[m+8]*pz+matrices[m+12])*w;
          y+=(matrices[m+1]*px+matrices[m+5]*py+matrices[m+9]*pz+matrices[m+13])*w;
          z+=(matrices[m+2]*px+matrices[m+6]*py+matrices[m+10]*pz+matrices[m+14])*w;
        }
        minX=Math.min(minX,x);minY=Math.min(minY,y);minZ=Math.min(minZ,z);
        maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);maxZ=Math.max(maxZ,z);
      }
      staticBox.min.set(minX,minY,minZ);staticBox.max.set(maxX,maxY,maxZ);worldBox.union(staticBox);
    }
    return worldBox;
  };
}
