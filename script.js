import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { earthGroup, earthMesh, cloudsMesh } from './src/earth.js';
import { sunMesh } from './src/sun.js';
import { mercuryMesh, venusMesh, marsMesh, jupiterMesh, saturnMesh, uranusMesh, neptuneMesh } from './src/planet.js';
import  getStarfield  from './src/getStarfield.js';

const scene =  new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 3000);
const renderer = new THREE.WebGLRenderer({antialias: true});
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const controls = new OrbitControls(camera, renderer.domElement);
const stars = getStarfield({numStars: 2500});
const ambientLight = new THREE.AmbientLight(0x333333);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);

const nameField = document.getElementById("show-name");
const detailsField = document.getElementById("show-details");
const hamBars = document.getElementById("bars");
const sideBar = document.getElementById("sidebar");

/* const mercuryOrbit = 58;
const venusOrbit = 108;
const earthOrbit = 150;
const marsOrbit = 228;

let mercuryAngle = 0;
let venusAngle = 0;
let earthAngle = 0;
let marsAngle = 0; */

const meshMap = new Map();

meshMap.set(
  earthMesh, [
    "<h2>Earth</h2>",
    "<p>Distance from Sun: 150 million km</p><p>Radius: 6,371 km</p><p>The only planet known to support life.</p>"
  ]);
meshMap.set(
  sunMesh, [
    "<h2>Sun</h2>",
    "<p>Type: G-type main-sequence star</p><p>Radius: 696,340 km</p><p>Contains 99.86% of the Solar System's mass.</p>"
  ]);
meshMap.set(
  mercuryMesh, [
    "<h2>Mercury</h2>",
    "<p>Distance from Sun: 58 million km</p><p>Radius: 2,440 km</p><p>Mercury has no atmosphere and extreme temperature swings.</p>"
  ]);
meshMap.set(
  venusMesh, [
    "<h2>Venus</h2>",
    "<p>Distance from Sun: 108 million km</p><p>Radius: 6,052 km</p><p>Venus spins in the opposite direction to most planets.</p>"
  ]);
meshMap.set(
  marsMesh, [
    "<h2>Mars</h2>",
    "<p>Distance from Sun: 228 million km</p><p>Radius: 3,390 km</p><p>Mars is home to the tallest volcano in the solar system, Olympus Mons.</p>"
  ]);
meshMap.set(
  jupiterMesh, [
    "<h2>Jupiter</h2>",
    "<p>Distance from Sun: 778 million km</p><p>Radius: 69,911 km</p><p>Jupiter has a giant storm called the Great Red Spot.</p>"
  ]);
meshMap.set(
  saturnMesh, [
    "<h2>Saturn</h2>",
    "<p>Distance from Sun: 1,429 million km</p><p>Radius: 58,232 km</p><p>Saturn's rings are made mostly of ice particles.</p>"
  ]);
meshMap.set(
  uranusMesh, [
    "<h2>Uranus</h2>",
    "<p>Distance from Sun: 2,871 million km</p><p>Radius: 25,362 km</p><p>Uranus rotates on its side, making its seasons extreme.</p>"
  ]);
meshMap.set(
  neptuneMesh, [
    "<h2>Neptune</h2>",
    "<p>Distance from Sun: 4,498 million km</p><p>Radius: 24,622 km</p><p>Neptune has the strongest winds in the solar system.</p>"
  ]);

export { meshMap };


renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

directionalLight.position.set(-2, 0.5, 1.5);

scene.add(stars)
scene.add(ambientLight);
scene.add(directionalLight);
scene.add(earthGroup)

const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5,
  0.4,
  0.85
);
bloomPass.threshold = 0;
bloomPass.strength = 2;
bloomPass.radius = 0;
const bloomComposer = new EffectComposer(renderer);
bloomComposer.setSize(window.innerWidth, window.innerHeight);
bloomComposer.renderToScreen = true;
bloomComposer.addPass(renderScene);
bloomComposer.addPass(bloomPass);

