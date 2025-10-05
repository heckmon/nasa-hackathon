import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { earthGroup, earthMesh, cloudsMesh } from './src/earth.js';
import { sunMesh } from './src/sun.js';
import { mercuryMesh, venusMesh, marsMesh, jupiterMesh, saturnMesh, uranusMesh, neptuneMesh } from './src/planet.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import getStarfield from './src/getStarfield.js';

const AU = 200;

let near_items = JSON.parse(window.localStorage.getItem('near_items'));
const today = new Date().toISOString().slice(0, 10);
let asteroid_coordinates = [];
let velocity_vectors = {};
let vx = 0, vy = 0, vz = 0;

let selectedAsteroid = null;
const asteroidLabels = [];

const asteroid_tool_box = document.getElementById("asteroid-tool-box");
const asteroid_tools = document.getElementById("asteroid-tools");
const activeAnimations = new Map();
const collisionRadius = 25;
const asteroidMoveDuration = 2000;

let asteroidsLoaded = 0;
let totalAsteroidsToLoad = 0;
let loadingDiv = null;

function lerpVec3(a, b, t) {
  return new THREE.Vector3(
    a.x + (b.x - a.x) * t,
    a.y + (b.y - a.y) * t,
    a.z + (b.z - a.z) * t
  );
}

