let allNPCs = [];
let pauseEnabled = false;
let selectedNPC = null;

let scene, camera, renderer, currentModel;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let spherical = { radius: 5, theta: Math.PI / 4, phi: Math.PI / 3 };
let targetLookAt = new THREE.Vector3(0, 1, 0);
let previewInitialized = false;

const MIN_RADIUS = 1;
const MAX_RADIUS = 20;
const ROTATION_SPEED = 0.005;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.uiReady === 'function') {
        window.uiReady('');
    }

    const btnCloseX = document.getElementById('btn-close-x');
    if (btnCloseX) {
        btnCloseX.addEventListener('click', () => {
            if (typeof window.closeDashboard === 'function') {
                window.closeDashboard('');
            }
        });
    }

    const btnPause = document.getElementById('btn-pause');
    if (btnPause) {
        btnPause.addEventListener('click', () => {
            pauseEnabled = !pauseEnabled;
            btnPause.classList.toggle('active', pauseEnabled);
            btnPause.textContent = pauseEnabled ? '▶' : '⏸';
            if (typeof window.togglePause === 'function') {
                window.togglePause(pauseEnabled ? 'true' : 'false');
            }
        });
    }

    const btnTest = document.getElementById('btn-test');
    if (btnTest) {
        btnTest.addEventListener('click', () => {
            if (typeof window.testButton === 'function') {
                window.testButton('');
            }
        });
    }

    const searchInput = document.getElementById('npc-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            filterNPCs(searchInput.value);
        });
    }

    const btnRefresh = document.getElementById('btn-refresh');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            console.log('Refresh button clicked');
            loadNPCList();
        });
    }

    const btnSpawnSelected = document.getElementById('btn-spawn-selected');
    if (btnSpawnSelected) {
        btnSpawnSelected.addEventListener('click', () => {
            if (selectedNPC) {
                spawnNPC(selectedNPC.formID.toString(16).toUpperCase().padStart(8, '0'));
            }
        });
    }

    loadNPCList();

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (typeof window.closeDashboard === 'function') {
                window.closeDashboard('');
            }
        }
    });
});

window.setInitialState = function(jsonStr) {
    try {
        const state = JSON.parse(jsonStr);
        if (state.pauseGame !== undefined) {
            pauseEnabled = state.pauseGame;
            const btnPause = document.getElementById('btn-pause');
            if (btnPause) {
                btnPause.classList.toggle('active', pauseEnabled);
                btnPause.textContent = pauseEnabled ? '▶' : '⏸';
            }
        }
    } catch (e) {
        console.error('Failed to parse initial state:', e);
    }
};

function loadNPCList() {
    if (typeof window.getNPCList === 'function') {
        window.getNPCList('');
    }
}

window.setNPCList = function(jsonStr) {
    try {
        allNPCs = JSON.parse(jsonStr);
        renderNPCList(allNPCs);
    } catch (e) {
        console.error('Failed to parse NPC list:', e);
        const list = document.getElementById('npc-list');
        if (list) {
            list.innerHTML = '<li class="npc-empty">Ошибка загрузки списка</li>';
        }
    }
};

function filterNPCs(query) {
    const lower = query.toLowerCase();
    const filtered = allNPCs.filter(npc => {
        return npc.name.toLowerCase().includes(lower) ||
               npc.editorID.toLowerCase().includes(lower);
    });
    renderNPCList(filtered);
}

function renderNPCList(npcs) {
    const list = document.getElementById('npc-list');
    if (!list) return;

    if (npcs.length === 0) {
        list.innerHTML = '<li class="npc-empty">NPC не найдены</li>';
        return;
    }

    list.innerHTML = '';
    const fragment = document.createDocumentFragment();

    for (const npc of npcs) {
        const li = document.createElement('li');
        li.className = 'npc-item';
        li.dataset.formid = npc.formID.toString(16).toUpperCase().padStart(8, '0');

        const nameSpan = document.createElement('span');
        nameSpan.className = 'npc-name';
        nameSpan.textContent = npc.name;

        const edidSpan = document.createElement('span');
        edidSpan.className = 'npc-editorid';
        edidSpan.textContent = npc.editorID || li.dataset.formid;

        li.appendChild(nameSpan);
        li.appendChild(edidSpan);

        li.addEventListener('click', () => {
            selectNPC(npc);
        });

        fragment.appendChild(li);
    }

    list.appendChild(fragment);
}

