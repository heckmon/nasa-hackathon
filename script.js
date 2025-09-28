import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import  getStarfield  from './src/getStarfield.js';
import { earthGroup, earthMesh, cloudsMesh } from './src/earth.js';
import { sunGroup } from './src/sun.js';

const scene =  new  THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({antialias: true});
const controls = new OrbitControls(camera, renderer.domElement);
const stars = getStarfield({numStars: 1500});
const ambientLight = new THREE.AmbientLight(0x333333);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);

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

sunGroup.position.set(
    earthGroup.position.x - 50,
    earthGroup.position.y,
    earthGroup.position.z + 50,
)

scene.add(sunGroup)

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
window.addEventListener('resize', handleWindowResize, false);