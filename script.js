import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { earthGroup, earthMesh, cloudsMesh } from './src/earth.js';
import { sunMesh } from './src/sun.js';
import { mercuryMesh, venusMesh, marsMesh, jupiterMesh, saturnMesh, uranusMesh, neptuneMesh } from './src/planet.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import getStarfield from './src/getStarfield.js';

let near_items = JSON.parse(window.localStorage.getItem('near_items'));
const today = new Date().toISOString().slice(0, 10);
let asteroid_coordinates = [];

window.onload = async () => {
  try {
    if (!near_items || Object.keys(near_items["near_earth_objects"])[0] !== today) {
      const response = await fetch("https://nasa-hackathon-backend-two.vercel.app/near_items", { method: "POST" });
      near_items = await response.json();
      window.localStorage.setItem('near_items', JSON.stringify(near_items))
    }
  }
  catch (e) {

  }
};

let near_today;
try{
  near_items["near_earth_objects"][today];
}
catch(e) {
  near_items = {}
}

for (let i = 0; i < near_today.length; i++) {
  const asteroidId = near_today[i]["id"];
  const cached = window.localStorage.getItem(`asteroid_coord_${asteroidId}`);
  if (cached) {
    asteroid_coordinates.push([near_today[i], JSON.parse(cached)]);
  } else {
    fetch(
      "https://nasa-hackathon-backend-two.vercel.app/coordinate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: asteroidId })
      }
    )
      .then(response => response.json())
      .then(coord => {
        window.localStorage.setItem(`asteroid_coord_${asteroidId}`, JSON.stringify(coord));
        asteroid_coordinates.push([near_today[i], coord]);
      });
  }
}

const loader = new GLTFLoader();
const fontLoader = new FontLoader();
const scene = new THREE.Scene();
const asteroidBelt = new THREE.Group();
scene.add(asteroidBelt);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 3000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const controls = new OrbitControls(camera, renderer.domElement);
const stars = getStarfield({ numStars: 2500 });
const ambientLight = new THREE.AmbientLight(0x888888);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);

const nameField = document.getElementById("show-name");
const detailsField = document.getElementById("show-details");
const hamBars = document.getElementById("bars");
const sideBar = document.getElementById("sidebar");
const tools = document.getElementById("tools");
const toolMenu = document.querySelector('.tool-menu');
const revolutionToggle = document.getElementById('planet-revolution-toggle');

let isRevolve = false

const planetOrbits = [
  { mesh: mercuryMesh, radius: 300, speed: 0.008, angle: 0 },
  { mesh: venusMesh, radius: 500, speed: 0.003, angle: 0 },
  { mesh: marsMesh, radius: 800, speed: 0.0015, angle: 0 },
  { mesh: jupiterMesh, radius: 1200, speed: 0.0005, angle: 0 },
  { mesh: saturnMesh, radius: 1550, speed: 0.0002, angle: 0 },
  { mesh: uranusMesh, radius: 1950, speed: 0.00008, angle: 0 },
  { mesh: neptuneMesh, radius: 2350, speed: 0.00003, angle: 0 }
];

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

earthGroup.position.set(0, 0, 0);
sunMesh.position.set(-600, 0, 0);
mercuryMesh.position.set(-300, 0, 0);
venusMesh.position.set(-100, 0, 0);
marsMesh.position.set(200, 0, 0);
jupiterMesh.position.set(600, 0, 0);
saturnMesh.position.set(950, 0, 0);
uranusMesh.position.set(1350, 0, 0);
neptuneMesh.position.set(1750, 0, 0);

scene.add(mercuryMesh);
scene.add(venusMesh);
scene.add(marsMesh);
scene.add(jupiterMesh);
scene.add(saturnMesh);
scene.add(uranusMesh);
scene.add(neptuneMesh);
scene.add(sunMesh);