function selectNPC(npc) {
    selectedNPC = npc;

    const items = document.querySelectorAll('.npc-item');
    items.forEach(item => item.classList.remove('selected'));
    
    const formIdHex = npc.formID.toString(16).toUpperCase().padStart(8, '0');
    const selectedItem = document.querySelector(`.npc-item[data-formid="${formIdHex}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }

    const placeholder = document.getElementById('preview-placeholder');
    const content = document.getElementById('preview-content');
    
    if (placeholder) placeholder.style.display = 'none';
    if (content) content.style.display = 'flex';

    document.getElementById('preview-name').textContent = npc.name || 'Unknown NPC';
    document.getElementById('preview-editorid').textContent = npc.editorID || 'N/A';
    document.getElementById('preview-formid').textContent = formIdHex;
    document.getElementById('preview-race').textContent = npc.race || 'N/A';
    document.getElementById('preview-gender').textContent = npc.gender || 'N/A';
    document.getElementById('preview-level').textContent = npc.level || 'N/A';

    setTimeout(() => {
        initPreview();
        updateModelPreview(formIdHex);
    }, 50);
}

function initPreview() {
    const canvas = document.getElementById('npc-canvas');
    const container = document.getElementById('model-container');
    if (!canvas || !container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    
    if (width === 0 || height === 0) return;

    if (!previewInitialized) {
        scene = new THREE.Scene();

        camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        updateCameraPosition();

        renderer = new THREE.WebGLRenderer({ 
            canvas: canvas, 
            antialias: true,
            alpha: true 
        });
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        setupLights();
        createPlaceholderModel();
        setupEventListeners(canvas);
        animate();

        previewInitialized = true;
    }
    
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}

function setupLights() {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(5, 10, 7);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xc9a961, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x6688cc, 0.4);
    rimLight.position.set(0, 5, -10);
    scene.add(rimLight);
}

function createPlaceholderModel() {
    if (currentModel) {
        scene.remove(currentModel);
    }

    currentModel = new THREE.Group();

    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x888888, 
        roughness: 0.7,
        metalness: 0.1
    });

    const torsoGeo = new THREE.CylinderGeometry(0.25, 0.2, 0.7, 12);
    const torso = new THREE.Mesh(torsoGeo, bodyMaterial);
    torso.position.y = 1.1;
    torso.castShadow = true;
    currentModel.add(torso);

    const headGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const head = new THREE.Mesh(headGeo, bodyMaterial);
    head.position.y = 1.6;
    head.castShadow = true;
    currentModel.add(head);

    const neckGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.15, 8);
    const neck = new THREE.Mesh(neckGeo, bodyMaterial);
    neck.position.y = 1.42;
    currentModel.add(neck);

    const hipGeo = new THREE.CylinderGeometry(0.22, 0.2, 0.2, 12);
    const hip = new THREE.Mesh(hipGeo, bodyMaterial);
    hip.position.y = 0.65;
    hip.castShadow = true;
    currentModel.add(hip);

    const upperArmGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.4, 8);
    
    const leftUpperArm = new THREE.Mesh(upperArmGeo, bodyMaterial);
    leftUpperArm.position.set(-0.35, 1.25, 0);
    leftUpperArm.rotation.z = 0.2;
    leftUpperArm.castShadow = true;
    currentModel.add(leftUpperArm);

    const rightUpperArm = new THREE.Mesh(upperArmGeo, bodyMaterial);
    rightUpperArm.position.set(0.35, 1.25, 0);
    rightUpperArm.rotation.z = -0.2;
    rightUpperArm.castShadow = true;
    currentModel.add(rightUpperArm);

    const lowerArmGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.4, 8);
    
    const leftLowerArm = new THREE.Mesh(lowerArmGeo, bodyMaterial);
    leftLowerArm.position.set(-0.42, 0.9, 0);
    leftLowerArm.rotation.z = 0.1;
    leftLowerArm.castShadow = true;
    currentModel.add(leftLowerArm);

    const rightLowerArm = new THREE.Mesh(lowerArmGeo, bodyMaterial);
    rightLowerArm.position.set(0.42, 0.9, 0);
    rightLowerArm.rotation.z = -0.1;
    rightLowerArm.castShadow = true;
    currentModel.add(rightLowerArm);

    const upperLegGeo = new THREE.CylinderGeometry(0.09, 0.07, 0.5, 8);
    
    const leftUpperLeg = new THREE.Mesh(upperLegGeo, bodyMaterial);
    leftUpperLeg.position.set(-0.12, 0.35, 0);
    leftUpperLeg.castShadow = true;
    currentModel.add(leftUpperLeg);

    const rightUpperLeg = new THREE.Mesh(upperLegGeo, bodyMaterial);
    rightUpperLeg.position.set(0.12, 0.35, 0);
    rightUpperLeg.castShadow = true;
    currentModel.add(rightUpperLeg);

    const lowerLegGeo = new THREE.CylinderGeometry(0.07, 0.05, 0.5, 8);
    
    const leftLowerLeg = new THREE.Mesh(lowerLegGeo, bodyMaterial);
    leftLowerLeg.position.set(-0.12, -0.1, 0);
    leftLowerLeg.castShadow = true;
    currentModel.add(leftLowerLeg);

    const rightLowerLeg = new THREE.Mesh(lowerLegGeo, bodyMaterial);
    rightLowerLeg.position.set(0.12, -0.1, 0);
    rightLowerLeg.castShadow = true;
    currentModel.add(rightLowerLeg);

    const groundGeo = new THREE.CircleGeometry(1.5, 32);
    const groundMat = new THREE.MeshStandardMaterial({ 
        color: 0x333344,
        roughness: 0.9
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.35;
    ground.receiveShadow = true;
    currentModel.add(ground);

    scene.add(currentModel);
}

function updateCameraPosition() {
    const x = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
    const y = spherical.radius * Math.cos(spherical.phi);
    const z = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);

    camera.position.set(x, y + 1, z);
    camera.lookAt(targetLookAt);
}

function setupEventListeners(canvas) {
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp);
    canvas.addEventListener('wheel', onWheel);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

function onMouseDown(event) {
    event.preventDefault();
    if (event.button === 0) {
        isDragging = true;
    }
    previousMousePosition = { x: event.clientX, y: event.clientY };
}

function onMouseMove(event) {
    const deltaX = event.clientX - previousMousePosition.x;
    const deltaY = event.clientY - previousMousePosition.y;
    previousMousePosition = { x: event.clientX, y: event.clientY };

    if (isDragging) {
        spherical.theta -= deltaX * ROTATION_SPEED;
        spherical.phi -= deltaY * ROTATION_SPEED;
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
        updateCameraPosition();
    }
}

function onMouseUp() {
    isDragging = false;
}

function onWheel(event) {
    event.preventDefault();
    const delta = event.deltaY * 0.01;
    spherical.radius += delta;
    spherical.radius = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, spherical.radius));
    updateCameraPosition();
}

function animate() {
    requestAnimationFrame(animate);
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

function updateModelPreview(formIdHex) {
    console.log('Loading NPC preview:', formIdHex);
    
    if (typeof window.requestNPCPreview === 'function') {
        window.requestNPCPreview(formIdHex);
    }
}

function spawnNPC(formIdHex) {
    if (typeof window.spawnNPC === 'function') {
        window.spawnNPC(formIdHex);
    }
}