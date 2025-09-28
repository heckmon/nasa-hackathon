import * as THREE from 'three';

const loader = new THREE.TextureLoader();
const marsGeometry = new THREE.SphereGeometry(2.66);
const marsMaterial = new THREE.MeshPhongMaterial({
    map: loader.load("./assets/textures/2k_mars.jpg")
});

const marsMesh = new THREE.Mesh(marsGeometry, marsMaterial);
marsMesh.rotation.z = -25 * Math.PI / 180;

export { marsMesh }