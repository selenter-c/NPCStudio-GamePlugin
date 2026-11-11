![NPC Studio](fomod/images/banner.png)

[**Download NPC Studio**](https://github.com/selenter-c/NPCStudio-GamePlugin/releases/latest) · [Installation](#install-with-mod-organizer-2) · [Report an issue](https://github.com/selenter-c/NPCStudio-GamePlugin/issues) · [Native plugin](https://github.com/selenter-c/NPCStudio-NativePlugin) · [Build tools](https://github.com/selenter-c/NPCStudio-Build)

> [!NOTE]
> **Built for SkyrimNet and its community.** Create your own cast of permanent characters and bring them into the SkyrimNet playthroughs and stories you share with others.
>
> [**Join the SkyrimNet community on Discord**](https://discord.gg/gHHS7HpJS9) · [Explore SkyrimNet on GitHub](https://github.com/MinLL/SkyrimNet-GamePlugin)

## Build a cast for SkyrimNet

NPC Studio is an in-game editor for creating permanent NPCs in Skyrim Special Edition on Steam and GOG.

Each character uses a persistent game reference. NPCs start as blank characters that generally stand idle. NPC Studio gives them a name, appearance, and gear, while SkyrimNet or another AI plugin can provide dialogue and actions. The beta includes the editor and persistent NPCs. Automatic SkyrimNet registration and biography generation are still in development.

## Features

- **400 persistent slots** with separate pools of 200 female and 200 male NPCs. Create a character nearby, summon them later, hide them from the world, or clear their slot for reuse.
- **Appearance editing** with live try-on for hair, hair color, eyes, eyebrows, beard, and skin tone. Change race and height for your own NPCs, or open the appearance editor while looking at a supported NPC in the world.
- **Equipment and outfits** with a searchable item catalog, individual equip and remove actions, and built-in and custom gear presets.
- **Live 3D inspection** for NPCs and items, with camera controls, actor lighting and animation, worn armor models, and persistent character portraits cropped from the live view.
- **English and Russian UI**, with a configurable hotkey, palette, and scale.

## Requirements

| Skyrim build | Store | SKSE64 | Address Library AE |
| --- | --- | --- | --- |
| 1.7.104 | Steam | 2.3.1 | v13 or newer |
| 1.7.99 | Steam | 2.3.0 | v12 or newer |
| 1.6.1179 | GOG | 2.2.6 **GOG** | v11 or newer |
| 1.6.1170 | Steam | 2.2.6 **Steam** | v10 or newer |
| 1.6.1130 | Steam | 2.2.5 | v9 or newer |

Install the SKSE64 build matching your executable and the Anniversary Edition Address Library package that contains its `versionlib` file. [SKSE64 downloads](https://skse.silverlock.org/) · [SKSE64 archive](https://skse.silverlock.org/download/archive/) · [Address Library AE](https://www.nexusmods.com/skyrimspecialedition/mods/32444?tab=files)

- **Magelight UI** with the v4 API and its required runtime files. Use 1.8.0 or a newer compatible build on Skyrim 1.7.x. Live previews use its Direct3D 11 mode. [Magelight UI](https://www.nexusmods.com/skyrimspecialedition/mods/193303)
- **Phantasm 1.0.0 or newer** for 3D previews. Version 1.0.0 is included in the FOMOD. [Phantasm](https://www.nexusmods.com/skyrimspecialedition/mods/197470)

[SkyrimNet](https://github.com/MinLL/SkyrimNet-GamePlugin) is recommended for AI-driven dialogue and behavior. The editor itself runs independently. The optional naming rules are for [NPCs Names Distributor](https://www.nexusmods.com/skyrimspecialedition/mods/73081) and [Spell Perk Item Distributor](https://www.nexusmods.com/skyrimspecialedition/mods/36869), including [Tamrielic Names](https://www.nexusmods.com/skyrimspecialedition/mods/73153) and its [Russian translation with Obscuring Names](https://www.nexusmods.com/skyrimspecialedition/mods/145614). Physics-enabled hairstyles require [Faster HDT-SMP](https://www.nexusmods.com/skyrimspecialedition/mods/57339) and any requirements of the hairstyle itself.

## Install with Mod Organizer 2

1. **Enable automatic detection in MO2.** Open **Settings → Plugins → Fomod Installer**, set **`use_any_file`** to **`true`**, and click **OK**. This is a one-time MO2 setting. If the installer is already open, close it and reopen the archive after saving the setting.
2. Install SKSE64, the AE Address Library, and Magelight UI using the table above. Enable the library mods in the MO2 profile where you plan to use NPC Studio.
3. Open the NPC Studio FOMOD ZIP in MO2. It checks the executable version reported by MO2, the corresponding SKSE version, and the matching Address Library file. The same NPC Studio DLL is installed for all five builds.
4. The installer preselects **NPCs Names Distributor compatibility** if it finds NPCs Names Distributor or Tamrielic Names. Otherwise, it selects **Standard**. Review the selection and click **Install**. The compatibility rules require SPID.
5. Enable NPC Studio and `NPCStudio.esp`, then launch Skyrim through SKSE. In the game world, press **Shift + 8** using the top-row number key.

> [!TIP]
> If the compatibility check is unchecked, confirm that MO2 manages the folder containing the executable you launch, then check the SKSE build and the matching Address Library file. DLL and BIN detection requires `use_any_file` and an enabled mod in the current profile.

Use a separate save for beta testing. Character assignments and appearance are saved with the Skyrim save and its matching SKSE co-save. Settings, custom presets, categories, and portraits live under `Data/SKSE/Plugins/NPCStudio`, often in MO2's Overwrite directory. Keep those files when replacing an installation. Earlier development snapshots with different save formats may require a new game.

## Repositories

| Repository | Contents |
| --- | --- |
| **GamePlugin** | Releases, persistent NPC records, Magelight UI, outfit presets, and the MO2 installer |
| [NativePlugin](https://github.com/selenter-c/NPCStudio-NativePlugin) | C++ SKSE plugin for the NPC pool, editing, and renderer integration |
| [Build](https://github.com/selenter-c/NPCStudio-Build) | ESP generation, native build, tests, and packaging |

## Credits

- [SkyrimNet](https://github.com/MinLL/SkyrimNet-GamePlugin) and [IntelEngine](https://github.com/galanx/IntelEngine-GamePlugin) ([native plugin](https://github.com/galanx/IntelEngine-NativePlugin)) informed the SkyrimNet-oriented workflow.
- Severause created the rendering and UI technology used by the editor. [SeverActions](https://github.com/Severause/SeverActions)
- [Build a Follower](https://www.nexusmods.com/skyrimspecialedition/mods/185471) inspired the reserved-slot design. [NPC Preset Applier](https://www.nexusmods.com/skyrimspecialedition/mods/193575) and [RaceMenu](https://www.nexusmods.com/skyrimspecialedition/mods/19080) informed the appearance workflow.
- Developed with **OpenAI Codex**, which helped solve technical implementation problems in the SKSE integration, rendering, save handling, and UI.

The beta includes third-party notices for its native code.
