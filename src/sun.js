import * as THREE from 'three';

const sunGroup = new THREE.Group();

const color = new THREE.Color("#FDB813");
const geometry = new THREE.SphereGeometry(25);
const material = new THREE.MeshBasicMaterial({ color: color });
const sphere = new THREE.Mesh(geometry, material);
sphere.position.set(0, 0, 0);
sunGroup.add(sphere);

export { sunGroup }