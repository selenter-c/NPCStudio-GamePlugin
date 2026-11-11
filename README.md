![NPC Studio](fomod/images/banner.png)

[**Download NPC Studio**](https://github.com/selenter-c/NPCStudio-GamePlugin/releases/latest) · [Installation](#install-with-mod-organizer-2) · [Report an issue](https://github.com/selenter-c/NPCStudio-GamePlugin/issues) · [Native plugin](https://github.com/selenter-c/NPCStudio-NativePlugin) · [Build tools](https://github.com/selenter-c/NPCStudio-Build)

> [!NOTE]
> **Built for SkyrimNet and its community.** Create your own cast of permanent characters and bring them into the SkyrimNet playthroughs and stories you share with others.
>
> [**Join the SkyrimNet community on Discord**](https://discord.gg/gHHS7HpJS9) · [Explore SkyrimNet on GitHub](https://github.com/MinLL/SkyrimNet-GamePlugin)

## Build a cast for SkyrimNet

NPC Studio is an in-game editor for creating permanent NPCs in Skyrim Special Edition on Steam and GOG.

Each character uses a persistent game reference. NPCs start as blank characters that generally stand idle. NPC Studio gives them a name, appearance, and gear, while SkyrimNet or another AI plugin can provide dialogue and actions. Automatic SkyrimNet registration and biography generation are still in development.

## Features

- **400 persistent slots** with separate pools of 200 female and 200 male NPCs. Create a character nearby, summon them later, hide them from the world, or clear their slot for reuse.
- **Appearance editing** with live try-on for hair, hair color, eyes, eyebrows, beard, and skin tone. Change race and height for your own NPCs, or open the appearance editor while looking at a supported NPC in the world.
- **Equipment and outfits** with a searchable item catalog, individual equip and remove actions, and built-in and custom gear presets.
- **Live 3D inspection** for NPCs and items, with camera controls, actor lighting and animation, worn armor models, and persistent character portraits cropped from the live view.
- **English and Russian UI**, with a configurable hotkey, palette, and scale.

## Requirements

### Supported Skyrim versions

| Skyrim build | Store | SKSE64 | Address Library AE |
| --- | --- | --- | --- |
| 1.7.104 | Steam | 2.3.1 | v13 or newer |
| 1.7.99 | Steam | 2.3.0 | v12 or newer |
| 1.6.1179 | GOG | 2.2.6 **GOG** | v11 or newer |
| 1.6.1170 | Steam | 2.2.6 **Steam** | v10 or newer |
| 1.6.1130 | Steam | 2.2.5 | v9 or newer |

### Required mods and tools

| Dependency | What it does |
| --- | --- |
| **[SKSE64](https://skse.silverlock.org/)** | Loads the NPC Studio native plugin. Use the version and store edition in the table above. Older builds are in the [SKSE64 archive](https://skse.silverlock.org/download/archive/). |
| **[Address Library for SKSE Plugins (AE)](https://www.nexusmods.com/skyrimspecialedition/mods/32444?tab=files)** | Provides the engine address table for your Skyrim executable. Install the AE package that contains its matching `versionlib` file. |
| **[Magelight UI](https://www.nexusmods.com/skyrimspecialedition/mods/193303)** | Runs the in-game editor. Install a build with the v4 API and its required runtime files. For Skyrim 1.7.x, use 1.8.0 or a newer compatible build. Live previews use Direct3D 11 mode. |
| **[Phantasm](https://www.nexusmods.com/skyrimspecialedition/mods/197470)** | Renders live NPC and item previews, and captures character portraits. Install and enable version 1.0.0 or newer separately. |

### Optional mods

| Mod or feature | When to install it |
| --- | --- |
| **[SkyrimNet](https://github.com/MinLL/SkyrimNet-GamePlugin)** | Recommended for AI-driven dialogue and behavior for your NPCs. |
| **[NPCs Names Distributor](https://www.nexusmods.com/skyrimspecialedition/mods/73081)** and **[Spell Perk Item Distributor (SPID)](https://www.nexusmods.com/skyrimspecialedition/mods/36869)** | If you use a name-distribution setup, select the optional FOMOD compatibility rules to keep names assigned in NPC Studio visible. SPID applies those rules. This also covers [Tamrielic Names](https://www.nexusmods.com/skyrimspecialedition/mods/73153) and its [Russian translation with Obscuring Names](https://www.nexusmods.com/skyrimspecialedition/mods/145614). |
| **[Faster HDT-SMP](https://www.nexusmods.com/skyrimspecialedition/mods/57339)** | Install for physics-enabled hairstyles that require it. Follow the requirements of the individual hairstyle mod. |

## Install with Mod Organizer 2

1. **Enable automatic detection in MO2.** Open **Settings → Plugins → Fomod Installer**, set **`use_any_file`** to **`true`**, and click **OK**. This is a one-time MO2 setting. If the installer is already open, close it and reopen the archive after saving the setting.
2. Install SKSE64, the AE Address Library, Magelight UI, and Phantasm using the requirements above. Enable the dependency mods in the MO2 profile where you plan to use NPC Studio.
3. Open the NPC Studio FOMOD ZIP in MO2. The Skyrim version list preselects the executable version reported by MO2. You can change the selection to see the requirements for another build. The dependency check still reports the installed game, SKSE, matching Address Library, Magelight UI, and Phantasm. All five choices install the same NPC Studio DLL.
4. The installer preselects **NPCs Names Distributor compatibility** if it finds NPCs Names Distributor or Tamrielic Names. Otherwise, it selects **Standard**. Review the selection and click **Install**. If upgrading from 0.8.10 or another version that bundled Phantasm, choose **Replace** to remove the old bundled files.
5. Enable NPC Studio and `NPCStudio.esp`, then launch Skyrim through SKSE. In the game world, press **Shift + 8** using the top-row number key.

> [!TIP]
> If the compatibility check is unchecked, confirm that MO2 manages the folder containing the executable you launch, then check the SKSE build and the matching Address Library file. DLL, BIN, and SWF detection requires `use_any_file` and an enabled mod in the current profile.

Character assignments and appearance are saved with the Skyrim save and its matching SKSE co-save. Settings, custom presets, categories, and portraits live under `Data/SKSE/Plugins/NPCStudio`, often in MO2's Overwrite directory. Keep those files when replacing an installation. Earlier development snapshots with different save formats may require a new game.

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

The installer includes third-party notices for its native code.