for(let i=0; i<asteroid_coordinates.length; i++){
  loader.load(
    "https://assets.science.nasa.gov/content/dam/science/psd/solar/2023/09/b/Bennu_1_1.glb?emrc=68e007a5963a2", (gltf) => {
    const model = gltf.scene;
    model.position.set(
      asteroid_coordinates[i][1]['x'] * 1000 * 2,
      asteroid_coordinates[i][1]['y'] * 1000 * 2,
      asteroid_coordinates[i][1]['z'] * 1000 * 2
    );
    model.scale.set(0.005, 0.005, 0.005);
    scene.add(model);
  });
}

camera.position.z = 50;
camera.lookAt(earthGroup.position);

function animate() {
  asteroidBelt.rotation.y += 0.0005;
  if (isRevolve) {
    planetOrbits.forEach(planet => {
      if (planet.radius > 0) {
        planet.angle += planet.speed;
        planet.mesh.position.x = Math.cos(planet.angle) * planet.radius + sunMesh.position.x;
        planet.mesh.position.z = Math.sin(planet.angle) * planet.radius;
      }
    });

  }

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
  controls.update();
  bloomComposer.render();
}

window.googleTranslateElementInit = function () {
  new google.translate.TranslateElement(
    {
      pageLanguage: 'en',
      includedLanguages: 'en,hi,es,fr,de,zh,ar,ru',
      layout: google.translate.TranslateElement.InlineLayout.SIMPLE
    },
    'google_translate_element'
  );
};

const translateScript = document.createElement('script');
translateScript.type = 'text/javascript';
translateScript.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
document.head.appendChild(translateScript);


renderer.setAnimationLoop(animate);

function handleWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
}

function onPointerClick(event) {

  if (!toolMenu.contains(event.target) && event.target !== tools) {
    toolMenu.style.display = "none";
  }

  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(scene.children);
  if (intersects.length == 0) {
    nameField.style.display = "none";
    detailsField.style.display = "none";
    return;
  };
  for (let i = 0; i < intersects.length; i++) {
    nameField.style.display = "block";
    detailsField.style.display = "block";
    const obj = intersects[i].object;
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
  if (isDown) nameField.style.display = "none";
});

tools.addEventListener('click', () => {
  toolMenu.style.display = "block";
  document.getElementById('google_translate_element').style.display = "block";
});

revolutionToggle.addEventListener('change', (e) => {
  isRevolve = e.target.checked;
});

earthMesh.name = "earth";
sunMesh.name = "sun";
mercuryMesh.name = "mercury";
venusMesh.name = "venus";
marsMesh.name = "mars";
jupiterMesh.name = "jupiter";
saturnMesh.name = "saturn";
uranusMesh.name = "uranus";
neptuneMesh.name = "neptune";

const colorPalette = {
  sun: 0xffee88,
  earth: 0x3399ff,
  mercury: 0xaaaaaa,
  venus: 0xff99cc,
  mars: 0xff66cc,
  jupiter: 0xffcc66,
  saturn: 0xffeecc,
  uranus: 0x66ccff,
  neptune: 0x6699ff,
  asteroid: 0xbbbbbb
};

const originalMaterials = new Map();
const paletteMaterials = new Map();

[earthMesh, sunMesh, mercuryMesh, venusMesh, marsMesh, jupiterMesh, saturnMesh, uranusMesh, neptuneMesh].forEach(mesh => {
  originalMaterials.set(mesh, mesh.material);
  const mat = mesh.material.clone();
  mat.color.set(colorPalette[mesh.name.toLowerCase()] || 0xffffff);
  paletteMaterials.set(mesh, mat);
});

function applyColorPaletteMode(enable) {
  originalMaterials.forEach((mat, mesh) => {
    mesh.material = enable ? paletteMaterials.get(mesh) : mat;
  });

  asteroidBelt.children.forEach(ast => {
    if (ast.material) {
      ast.material.color.set(enable ? colorPalette.asteroid : 0x888888);
    }
  });
}

const colorPaletteToggle = document.getElementById('color-blind-toggle');
colorPaletteToggle.addEventListener('change', (e) => {
  applyColorPaletteMode(e.target.checked);
});