sunMesh.position.set(-600, 0, 0);
earthGroup.position.set(0, 0, 0);
mercuryMesh.position.set(-143, 0, 0);
venusMesh.position.set(-52, 0, 0);
marsMesh.position.set(128, 0, 0);
jupiterMesh.position.set(328, 0, 0);
saturnMesh.position.set(628, 0, 0);
uranusMesh.position.set(1513, 0, 0);
neptuneMesh.position.set(2417, 0, 0);

scene.add(mercuryMesh);
scene.add(venusMesh);
scene.add(marsMesh);
scene.add(jupiterMesh);
scene.add(saturnMesh);
scene.add(uranusMesh);
scene.add(neptuneMesh);
scene.add(sunMesh);

camera.position.z = 50;
camera.lookAt(earthGroup.position);

function animate() {
  /* mercuryAngle += 0.04;
  venusAngle += 0.015;
  earthAngle += 0.01;
  marsAngle += 0.008;

  mercuryMesh.position.x = sunMesh.position.x + Math.cos(mercuryAngle) * mercuryOrbit;
  mercuryMesh.position.z = sunMesh.position.z + Math.sin(mercuryAngle) * mercuryOrbit;
  
  venusMesh.position.x = sunMesh.position.x + Math.cos(venusAngle) * venusOrbit;
  venusMesh.position.z = sunMesh.position.z + Math.sin(venusAngle) * venusOrbit;

  earthGroup.position.x = sunMesh.position.x + Math.cos(earthAngle) * earthOrbit;
  earthGroup.position.z = sunMesh.position.z + Math.sin(earthAngle) * earthOrbit;

  marsMesh.position.x = sunMesh.position.x + Math.cos(marsAngle) * marsOrbit;
  marsMesh.position.z = sunMesh.position.z + Math.sin(marsAngle) * marsOrbit; */

  earthMesh.rotation.y += 0.005;
  cloudsMesh.rotation.y += 0.005;
  mercuryMesh.rotation.y += 0.005;
  venusMesh.rotation.y += 0.005;
  marsMesh.rotation.y += 0.005;
  jupiterMesh.rotation.y += 0.005;
  saturnMesh.rotation.y += 0.005;
  uranusMesh.rotation.y += 0.005;
  neptuneMesh.rotation.y += 0.005;
  stars.rotation.y -= 0.0005;
  /* if (!isDown) {
    camera.position.x = earthGroup.position.x + 0;
    camera.position.y = earthGroup.position.y + 20;
    camera.position.z = earthGroup.position.z + 50;
    camera.lookAt(earthGroup.position);
    controls.target.copy(earthGroup.position);
  } */
  controls.update();
  bloomComposer.render();
}
renderer.setAnimationLoop(animate);

function handleWindowResize () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
}

function onPointerClick(event){
  pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects( scene.children );
  if(intersects.length == 0) {
    nameField.style.display = "none";
    detailsField.style.display = "none";
    return;
  };
  for ( let i = 0; i < intersects.length; i ++ ) {
    nameField.style.display = "block";
    detailsField.style.display = "block";
    const obj = intersects[ i ].object;
    nameField.innerHTML = meshMap.get(obj) == undefined ? `` : meshMap.get(obj)[0];
    detailsField.innerHTML = meshMap.get(obj) == undefined ? `` : meshMap.get(obj)[1];
    nameField.style.left = `${event.clientX}px`;
    nameField.style.top = `${event.clientY}px`;
	}
}

let isDown = false;

window.addEventListener('resize', handleWindowResize, false);
window.addEventListener('click', onPointerClick);
window.addEventListener('pointerdown', () => isDown = true);
window.addEventListener('pointerup', () => isDown = false)
window.addEventListener('pointermove', () => {
  if(isDown) nameField.style.display = "none";
});

hamBars.addEventListener('click', ()=>{
  sideBar.classList.toggle('open');
  hamBars.classList.toggle('open');
  if(hamBars.classList.contains('open')){
    hamBars.classList.remove('fa-bars');
    hamBars.classList.add('fa-close');
    sideBar.innerHTML = document.querySelector(".navbar nav").innerHTML;
  }
  else {
    hamBars.classList.remove('fa-close');
    hamBars.classList.add('fa-bars');
  }
});