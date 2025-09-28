import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { earthGroup, earthMesh, cloudsMesh } from './src/earth.js';
import { sunMesh } from './src/sun.js';
import  getStarfield  from './src/getStarfield.js';

const scene =  new  THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({antialias: true});
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const controls = new OrbitControls(camera, renderer.domElement);
const stars = getStarfield({numStars: 1500});
const ambientLight = new THREE.AmbientLight(0x333333);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
const detailsField = document.getElementById("show-details");
const meshMap = new Map();

meshMap.set(earthMesh, "<h2>Earth</h2> <p> Distance from sun: 149,597,870 km</p>");
meshMap.set(sunMesh, "<h2>Sun</h2>");

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

sunMesh.position.set(
    earthGroup.position.x - 100,
    earthGroup.position.y,
    earthGroup.position.z + 50,
)

scene.add(sunMesh)

camera.position.z = 50;

function animate() {
  earthMesh.rotation.y += 0.005;
  cloudsMesh.rotation.y += 0.005;
  stars.rotation.y -= 0.0005;
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
    detailsField.style.display = "none";
    return;
  };
  for ( let i = 0; i < intersects.length; i ++ ) {
    detailsField.style.left = `${event.clientX}px`;
    detailsField.style.top = `${event.clientY}px`;
    detailsField.style.display = "block";
    const obj = intersects[ i ].object;
    detailsField.innerHTML = meshMap.get(obj) == undefined ? `` : meshMap.get(obj);
	}
}

let isDown = false;

window.addEventListener('resize', handleWindowResize, false);
window.addEventListener('click', onPointerClick);
window.addEventListener('pointerdown', () => isDown = true);
window.addEventListener('pointerup', () => isDown = false)
window.addEventListener('pointermove', () => {
  if(isDown) detailsField.style.display = "none";
});