(function() {
    'use strict';

    let scene, camera, renderer;
    let currentModel = null;
    let isDragging = false;
    let isPanning = false;
    let previousMousePosition = { x: 0, y: 0 };
    let spherical = { radius: 5, theta: Math.PI / 4, phi: Math.PI / 3 };
    let panOffset = { x: 0, y: 0 };
    let targetLookAt = new THREE.Vector3(0, 1, 0);

    const MIN_RADIUS = 1;
    const MAX_RADIUS = 20;
    const ROTATION_SPEED = 0.005;
    const PAN_SPEED = 0.01;

    function init() {
        const canvas = document.getElementById('model-canvas');
        if (!canvas) return;

        scene = new THREE.Scene();

        camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
        updateCameraPosition();

        renderer = new THREE.WebGLRenderer({ 
            canvas: canvas, 
            antialias: true,
            alpha: true 
        });
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        setupLights();
        createPlaceholderModel();
        setupEventListeners(canvas);
        animate();

        window.addEventListener('resize', onWindowResize);
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

        document.getElementById('placeholder-overlay').classList.add('hidden');
    }

    function updateCameraPosition() {
        const x = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
        const y = spherical.radius * Math.cos(spherical.phi);
        const z = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);

        camera.position.set(
            x + panOffset.x,
            y + 1 + panOffset.y,
            z
        );
        camera.lookAt(targetLookAt.x + panOffset.x, targetLookAt.y + panOffset.y, targetLookAt.z);
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
        } else if (event.button === 2) {
            isPanning = true;
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

        if (isPanning) {
            panOffset.x -= deltaX * PAN_SPEED * 0.1;
            panOffset.y += deltaY * PAN_SPEED * 0.1;
            updateCameraPosition();
        }
    }

    function onMouseUp() {
        isDragging = false;
        isPanning = false;
    }

    function onWheel(event) {
        event.preventDefault();
        const delta = event.deltaY * 0.01;
        spherical.radius += delta;
        spherical.radius = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, spherical.radius));
        updateCameraPosition();
    }

    function onWindowResize() {
        const canvas = document.getElementById('model-canvas');
        if (!canvas || !camera || !renderer) return;

        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    }

    function animate() {
        requestAnimationFrame(animate);
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }

    window.NPCPreview = {
        loadNPC: function(formIdHex) {
            console.log('Loading NPC preview:', formIdHex);
            
            const loadingOverlay = document.getElementById('loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.classList.add('visible');
            }

            if (typeof window.requestNPCModelData === 'function') {
                window.requestNPCModelData(formIdHex);
            }

            setTimeout(() => {
                if (loadingOverlay) {
                    loadingOverlay.classList.remove('visible');
                }
            }, 500);
        },

        resetView: function() {
            spherical = { radius: 5, theta: Math.PI / 4, phi: Math.PI / 3 };
            panOffset = { x: 0, y: 0 };
            updateCameraPosition();
        },

        setModelColor: function(colorHex) {
            if (currentModel) {
                const color = new THREE.Color(colorHex);
                currentModel.traverse((child) => {
                    if (child.isMesh && child.material) {
                        child.material.color = color;
                    }
                });
            }
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();