window.onload = async () => {
  createLoadingIndicator();
  updateLoadingProgress(0, 0, 'Starting asteroid data fetch...');

  try {
    if (!near_items || !near_items["near_earth_objects"] || Object.keys(near_items["near_earth_objects"])[0] !== today) {
      updateLoadingProgress(0, 0, 'Fetching fresh asteroid data from NASA...');
      const response = await fetch("https://nasa-hackathon-backend-two.vercel.app/near_items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to fetch near_items");
      near_items = await response.json();
      window.localStorage.setItem('near_items', JSON.stringify(near_items));
    }

    let near_today = (near_items["near_earth_objects"] && near_items["near_earth_objects"][today]) || [];
    asteroid_coordinates = [];
    totalAsteroidsToLoad = near_today.length;

    updateLoadingProgress(0, totalAsteroidsToLoad, `Processing ${totalAsteroidsToLoad} asteroids...`);
    for (let i = 0; i < near_today.length; i++) {
      const asteroidId = near_today[i]["id"];
      updateLoadingProgress(i, totalAsteroidsToLoad, `Fetching data for asteroid ${i+1}/${totalAsteroidsToLoad}...`);

      try {
        const cached = window.localStorage.getItem(`asteroid_coord_${asteroidId}`);
        if (cached) {
          asteroid_coordinates.push([near_today[i], JSON.parse(cached)]);
        } else {
          const response = await fetch("https://nasa-hackathon-backend-two.vercel.app/coordinate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: asteroidId })
          });
          if (!response.ok) throw new Error(`Failed to fetch coordinates for ${asteroidId}`);
          const coord = await response.json();
          window.localStorage.setItem(`asteroid_coord_${asteroidId}`, JSON.stringify(coord));
          asteroid_coordinates.push([near_today[i], coord]);
        }
      } catch (e) {
        console.error(`Asteroid ${asteroidId} coordinate fetch failed:`, e);
      }

      try {
        const response = await fetch("https://nasa-hackathon-backend-two.vercel.app/velocity_vectors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: asteroidId })
        });
        if (!response.ok) throw new Error(`Failed to fetch velocity for ${asteroidId}`);
        const velocity = await response.json();
        velocity_vectors[asteroidId] = velocity;
        vx = velocity['vx'];
        vy = velocity['vy'];
        vz = velocity['vz'];
      } catch (e) {
        console.log(`Asteroid ${asteroidId} velocity fetch failed:`, e);
      }
    }
    updateLoadingProgress(0, asteroid_coordinates.length, 'Loading 3D asteroid models...');
    asteroidsLoaded = 0;

    for (let i = 0; i < asteroid_coordinates.length; i++) {
      const asteroidData = asteroid_coordinates[i][0];
      const coord = asteroid_coordinates[i][1];
      const diameter = (asteroidData['estimated_diameter']['meters']['estimated_diameter_min'] + asteroidData['estimated_diameter']['meters']['estimated_diameter_max']) / 2;

      loader.load(
        "https://assets.science.nasa.gov/content/dam/science/psd/solar/2023/09/b/Bennu_1_1.glb?emrc=68e007a5963a2",
        (gltf) => {
          const model = gltf.scene;
          model.name = `asteroid-${asteroidData['id']}`;
          model.userData.asteroidId = asteroidData['id'];
          const scaleFactor = 0.0002 * diameter;
          const pos = new THREE.Vector3(coord['x'], coord['y'], coord['z']).multiplyScalar(1000 * 6);

          model.position.copy(pos);
          model.scale.set(scaleFactor, scaleFactor, scaleFactor);
          model.userData.originalScale = model.scale.clone();
          model.userData.originalPosition = pos.clone();
          model.userData.isCollided = false;

          scene.add(model);

          const label = document.createElement("div");
          label.className = "asteroid-label";
          label.id = `asteroid-${asteroidData['id']}`;
          label.innerHTML = `<h2>${asteroidData['name']}</h2>`;
          label.style.position = "absolute";
          label.style.color = "white";
          label.style.display = "block";
          label.addEventListener('click', () => {
            document.querySelectorAll('.label').forEach(lbl => lbl.classList.remove('selected-label'));
            label.classList.add('selected-label');

            selectedAsteroid = model;
          });
          document.body.appendChild(label);
          const asteroid_label = document.getElementById(`asteroid-${asteroidData['id']}`);

          asteroid_label.addEventListener('click', (event) => {
            if (event.target.classList && event.target.classList.contains('collide-toggle')) {
                return;
            }
            event.stopPropagation();
            controls.target.copy(model.position);
            const offset = new THREE.Vector3(0, 0, 50);
            const newCameraPos = model.position.clone().add(offset);
            camera.position.copy(newCameraPos);
            camera.lookAt(model.position);
            controls.update();
            detailsField.innerHTML = `
              <p>Diameter: ${diameter.toFixed(2)} meters</p>
              <p>Velocity: ${parseFloat(asteroidData['close_approach_data'][0]['relative_velocity']['kilometers_per_hour']).toFixed(2)} km/h</p>
              <p>Miss Distance: ${parseFloat(asteroidData['close_approach_data'][0]['miss_distance']['kilometers']).toFixed(2)} km</p>
              <p>Potentially Hazardous: ${asteroidData['is_potentially_hazardous_asteroid'] ? 'Yes' : 'No'}</p>
            `;
            controls.update();
            nameField.innerHTML = `<h2>${asteroidData['name']}</h2>`;
            detailsField.style.display = "block";
            label.style.zIndex = "10000";

            asteroid_tool_box.style.display = "block";
          });

          const toggle = label.querySelector('.collide-toggle');
          if (toggle) {
            toggle.addEventListener('change', (ev) => {
              const checked = ev.target.checked;
              if (checked) {
                scheduleCollisionForAsteroid(model);
              } else {
                cancelScheduledCollisionForAsteroid(model);
              }
            });
          }
          asteroidLabels.push({ model, label });
          
          const velocity = velocity_vectors[asteroidData.id];
          if (velocity) {
            const trajLine = createTrajectoryLineToAsteroid(model, velocity);
            asteroidLabels[asteroidLabels.length - 1].trajLine = trajLine;
            model.userData.trajectoryLine = trajLine;
          }
          asteroidsLoaded++;
          updateLoadingProgress(asteroidsLoaded, asteroid_coordinates.length, `Loading asteroid ${asteroidsLoaded}/${asteroid_coordinates.length}...`);
          if (asteroidsLoaded === asteroid_coordinates.length) {
            setTimeout(() => {
              hideLoadingIndicator();
            }, 1000);
          }
        },
        (progress) => {
          if (progress.lengthComputable) {
            const percent = (progress.loaded / progress.total) * 100;
          }
        },
        (error) => {
          console.error('Error loading asteroid model:', error);
          asteroidsLoaded++;
          updateLoadingProgress(asteroidsLoaded, asteroid_coordinates.length, `Error loading asteroid ${asteroidsLoaded}/${asteroid_coordinates.length}`);
          
          if (asteroidsLoaded === asteroid_coordinates.length) {
            hideLoadingIndicator();
          }
        }
      );
    }
    if (asteroid_coordinates.length === 0) {
      hideLoadingIndicator();
    }

  } catch (e) {
    console.error("API error, simulation will continue with available data:", e);
    updateLoadingProgress(0, 0, 'Error loading asteroid data. Using cached data...');
    setTimeout(hideLoadingIndicator, 2000);
  }
};


