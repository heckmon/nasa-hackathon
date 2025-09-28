import * as THREE from 'three';

const loader = new THREE.TextureLoader();

const mercuryGeometry = new THREE.SphereGeometry(1.92);
const mercuryMaterial = new THREE.MeshPhongMaterial({
  map: loader.load("./assets/textures/2k_mercury.jpg")
});

const mercuryMesh = new THREE.Mesh(mercuryGeometry, mercuryMaterial);

export { mercuryMesh }