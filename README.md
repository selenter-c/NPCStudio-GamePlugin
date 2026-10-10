# NPC Studio — Game Plugin (Papyrus + ESP + UI)

> **Автор:** Selenter
> **Версия:** 0.1.0
> **Целевая игра:** Skyrim SE 1.6.1170

## Описание

Papyrus + ESP + PrismUI часть мода NPC Studio. Обеспечивает:
- Quest скрипты для управления NPC
- ESP файл (генерируется автоматически через `build-esp.ps1`)
- PrismUI Dashboard (HTML/CSS/JS)
- Конфиги для SPID/NND
- Промпты для SkyrimNet
- FOMOD установщик для MO2

## Структура

```
Data/
├── NPCStudio.esp              # Генерируется через build-esp.ps1
├── Scripts/Source/            # Papyrus скрипты
│   ├── NPCStudio_Manager.psc  # Главный Quest (реализован)
│   ├── NPCStudio_PlayerAlias.psc
│   ├── NPCStudio_MCM.psc
│   ├── NPCStudio_InputHandler.psc
│   └── NPCStudio_Utils.psc
├── SKSE/Plugins/              # Конфиги SPID/NND
│   ├── NPCStudio_DISTR.ini
│   └── NPCsNamesDistributor/
│       └── NPCStudio_Names.json
├── PrismaUI/views/NPCStudio/  # Dashboard UI
│   ├── index.html
│   ├── style.css
│   └── script.js
└── SkyrimNet/prompts/         # Промпты для LLM
fomod/                         # MO2 установщик
├── info.xml
└── ModuleConfig.xml
```

## Сборка и установка

Сборка выполняется через `NPCStudio-Build/`:

```powershell
cd ../NPCStudio-Build
.\build.bat          # Полная сборка (ESP + DLL + FOMOD)
```

Результат: `NPCStudio-Build/dist/NPCStudio-0.1.0-fomod.zip`

## Лицензия

MIT