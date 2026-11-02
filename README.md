# NPCStudio — игровые файлы 0.5

Skyrim 1.6.1170, SKSE, Address Library, Magelight UI 1.5+. Открытие Shift+8. English/Русский, четыре палитры, расы при создании/редактировании, экспериментальный рендер/портреты. Подробные возможности, ограничения и ручной тест — в соседнем NativePlugin/README.md.

ESP с версии0.4 не меняется: 200+200 уникальных баз, 400 persistent initially-disabled ссылок и 400 цветов. CELL800, XMarker801. Всего1202 формы, ESL. Старые id0..159: CLFM900+id, NPCA00+id, ACHRB00+id. Новые id160..399: offset=id-160, CLFMC00+offset, NPCD00+offset, ACHRE00+offset. Female0..79,160..279; male80..159,280..399. Номера1..200 отдельно по полу.

Data/Magelight — UI + i18n.js. Equipment —40 наборов с категориями. NPCStudio_NND_DISTR.ini — необязательная совместимость NND/SPID. Legacy не пакуется.

Обновление ZIP целиком при закрытой игре, отдельный сейв для отката. Сохранить user-*.json/categories.json/settings.json и файлы MO2 overwrite. Сборка: NPCStudio-Build/build.bat. 0.4 проверена пользователем, 0.5 пока проверена сборкой/WARP/mock, реальный рендер NPC проверяется вручную.
