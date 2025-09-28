import * as THREE from 'three';

const loader = new THREE.TextureLoader();
const venusGeometry = new THREE.SphereGeometry(4.75);
const venusMaterial = new THREE.MeshPhongMaterial({
    map: loader.load("./assets/textures/2k_venus.jpg")
});

const venusMesh = new THREE.Mesh(venusGeometry, venusMaterial);
venusMesh.rotation.z = 3 * Math.PI / 180;

export { venusMesh }