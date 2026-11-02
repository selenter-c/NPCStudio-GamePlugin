# NPCStudio — игровые файлы 0.4

Skyrim1.6.1170, SKSE, Address Library, Magelight UI1.5+. Открытие Shift+F8, клавиши настраиваются в меню.

Пул 200+200 уникальных баз, 400 persistent initially-disabled ссылок, 400 цветов, резервная CELL и XMarker. Итого1202 собственные формы в диапазоне800..FFF, флаг ESL сохранён. Старые id0..159 и 480NPC_/ACHR/CLFM побайтово неизменны.

Старые адреса: CLFM900+id, NPCA00+id, ACHRB00+id. Новые id160..399: offset=id-160, CLFMC00+offset, NPCD00+offset, ACHRE00+offset. Female0..79,160..279; male80..159,280..399. Порядковые номера в интерфейсе1..200 отдельно по полу.

Data/Magelight — новый UI. Equipment —40 готовых наборов с категориями. NPCStudio_NND_DISTR.ini — совместимость имён, без новой обязательной зависимости. Legacy/0.1.0 не включается.

При обновлении сохраняйте пользовательские Equipment/user-*.json, categories.json и settings.json, в том числе MO2 overwrite. DLL/UI/ESP/slots.json обновлять вместе. Старые co-save читаются, история свободных старых слотов неизвестна. Перед обновлением сделайте отдельное сохранение для отката.

Нужен NPCStudio.dll из соседнего проекта. Сборка: NPCStudio-Build/build.bat. Новые функции0.4 ещё требуют ручного теста в игре; подробно — NativePlugin/README.md и docs/STATE.md.
