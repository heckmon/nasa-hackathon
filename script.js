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

function lerpVec3(a, b, t) {
  return new THREE.Vector3(
    a.x + (b.x - a.x) * t,
    a.y + (b.y - a.y) * t,
    a.z + (b.z - a.z) * t
  );
}

window.onload = async () => {
  try {
    if (!near_items || !near_items["near_earth_objects"] || Object.keys(near_items["near_earth_objects"])[0] !== today) {
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

    for (let i = 0; i < near_today.length; i++) {
      const asteroidId = near_today[i]["id"];
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
            console.log("Selected asteroid:", asteroidData['name']);
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
        }
      );
    }

  } catch (e) {
    console.error("API error, simulation will continue with available data:", e);
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
    animateMoveToEarth(model, asteroidMoveDuration, (collidedModel) => {
      console.log("Animation completed for asteroid:", collidedModel.userData.asteroidId);
    }, cancelSignal);
  }, 1000);

  activeAnimations.set(asteroidId, { delayId, cancel: cancelSignal });
}

function onAsteroidCollision(model) {
  console.log("Collision detected for asteroid:", model.userData.asteroidId);
  model.userData.isCollided = true;
  createCollisionPop(model.position);
  const startScale = model.scale.clone();
  const targetScale = startScale.clone().multiplyScalar(3);
  const popDuration = 400; // ms
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
        console.log("Reset button should now be visible");
      } else {
        console.error("Reset button element not found!");
      }
    }
  }

  requestAnimationFrame(popStep);
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