const loader = new GLTFLoader();
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
const tools = document.getElementById("tools");
const toolMenu = document.querySelector('.tool-menu');
const revolutionToggle = document.getElementById('planet-revolution-toggle');
const earthCollideToggle = document.getElementById('earth-collide-toggle');

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

camera.position.z = 50;
camera.lookAt(earthGroup.position);

function animate() {
  asteroidLabels.forEach(({ model, label }) => {
    const vector = model.position.clone().project(camera);
    const screenX = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const screenY = (-vector.y * 0.5 + 0.5) * window.innerHeight;

    if (vector.z < 1) {
      label.style.left = `${screenX}px`;
      label.style.top = `${screenY}px`;
      label.style.display = 'block';
    } else {
      label.style.display = 'none';
    }
  });
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
  updateTrajectoryLines();
  bloomComposer.render();
}

window.googleTranslateElementInit = function () {
  new google.translate.TranslateElement(
    {
      pageLanguage: 'en',
      includedLanguages: 'en,hi,es,fr,de,zh,ar,ru,ml',
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
  if (event.target.classList.contains('asteroid-label')) return;
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
    if (obj === earthMesh) {
      controls.target.copy(earthMesh.position);
      camera.position.set(earthMesh.position.x + 50, earthMesh.position.y + 50, earthMesh.position.z + 50);
    }
  }
}

let isDown = false;

window.addEventListener('resize', handleWindowResize, false);
window.addEventListener('click', onPointerClick);
window.addEventListener('pointerdown', () => isDown = true);
window.addEventListener('pointerup', () => isDown = false)
window.addEventListener('pointermove', () => {
  if (isDown) {
    nameField.style.display = "none";
    asteroid_tool_box.style.display = "none";
    asteroid_tools.style.display = "none";
  }
});

asteroid_tool_box.addEventListener('click', ()=> {
  asteroid_tools.style.display = "block";
});

tools.addEventListener('click', () => {
  toolMenu.style.display = "block";
  document.getElementById('google_translate_element').style.display = "block";
});

revolutionToggle.addEventListener('change', (e) => {
  isRevolve = e.target.checked;
});

const resetBtn = document.getElementById('reset-asteroid-btn');
resetBtn.addEventListener('click', () => {
  if (!selectedAsteroid) return;

  const model = selectedAsteroid;
  if (model.userData.originalPosition) {
    model.position.copy(model.userData.originalPosition);
  }
  if (model.userData.originalScale) {
    model.scale.copy(model.userData.originalScale);
  } else {
    model.scale.set( model.scale.x / 3, model.scale.y / 3, model.scale.z / 3 );
  }
  model.visible = true;
  model.userData.isCollided = false;
  const lbl = document.getElementById(`asteroid-${model.userData.asteroidId}`);
  if (lbl) lbl.style.display = 'block';
  if (model.userData.trajectoryLine) model.userData.trajectoryLine.visible = true;
  resetBtn.style.display = 'none';
  const collToggle = document.getElementById('earth-collide-toggle') || document.getElementById('eath-collide-toggle');
  if (collToggle) collToggle.checked = false;
  activeAnimations.delete(model.userData.asteroidId);
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

function updateTrajectoryLines() {
  asteroidLabels.forEach(({ model, trajLine }) => {
    if (!trajLine) return;
    const velocity = velocity_vectors[model.name];
    if (!velocity) return;

    const scaleFactor = AU;
    const vx = velocity.vx * scaleFactor;
    const vy = velocity.vy * scaleFactor;
    const vz = velocity.vz * scaleFactor;

    const direction = new THREE.Vector3(vx, vy, vz).normalize();
    const lineLength = Math.max(camera.far * 10, 1e6);

    const startPoint = model.position.clone().add(direction.clone().multiplyScalar(-lineLength));
    const endPoint = model.position.clone();

    trajLine.geometry.setFromPoints([startPoint, endPoint]);
    trajLine.geometry.computeBoundingSphere();
    trajLine.computeLineDistances();
  });
}

function createTrajectoryLineToAsteroid(asteroidModel, velocity) {
  if (!velocity) return null;

  const scaleFactor = AU;
  const vx = velocity.vx * scaleFactor;
  const vy = velocity.vy * scaleFactor;
  const vz = velocity.vz * scaleFactor;

  const direction = new THREE.Vector3(vx, vy, vz).normalize();
  const lineLength = 50000;
  const startPoint = asteroidModel.position.clone().add(direction.clone().multiplyScalar(-lineLength));
  const endPoint = asteroidModel.position.clone();
  const points = [startPoint, endPoint];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
  });

  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();

  scene.add(line);
  return line;
}

function createCollisionPop(position) {
  const geometry = new THREE.SphereGeometry(10, 16, 16);
  const material = new THREE.MeshBasicMaterial({ 
    color: 0xff4444, 
    transparent: true, 
    opacity: 0.7 
  });
  const explosion = new THREE.Mesh(geometry, material);
  explosion.position.copy(position);
  scene.add(explosion);

  const startTime = performance.now();
  const duration = 500;
  
  function animateExplosion(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const scale = 1 + progress * 3;
    const opacity = 0.7 * (1 - progress);
    
    explosion.scale.set(scale, scale, scale);
    explosion.material.opacity = opacity;
    
    if (progress < 1) {
      requestAnimationFrame(animateExplosion);
    } else {
      scene.remove(explosion);
    }
  }
  
  requestAnimationFrame(animateExplosion);
}

function animateMoveToEarth(model, duration, onComplete, cancelSignal) {
  const startPos = model.position.clone();
  const endPos = earthMesh.position.clone();
  const startTime = performance.now();

  function step(now) {
    if (cancelSignal.cancelled) return;
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const newPos = lerpVec3(startPos, endPos, eased);
    model.position.copy(newPos);

    const dist = model.position.distanceTo(earthMesh.position);
    
    if (dist <= collisionRadius) {
      onAsteroidCollision(model);
      if (onComplete) onComplete(model);
      return;
    }

    if (t < 1) {
      const rafId = requestAnimationFrame(step);
      activeAnimations.set(model.userData.asteroidId, { rafId, cancel: cancelSignal });
    } else {
      if (onComplete) onComplete(model);
    }
  }
  const rafId = requestAnimationFrame(step);
  activeAnimations.set(model.userData.asteroidId, { rafId, cancel: cancelSignal });
}

function scheduleCollisionForAsteroid(model) {
  if (model.userData.trajectoryLine) {
    model.userData.trajectoryLine.visible = false;
  }

  const asteroidId = model.userData.asteroidId;

  if (
    activeAnimations.has(asteroidId) &&
    activeAnimations.get(asteroidId).cancel &&
    !activeAnimations.get(asteroidId).cancel.cancelled
  ) {
    return;
  }

  const cancelSignal = { cancelled: false };

  const delayId = setTimeout(() => {
    animateMoveToEarth(model, asteroidMoveDuration, () => {
    }, cancelSignal);
  }, 1000);

  activeAnimations.set(asteroidId, { delayId, cancel: cancelSignal });
}

function onAsteroidCollision(model) {
  model.userData.isCollided = true;
  createCollisionPop(model.position);
  
  const startScale = model.scale.clone();
  const targetScale = startScale.clone().multiplyScalar(3);
  const popDuration = 400;
  const start = performance.now();

  function popStep(now) {
    const t = Math.min((now - start) / popDuration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    model.scale.lerpVectors(startScale, targetScale, ease);
    if (t < 1) {
      requestAnimationFrame(popStep);
    } else {
      model.visible = false;
      const lbl = document.getElementById(`asteroid-${model.userData.asteroidId}`);
      if (lbl) lbl.style.display = 'none';
      if (model.userData.trajectoryLine) model.userData.trajectoryLine.visible = false;
      
      const resetBtn = document.getElementById('reset-asteroid-btn');
      if (resetBtn) {
        resetBtn.style.display = 'block';
      } else {
        console.error("Reset button element not found!");
      }
    }
  }

  requestAnimationFrame(popStep);

  setTimeout(() => {
    const asteroidId = model.userData.asteroidId;
    const coordStr = window.localStorage.getItem(`asteroid_coord_${asteroidId}`);
    
    if (coordStr) {
      const coord = JSON.parse(coordStr);

      if (coord['lat'] !== undefined && coord['lon'] !== undefined) {
        showLeafletMap(coord['lat'], coord['lon'], asteroidId);
      } else {
        console.error("Coordinates missing lat/lon properties:", coord);
      }
    } else {
      console.error("No coordinates found in localStorage for asteroid:", asteroidId);
    }
  }, 800)
  
  earthCollideToggle.checked = false;
}

function showLeafletMap(lat, lon, asteroidId) {
  const existingMap = document.getElementById('collision-map-container');
  if (existingMap) {
    document.body.removeChild(existingMap);
  }

  const mapContainer = document.createElement('div');
  mapContainer.id = 'collision-map-container';
  mapContainer.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80vw;
    height: 80vh;
    background: white;
    border: 2px solid #ff4444;
    border-radius: 10px;
    z-index: 10000;
    box-shadow: 0 0 20px rgba(255, 0, 0, 0.5);
  `;

  const closeButton = document.createElement('button');
  closeButton.innerHTML = '×';
  closeButton.style.cssText = `
    position: absolute;
    top: -15px;
    right: -50px;
    background: #ff4444;
    color: white;
    border: none;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    font-size: 20px;
    cursor: pointer;
    z-index: 10001;
  `;
  closeButton.onclick = () => {
    document.body.removeChild(mapContainer);
  };

  const iframe = document.createElement('iframe');
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
    border-radius: 8px;
  `;

  const mapHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Asteroid Collision Map</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
            body { 
                margin: 0; 
                padding: 0; 
                font-family: Arial, sans-serif;
                background: #1a1a1a;
            }
            #map { 
                height: 100vh; 
                width: 100vw; 
                background: #1a1a1a;
            }
            .leaflet-popup-content h3 {
                margin: 0 0 10px 0;
                color: #ff4444;
                font-size: 16px;
            }
            .leaflet-popup-content {
                font-size: 14px;
                line-height: 1.4;
            }
            .impact-marker {
                background: rgba(255, 68, 68, 0.8);
                border: 3px solid #ff0000;
                border-radius: 50%;
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7); }
                70% { box-shadow: 0 0 0 15px rgba(255, 0, 0, 0); }
                100% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0); }
            }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
            const map = L.map('map', {
                zoomControl: true,
                attributionControl: true
            }).setView([${lat}, ${lon}], 3); // Start at zoom level 3 for broader view

            const colorfulTiles = [
                L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                    attribution: 'Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap',
                    maxZoom: 17
                }),
                L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                    attribution: '© OpenStreetMap contributors, © CARTO',
                    maxZoom: 20
                }),
                L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                    attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
                    maxZoom: 18
                }),
                L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                    attribution: 'Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap',
                    maxZoom: 17
                })
            ];

            colorfulTiles[0].addTo(map);

            const impactIcon = L.divIcon({
                className: 'impact-marker',
                html: '<div style="width: 20px; height: 20px; background: radial-gradient(circle, #ff4444 30%, #ff0000 70%); border: 2px solid #fff; border-radius: 50%;"></div>',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });

            const marker = L.marker([${lat}, ${lon}], { 
                icon: impactIcon,
                title: 'Asteroid Impact Point'
            }).addTo(map)
                .bindPopup(
                    '<div style="text-align: center;">' +
                    '<h3>💥 ASTEROID IMPACT DETECTED!</h3>' +
                    '<hr style="margin: 8px 0;">' +
                    '<b>🆔 Asteroid ID:</b> ${asteroidId}<br>' +
                    '<b>📍 Latitude:</b> ${lat.toFixed(4)}°<br>' +
                    '<b>📍 Longitude:</b> ${lon.toFixed(4)}°<br>' +
                    '<b>🕐 Detection Time:</b> ${new Date().toLocaleString()}<br>' +
                    '<b>⚠️ Status:</b> <span style="color: #ff4444; font-weight: bold;">IMPACT CONFIRMED</span>' +
                    '</div>'
                )
                .openPopup();

            const impactZones = [
                { radius: 100000, color: '#ff0000', fillOpacity: 0.2, message: '100km Severe Impact Zone' },
                { radius: 50000, color: '#ff4444', fillOpacity: 0.3, message: '50km Critical Impact Zone' },
                { radius: 25000, color: '#ff6666', fillOpacity: 0.4, message: '25km Epicenter Zone' }
            ];

            impactZones.forEach(zone => {
                L.circle([${lat}, ${lon}], {
                    color: zone.color,
                    fillColor: zone.color,
                    fillOpacity: zone.fillOpacity,
                    radius: zone.radius,
                    weight: 2
                }).addTo(map)
                .bindPopup('<b>' + zone.message + '</b><br>Evacuation recommended');
            });

            L.control.scale({ imperial: false }).addTo(map);

            const bounds = L.latLngBounds([
                [${lat} - 2, ${lon} - 2], // Southwest corner
                [${lat} + 2, ${lon} + 2]  // Northeast corner
            ]);
            
            map.fitBounds(bounds, { padding: [20, 20] });

            const baseMaps = {
                "Colorful Topo": colorfulTiles[0],
                "Dark Theme": colorfulTiles[1],
                "Satellite": colorfulTiles[2],
                "Terrain": colorfulTiles[3]
            };

            L.control.layers(baseMaps).addTo(map);

            
            map.on('zoomend', function() {
            });

            function validateView() {
                const currentZoom = map.getZoom();
                const currentCenter = map.getCenter();
                
                // If we're too zoomed in on open ocean, zoom out a bit
                if (currentZoom > 8) {
                    const oceanThreshold = 6; // Adjust based on your needs
                    map.setZoom(Math.min(currentZoom, oceanThreshold));
                }
            }

            setTimeout(validateView, 1000);

        </script>
    </body>
    </html>`;

  iframe.srcdoc = mapHTML;
  mapContainer.appendChild(closeButton);
  mapContainer.appendChild(iframe);
  document.body.appendChild(mapContainer);
}

function cancelScheduledCollisionForAsteroid(model) {
  const asteroidId = model.userData.asteroidId;
  const record = activeAnimations.get(asteroidId);
  if (!record) return;
  if (record.delayId) clearTimeout(record.delayId);
  if (record.cancel) record.cancel.cancelled = true;
  if (record.rafId) cancelAnimationFrame(record.rafId);
  activeAnimations.delete(asteroidId);
}

earthCollideToggle.addEventListener('change', (e) => {
  if (!selectedAsteroid) {
    alert("Select an asteroid first!");
    e.target.checked = false;
    return;
  }

  const checked = e.target.checked;
  if (checked) {
    scheduleCollisionForAsteroid(selectedAsteroid);
  } else {
    cancelScheduledCollisionForAsteroid(selectedAsteroid);
  }
});

function createLoadingIndicator() {
  loadingDiv = document.createElement('div');
  loadingDiv.id = 'asteroid-loading';
  loadingDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 30px 40px;
    border-radius: 15px;
    border: 2px solid #3399ff;
    z-index: 10000;
    font-family: Arial, sans-serif;
    text-align: center;
    min-width: 300px;
    box-shadow: 0 0 30px rgba(51, 153, 255, 0.5);
    backdrop-filter: blur(10px);
  `;

  loadingDiv.innerHTML = `
    <div style="margin-bottom: 20px;">
      <div style="font-size: 24px; margin-bottom: 10px; color: #3399ff;">🚀</div>
      <h3 style="margin: 0 0 10px 0; color: #fff; font-size: 18px;">Loading Asteroids</h3>
      <p style="margin: 0; color: #ccc; font-size: 14px;">Fetching near-Earth objects data...</p>
    </div>
    <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
      <div class="loading-spinner" style="
        width: 40px;
        height: 40px;
        border: 4px solid #333;
        border-top: 4px solid #3399ff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-right: 15px;
      "></div>
      <div class="loading-text" style="font-size: 14px; color: #fff;">Initializing...</div>
    </div>
    <div class="progress-container" style="
      background: #333;
      border-radius: 10px;
      height: 6px;
      overflow: hidden;
      margin-top: 10px;
    ">
      <div class="progress-bar" style="
        background: linear-gradient(90deg, #3399ff, #33ccff);
        height: 100%;
        width: 0%;
        transition: width 0.3s ease;
        border-radius: 10px;
      "></div>
    </div>
    <div class="progress-text" style="
      font-size: 12px;
      color: #ccc;
      margin-top: 8px;
    ">0%</div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(loadingDiv);
}

function updateLoadingProgress(loaded, total, message = 'Loading asteroids...') {
  if (!loadingDiv) return;

  const progressBar = loadingDiv.querySelector('.progress-bar');
  const progressText = loadingDiv.querySelector('.progress-text');
  const loadingText = loadingDiv.querySelector('.loading-text');

  if (loadingText) {
    loadingText.textContent = message;
  }

  if (progressBar && progressText) {
    const percentage = total > 0 ? Math.round((loaded / total) * 100) : 0;
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${percentage}% (${loaded}/${total})`;
  }
}

function hideLoadingIndicator() {
  if (loadingDiv) {
    loadingDiv.style.opacity = '0';
    loadingDiv.style.transition = 'opacity 0.5s ease';
    
    setTimeout(() => {
      if (loadingDiv && loadingDiv.parentNode) {
        loadingDiv.parentNode.removeChild(loadingDiv);
        loadingDiv = null;
      }
    }, 500);
  }
}