![NPC Studio](fomod/images/banner.png)

[**Download the beta**](https://github.com/selenter-c/NPCStudio-GamePlugin/releases/tag/v0.8.7-beta) · [Report an issue](https://github.com/selenter-c/NPCStudio-GamePlugin/issues) · [Native plugin](https://github.com/selenter-c/NPCStudio-NativePlugin) · [Build tools](https://github.com/selenter-c/NPCStudio-Build)

## Build a cast for SkyrimNet

NPC Studio is an in-game editor for creating permanent NPCs in Skyrim Special Edition 1.6.1170. It was designed primarily for [SkyrimNet](https://github.com/MinLL/SkyrimNet-GamePlugin) playthroughs where you want to make your own cast and let AI frameworks drive their behavior.

Each character uses a persistent game reference. NPCs start as blank characters that generally stand idle. NPC Studio gives them a name, appearance, and gear, while SkyrimNet or another AI plugin can provide dialogue and actions. The beta includes the editor and persistent NPCs. Automatic SkyrimNet registration and biography generation are still in development.

## Features

- **400 persistent slots** with separate pools of 200 female and 200 male NPCs. Create a character nearby, summon them later, hide them from the world, or clear their slot for reuse.
- **Appearance editing** with live try-on for hair, hair color, eyes, eyebrows, beard, and skin tone. Change race and height for your own NPCs, or open the appearance editor while looking at a supported NPC in the world.
- **Equipment and outfits** with a searchable item catalog, individual equip and remove actions, and built-in and custom gear presets.
- **Live 3D inspection** for NPCs and items, with camera controls, lighting, and persistent character portraits.
- **English and Russian UI**, with a configurable hotkey, palette, and scale.

## Requirements

| Component | Purpose |
| --- | --- |
| **Skyrim Special Edition, Steam runtime 1.6.1170** | Supported runtime for this beta |
| [SKSE64 2.2.6](https://skse.silverlock.org/) | Loads the native plugin |
| [Address Library for SKSE Plugins, Anniversary Edition package](https://www.nexusmods.com/skyrimspecialedition/mods/32444) | Provides runtime addresses for 1.6.1170 |
| [Magelight UI](https://www.nexusmods.com/skyrimspecialedition/mods/193303) | Hosts the in-game editor. Use a build exposing the Magelight v4 API and install its runtime dependencies |
| [Phantasm 0.3.0 from SeverActions 4.7.0](https://github.com/Severause/SeverActions/releases/tag/v4.7.0) | Required for 3D previews, portraits, and hairstyle thumbnails. The beta uses the exact renderer build shipped in that release |

[SkyrimNet](https://github.com/MinLL/SkyrimNet-GamePlugin) is recommended for AI-driven dialogue and behavior. The editor itself runs independently. The optional naming rules are for [NPCs Names Distributor](https://www.nexusmods.com/skyrimspecialedition/mods/73081) and [Spell Perk Item Distributor](https://www.nexusmods.com/skyrimspecialedition/mods/36869), including [Tamrielic Names](https://www.nexusmods.com/skyrimspecialedition/mods/73153) and its [Russian translation with Obscuring Names](https://www.nexusmods.com/skyrimspecialedition/mods/145614). Physics-enabled hairstyles require [Faster HDT-SMP](https://www.nexusmods.com/skyrimspecialedition/mods/57339) and any requirements of the hairstyle itself.

## Install with Mod Organizer 2

1. Install SKSE64, the AE Address Library, and Magelight UI for your profile.
2. For 3D features, use the Phantasm that ships with **SeverActions 4.7.0**. If you use the renderer on its own, extract the contents of `97 Phantasm/00 Core` from the original SeverActions archive into a separate MO2 mod. Its root should contain `Interface` and `SKSE`. Enable a single copy of that renderer.
3. Install `NPCStudio-0.8.7-beta-fomod.zip` in MO2. Select **Standard** or the **NPCs Names Distributor compatibility** option.
4. Enable the mod and `NPCStudio.esp`, then launch Skyrim through SKSE. In the game world, press **Shift + 8** using the top-row number key.

The installer shows a dependency checklist. In MO2, enable **Settings → Plugins → FOMOD Installer → use_any_file** before opening the installer if you want it to detect DLL, BIN, and SWF files in the active profile. A warning means the installer could not confirm the requirement. File checks do not identify the version of a DLL.

Use a separate save for beta testing. Character assignments and appearance are saved with the Skyrim save and its matching SKSE co-save. Settings, custom presets, categories, and portraits live under `Data/SKSE/Plugins/NPCStudio`, often in MO2's Overwrite directory. Keep those files when replacing an installation. Earlier development snapshots with different save formats may require a new game.

## Repositories

| Repository | Contents |
| --- | --- |
| **GamePlugin** | Releases, persistent NPC records, Magelight UI, outfit presets, and the MO2 installer |
| [NativePlugin](https://github.com/selenter-c/NPCStudio-NativePlugin) | C++ SKSE plugin for the NPC pool, editing, and renderer integration |
| [Build](https://github.com/selenter-c/NPCStudio-Build) | ESP generation, native build, tests, and packaging |

## Credits

- [SkyrimNet](https://github.com/MinLL/SkyrimNet-GamePlugin) and [IntelEngine](https://github.com/galanx/IntelEngine-GamePlugin) ([native plugin](https://github.com/galanx/IntelEngine-NativePlugin)) informed the SkyrimNet-oriented workflow.
- [SeverActions](https://github.com/Severause/SeverActions), Phantasm, and [Magelight UI](https://www.nexusmods.com/skyrimspecialedition/mods/193303) by Severause provided the rendering and UI technology.
- [Build a Follower](https://www.nexusmods.com/skyrimspecialedition/mods/185471) inspired the reserved-slot design. [NPC Preset Applier](https://www.nexusmods.com/skyrimspecialedition/mods/193575) and [RaceMenu](https://www.nexusmods.com/skyrimspecialedition/mods/19080) informed the appearance workflow.
- Developed with **OpenAI Codex**, which helped solve technical implementation problems in the SKSE integration, rendering, save handling, and UI.

The beta includes third-party notices for its native code. Magelight UI and Phantasm are installed from their respective sources.
