# NPCStudio — игровые файлы0.6.0

Новая игра, Skyrim1.6.1170, SKSE, Address Library, Magelight UI1.5+ и Phantasm0.3.0 ccf916f72d59. Открытие Shift+8. Установить оба ZIP из NPCStudio-Build/dist: NPCStudio-0.6.0-fomod.zip и NPCStudio-Phantasm-0.3.0-local.zip. Полный SeverActions включать не нужно; в VFS должна побеждать проверенная версия Phantasm.dll.

UI English/Русский,4 палитры,400 постоянных слотов (200+200), раса и комплект при создании, история слотов, Tamrielic/NND случайные имена,40 наборов и свои категории, сохранение одежды при возврате NPC. В0.6.0 подключён отдельный renderer SeverActions через Phantasm API: живые виды NPC,6 lights, аватары,3D кнопка у предметов. Детали — соседний NativePlugin/docs/RENDERING_060.md. Игровая стабильность новой интеграции пока не подтверждена.

CLFM900+id, NPCB00+id, ACHRD00+id; CELL800/XMarker801. Всего1202 формы доE8F, ESL, slots.json schema3. Только текущая схема, миграций прежних сохранений нет. Legacy/0.1.0 не пакуется. Сохранить собственные user-*.json/categories.json/settings.json и MO2 overwrite перед заменой файлов. Сборка через Build/build.bat. Установку и игровой тест выполняет пользователь.
