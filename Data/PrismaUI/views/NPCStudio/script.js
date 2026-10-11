let allNPCs = [];
let pauseEnabled = false;
let selectedNPC = null;

let nifViewerReady = false;
let nifViewerRequestId = 0;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let pendingRotate = { deltaYaw: 0, deltaPitch: 0 };
let rotateRAF = null;

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

    initNifViewerControls();

    loadNPCList();

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (typeof window.closeDashboard === 'function') {
                window.closeDashboard('');
            }
        }
    });

    sendNifViewerCommand('ready', {});
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

    updateNifViewerStatus('Загрузка модели...');

    // Request native side to resolve NPC mesh path by FormID
    sendNifViewerCommand('getNPCMeshPath', {
        formID: npc.formID
    });
}

function spawnNPC(formIdHex) {
    if (typeof window.spawnNPC === 'function') {
        window.spawnNPC(formIdHex);
    }
}

function sendNifViewerCommand(command, payload) {
    if (typeof window.nifViewerCommand !== 'function') {
        console.warn('nifViewerCommand not available');
        return;
    }

    const msg = {
        command: command,
        requestId: ++nifViewerRequestId,
        payload: payload
    };

    try {
        window.nifViewerCommand(JSON.stringify(msg));
    } catch (e) {
        console.error('Failed to send NIF viewer command:', e);
    }
}

window.onNifViewerEvent = function(jsonStr) {
    try {
        const event = JSON.parse(jsonStr);
        handleNifViewerEvent(event);
    } catch (e) {
        console.error('Failed to parse NIF viewer event:', e);
    }
};

function handleNifViewerEvent(event) {
    const eventType = event.event || (event.data && event.data.event);
    const data = event.data || event;

    switch (eventType) {
        case 'ready':
            nifViewerReady = true;
            updateNifViewerStatus('Готов к загрузке моделей');
            console.log('NIF Viewer ready');
            break;

        case 'modelLoaded':
            if (data.success) {
                updateNifViewerStatus('Модель загружена');
                if (data.frameData) {
                    displayNifFrame(data.frameData);
                }
            } else {
                updateNifViewerStatus('Ошибка: ' + (data.error || 'Неизвестная ошибка'));
            }
            break;

        case 'frameUpdated':
            if (data.frameData) {
                displayNifFrame(data.frameData);
            }
            break;

        case 'resized':
            if (data.frameData) {
                displayNifFrame(data.frameData);
            }
            break;

        case 'modelUnloaded':
            clearNifFrame();
            updateNifViewerStatus('Модель выгружена');
            break;

        case 'error':
            updateNifViewerStatus('Ошибка: ' + (data.message || 'Неизвестная ошибка'));
            console.error('NIF Viewer error:', data.code, data.message);
            break;

        case 'npcMeshPath':
            if (data.success && data.meshPath) {
                console.log('NPC mesh path resolved:', data.meshPath);
                sendNifViewerCommand('loadModel', {
                    assetPath: data.meshPath,
                    width: 512,
                    height: 512
                });
            } else {
                updateNifViewerStatus('Не удалось определить путь к модели');
            }
            break;

        case 'status':
            console.log('NIF Viewer status:', data);
            break;

        default:
            console.log('Unknown NIF viewer event:', eventType);
    }
}

function displayNifFrame(base64Data) {
    const img = document.getElementById('nif-viewer-image');
    if (img) {
        img.src = 'data:image/png;base64,' + base64Data;
        img.style.display = 'block';
    }

    const placeholder = document.getElementById('nif-viewer-placeholder');
    if (placeholder) {
        placeholder.style.display = 'none';
    }

    updateNifViewerStatus('');
}

function clearNifFrame() {
    const img = document.getElementById('nif-viewer-image');
    if (img) {
        img.src = '';
        img.style.display = 'none';
    }

    const placeholder = document.getElementById('nif-viewer-placeholder');
    if (placeholder) {
        placeholder.style.display = 'flex';
    }
}

function updateNifViewerStatus(message) {
    const status = document.getElementById('nif-viewer-status');
    if (status) {
        status.textContent = message;
        status.style.display = message ? 'block' : 'none';
    }
}

function initNifViewerControls() {
    const container = document.getElementById('model-container');
    if (!container) return;

    container.addEventListener('mousedown', onNifMouseDown);
    container.addEventListener('mousemove', onNifMouseMove);
    container.addEventListener('mouseup', onNifMouseUp);
    container.addEventListener('mouseleave', onNifMouseUp);
    container.addEventListener('wheel', onNifWheel);
    container.addEventListener('contextmenu', (e) => e.preventDefault());

    const btnReset = document.getElementById('nif-camera-reset');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            sendNifViewerCommand('resetCamera', {});
        });
    }

    const btnZoomIn = document.getElementById('nif-zoom-in');
    if (btnZoomIn) {
        btnZoomIn.addEventListener('click', () => {
            sendNifViewerCommand('zoom', { delta: 0.5 });
        });
    }

    const btnZoomOut = document.getElementById('nif-zoom-out');
    if (btnZoomOut) {
        btnZoomOut.addEventListener('click', () => {
            sendNifViewerCommand('zoom', { delta: -0.5 });
        });
    }
}

function onNifMouseDown(event) {
    if (event.button === 0) {
        isDragging = true;
        previousMousePosition = { x: event.clientX, y: event.clientY };
        event.preventDefault();
    }
}

function onNifMouseMove(event) {
    if (!isDragging) return;

    const deltaX = event.clientX - previousMousePosition.x;
    const deltaY = event.clientY - previousMousePosition.y;
    previousMousePosition = { x: event.clientX, y: event.clientY };

    pendingRotate.deltaYaw += deltaX * 0.5;
    pendingRotate.deltaPitch -= deltaY * 0.5;

    if (!rotateRAF) {
        rotateRAF = requestAnimationFrame(() => {
            sendNifViewerCommand('rotate', {
                deltaYaw: pendingRotate.deltaYaw,
                deltaPitch: pendingRotate.deltaPitch
            });
            pendingRotate.deltaYaw = 0;
            pendingRotate.deltaPitch = 0;
            rotateRAF = null;
        });
    }
}

function onNifMouseUp() {
    isDragging = false;
}

function onNifWheel(event) {
    event.preventDefault();
    const delta = event.deltaY * -0.002;
    sendNifViewerCommand('zoom', { delta: delta });
}