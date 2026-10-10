# NPC Studio — Game Plugin Development Log

> **Автор:** Selenter
> **Проект:** NPC Studio
> **Репозиторий:** NPCStudio-GamePlugin (Papyrus + ESP + UI)

---

## 📋 Состояние файлов проекта

> Обновлено: 2026-10-10 13:10

### Papyrus (GamePlugin)

| Файл | Этап | Статус | Комментарий |
|------|------|--------|-------------|
| `Data/Scripts/Source/NPCStudio_Manager.psc` | 1 | 🟢 | Главный Quest скрипт, уведомление на русском |
| `Data/Scripts/Source/NPCStudio_PlayerAlias.psc` | 1 | ⬜ | PlayerAlias скрипт, заглушка |
| `Data/Scripts/Source/NPCStudio_MCM.psc` | 1 | ⬜ | MCM настройки, заглушка |
| `Data/Scripts/Source/NPCStudio_InputHandler.psc` | 2 | ⬜ | Обработка ввода, заглушка |
| `Data/Scripts/Source/NPCStudio_Utils.psc` | 3 | ⬜ | Утилиты, заглушка |

**Прогресс Papyrus:** 1 из 5 файлов реализовано (20%)

### ESP

| Файл | Этап | Статус | Комментарий |
|------|------|--------|-------------|
| `Data/NPCStudio.esp` | 1 | 🟢 | Генерируется автоматически через build-esp.ps1 (Python) |

### UI (PrismUI)

| Файл | Этап | Статус | Комментарий |
|------|------|--------|-------------|
| `Data/PrismaUI/views/NPCStudio/index.html` | 2 | ⬜ | Dashboard HTML, заглушка |
| `Data/PrismaUI/views/NPCStudio/style.css` | 2 | ⬜ | Dashboard CSS, базовый стиль |
| `Data/PrismaUI/views/NPCStudio/script.js` | 2 | ⬜ | Dashboard JS, заглушка |

**Прогресс UI:** 0 из 3 файлов реализовано (0%)

### Конфиги

| Файл | Этап | Статус | Комментарий |
|------|------|--------|-------------|
| `Data/SKSE/Plugins/NPCStudio_DISTR.ini` | 5 | ⬜ | SPID конфиг, заглушка |
| `Data/SKSE/Plugins/NPCsNamesDistributor/NPCStudio_Names.json` | 9 | ⬜ | NND конфиг, заглушка |

**Прогресс конфигов:** 0 из 2 файлов реализовано (0%)

### FOMOD

| Файл | Этап | Статус | Комментарий |
|------|------|--------|-------------|
| `fomod/info.xml` | 0 | 🟢 | Информация о моде |
| `fomod/ModuleConfig.xml` | 0 | 🟢 | Конфигурация установщика (type="SelectAll") |

**Прогресс FOMOD:** 2 из 2 файлов готово (100%)

### 📊 Общий прогресс GamePlugin

| Категория | Готово | Всего | Процент |
|-----------|--------|-------|---------|
| Papyrus | 1 | 5 | 20% |
| ESP | 1 | 1 | 100% |
| UI | 0 | 3 | 0% |
| Конфиги | 0 | 2 | 0% |
| FOMOD | 2 | 2 | 100% |
| **ИТОГО** | **4** | **13** | **31%** |

---

## 📝 Журнал разработки

### 2026-10-10 10:45 — Stage 0: Создание каркаса
- Создана структура NPCStudio-GamePlugin
- Все Papyrus файлы созданы как заглушки с TODO + REF комментариями
- PrismUI файлы (HTML/CSS/JS) созданы с базовой структурой
- FOMOD файлы (info.xml, ModuleConfig.xml) готовы
- Изучены референсы: IntelEngine-GamePlugin, SkyrimNetDevKit

### 2026-10-10 11:00 — Stage 1: Установка + вывод в консоль
- Реализован NPCStudio_Manager.psc с уведомлением на русском языке
- Debug.Notification выводит "NPC Studio v0.1.0 загружен (автор: Selenter)"
- Debug.Trace выводит детальную информацию о моде
- Добавлены свойства PluginVersion и PluginAuthor

### 2026-10-10 12:00 — Исправления FOMOD
- Исправлен ModuleConfig.xml: type="SelectExactlyOne" → type="SelectAll"
- Исправлена структура архива: убрана папка Data/ (файлы в корне)
- Добавлен NPCStudio.esp в ModuleConfig.xml

### 2026-10-10 12:10 — Генерация ESP
- Создан build-esp.ps1 для автоматической генерации NPCStudio.esp
- ESP генерируется через Python (struct pack)
- Включён в full-build.ps1 как Step 1/3

### 2026-10-10 13:10 — Обновление документации
- Обновлён DEVELOPMENT_LOG.md с полной историей
- Обновлена таблица состояний файлов
- Удалён устаревший tools/build-archive.ps1
- Добавлены записи о всех исправлениях