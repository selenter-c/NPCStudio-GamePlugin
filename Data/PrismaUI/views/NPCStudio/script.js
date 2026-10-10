let allNPCs = [];
let pauseEnabled = false;

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
            spawnNPC(li.dataset.formid);
        });

        fragment.appendChild(li);
    }

    list.appendChild(fragment);
}

function spawnNPC(formIdHex) {
    if (typeof window.spawnNPC === 'function') {
        window.spawnNPC(formIdHex);
    }
}