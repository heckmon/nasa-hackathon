import * as THREE from 'three';

const color = new THREE.Color("#FDB813");
const geometry = new THREE.SphereGeometry(200);
const material = new THREE.MeshBasicMaterial({ color: color });
const sunMesh = new THREE.Mesh(geometry, material);
sunMesh.position.set(0, 0, 0);

export { sunMesh }