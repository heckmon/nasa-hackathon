import * as THREE from 'three';

const loader = new THREE.TextureLoader();

const mercuryGeometry = new THREE.SphereGeometry(1.92);
const mercuryMaterial = new THREE.MeshPhongMaterial({
  map: loader.load("./assets/textures/2k_mercury.jpg")
});

const mercuryMesh = new THREE.Mesh(mercuryGeometry, mercuryMaterial);

const venusGeometry = new THREE.SphereGeometry(4.75);
const venusMaterial = new THREE.MeshPhongMaterial({
    map: loader.load("./assets/textures/2k_venus.jpg")
});

const venusMesh = new THREE.Mesh(venusGeometry, venusMaterial);
venusMesh.rotation.z = 3 * Math.PI / 180;

const marsGeometry = new THREE.SphereGeometry(2.66);
const marsMaterial = new THREE.MeshPhongMaterial({
    map: loader.load("./assets/textures/2k_mars.jpg")
});

const marsMesh = new THREE.Mesh(marsGeometry, marsMaterial);
marsMesh.rotation.z = -25 * Math.PI / 180;

const jupiterGeometry = new THREE.SphereGeometry(30);
const jupiterMaterial = new THREE.MeshPhongMaterial({
    map: loader.load("./assets/textures/2k_jupiter.jpg")
});

const jupiterMesh = new THREE.Mesh(jupiterGeometry, jupiterMaterial);

const saturnGeometry = new THREE.SphereGeometry(25.2);
const saturnMaterial = new THREE.MeshPhongMaterial({
    map: loader.load("./assets/textures/2k_saturn.jpg")
});

const saturnMesh = new THREE.Mesh(saturnGeometry, saturnMaterial);

const ringInnerRadius = 28;
const ringOuterRadius = 50;
const ringGeometry = new THREE.RingGeometry(ringInnerRadius, ringOuterRadius, 64);
const ringTexture = loader.load("./assets/textures/2k_saturn_ring.png");
const ringMaterial = new THREE.MeshBasicMaterial({
    map: ringTexture,
    side: THREE.DoubleSide,
    transparent: true
});
const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
ringMesh.rotation.x = -Math.PI / 2;
saturnMesh.add(ringMesh);

const uranusGeometry = new THREE.SphereGeometry(20.05);
const uranusMaterial = new THREE.MeshPhongMaterial({
    map: loader.load("./assets/textures/2k_uranus.jpg")
});
const uranusMesh = new THREE.Mesh(uranusGeometry, uranusMaterial);

const neptuneGeometry = new THREE.SphereGeometry(19.4);
const neptuneMaterial = new THREE.MeshPhongMaterial({
    map: loader.load("./assets/textures/2k_neptune.jpg")
});
const neptuneMesh = new THREE.Mesh(neptuneGeometry, neptuneMaterial);

export { mercuryMesh, venusMesh, marsMesh, jupiterMesh, saturnMesh, uranusMesh, neptuneMesh }