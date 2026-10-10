// TODO: Stage 2 — реализовать взаимодействие с C++ через prismUI.invoke
// REF: см. IntelEngine-GamePlugin/PrismaUI/views/IntelEngine/dashboard/

window.addEventListener('DOMContentLoaded', () => {
    // Уведомляем C++, что UI готов
    if (window.prismUI) {
        window.prismUI.invoke('uiReady');
    }
});

document.getElementById('btn-close').addEventListener('click', () => {
    if (window.prismUI) {
        window.prismUI.invoke('closeDashboard');
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (window.prismUI) {
            window.prismUI.invoke('closeDashboard');
        }
    }
});