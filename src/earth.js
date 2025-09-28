import * as THREE from 'three';

const loader = new THREE.TextureLoader();
const earthGroup = new THREE.Group();
earthGroup.rotation.z = -23.4 * Math.PI / 180;

const earthGeometry = new THREE.SphereGeometry(5);
const earthMaterial = new THREE.MeshPhongMaterial({
  map: loader.load("./assets/textures/earth-min.png")
});

const cloudsMesh = new THREE.Mesh(
    earthGeometry,
    new THREE.MeshStandardMaterial({
        map: loader.load("./assets/textures/8k_earth_clouds-min.jpg"),
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        alphaMap: loader.load("./assets/textures/8k_earth_clouds-min.jpg"),
    })
);

cloudsMesh.scale.setScalar(1.005);

const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);

earthGroup.add(earthMesh);
earthGroup.add(cloudsMesh);

export { earthGroup, earthMesh, cloudsMesh }