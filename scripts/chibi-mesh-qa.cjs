const fs=require('node:fs');
const assert=require('node:assert/strict');
const readGLB=file=>{
 const bytes=fs.readFileSync(file),jsonLength=bytes.readUInt32LE(12);
 assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);
 return {json:JSON.parse(bytes.subarray(20,20+jsonLength)),binary:bytes.subarray(28+jsonLength)};
};
const asset=readGLB('assets/models/fabiano-chibi.glb');
const original=readGLB('assets/models/fabiano-chibi-original.glb');
const {json,binary}=asset,primitive=json.meshes[0].primitives[0],skin=json.skins[0];
assert.equal(json.animations?.length||0,0,'Mesh has no automatically played embedded animations');
assert.equal(skin.joints.length,34,'Uses the skeleton supplied with the replacement mesh');
const names=new Set(json.nodes.map(node=>node.name));
for(const stem of ['idle','hanging-idle','falling','sad-walk','stand-up','talking']){
 const clip=JSON.parse(fs.readFileSync(`assets/models/${stem}.js`,'utf8').match(/export default (\{.*\});/s)[1]);
 assert.equal(clip.tracks.length,35,'Retargeted rotations and hip position for the replacement skeleton');
 for(const track of clip.tracks)assert(names.has(track.name.split('.')[0]),`${stem}: animation binds to ${track.name}`);
}
const access=id=>{
 const a=json.accessors[id],v=json.bufferViews[a.bufferView];
 return {a,offset:(v.byteOffset||0)+(a.byteOffset||0)};
};
const weights=access(primitive.attributes.WEIGHTS_0),indices=access(primitive.attributes.JOINTS_0);
for(let i=0;i<weights.a.count;i++){
 let sum=0;
 for(let k=0;k<4;k++){
  sum+=binary.readFloatLE(weights.offset+(i*4+k)*4);
  assert(binary.readUInt16LE(indices.offset+(i*4+k)*2)<skin.joints.length,'Valid skin joint');
 }
 assert(Math.abs(sum-1)<1e-6,'Normalized deformation weights');
}
const imageBytes=(data,image)=>{
 const view=data.json.bufferViews[image.bufferView];return data.binary.subarray(view.byteOffset,view.byteOffset+view.byteLength);
};
assert.equal(json.images.length,original.json.images.length);
json.images.forEach((image,i)=>assert.deepEqual(imageBytes(asset,image),imageBytes(original,original.json.images[i]),'Preserves embedded original textures'));
assert.equal(json.accessors[primitive.attributes.TEXCOORD_0].count,weights.a.count,'UV coordinates cover the corrected mesh');
console.log(`Passed: replacement mesh, ${weights.a.count} textured vertices, ${skin.joints.length} bones, normalized skinning and six compatible clips.`);
