# Photoshop Texture Channel Packer

A streamlined, artist-friendly ExtendScript tool for Adobe Photoshop that automates the process of packing layer groups into optimized Texture Channels (Albedo and Packed Masks) for Unity and Unreal Engine pipelines.

## Overview

In modern game development, manually packing texture channels (Metallic, Ambient Occlusion, Roughness/Smoothness, Emission) is a repetitive, error-prone bottleneck. While modern pipelines heavily rely on Substance 3D, many indie studios, mobile developers, and 2D/VFX artists still utilize Photoshop for UI masks, texture adjustments, and legacy pipeline support. 
This script eliminates pipeline friction by allowing 2D and 3D artists to keep their working PSDs visually organized in layer groups, while automating the complex channel-packing logic under the hood with a single click.

## Key Features

* **Dynamic UI & Foolproof Validation** ➖ provides real-time feedback on layer status (e.g., detecting missing groups or visually empty layers) and enforces RGB document modes to prevent artist errors before export.
* **Engine-Agnostic Presets** ➖ one-click toggling between popular channel configurations (e.g., Unity Mask Map vs. Unreal Engine ORM), including automated mathematical inversion.
* **Non-Destructive Canvas Protection** ➖ operates entirely on duplicate states with a built-in algorithm to preserve canvas boundaries and transparent pixels during merging, leaving the original PSD structure untouched.
* **Smart Fallbacks** ➖ automatically generates optimized default values (e.g., pure black or white) for any missing texture channels without interrupting the export flow.
* **Footprint Optimization** ➖ intelligently switches between 24-bit and 32-bit TGA formats based on active alpha-channel usage to minimize final build sizes.

## Installation
1. Download the `Channel Packer.jsx` file.
2. Place it in your Photoshop Scripts folder:
   * **Windows:** `C:\Program Files\Adobe\Adobe Photoshop [Version]\Presets\Scripts\`
   * **macOS:** `/Applications/Adobe Photoshop [Version]/Presets/Scripts/`
3. Restart Photoshop. The script will now be available under `File > Scripts > Channel Packer`.

<img width="1216" height="1080" alt="Change" src="https://github.com/user-attachments/assets/8c616ce1-8ed8-4547-9e57-2cc4ddfbb6f7" />

*Note: the full overview of the plugin is available on my ArtStation: @poshichop.*

## Pipeline Output Specifications

| Target Engine | RGB File (Albedo) | R Channel | G Channel | B Channel | A Channel | Mask File |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Unity** | Base Color (PNG) | Metallic | Ambient Occlusion | Emission | Smoothness | TGA (24/32-bit) |
| **Unreal Engine** | Base Color (PNG) | Ambient Occlusion | Roughness (Inv.) | Metallic | Emission | TGA (24/32-bit) |

*Note: the script automatically handles the mathematical inversion required to convert Smoothness to Roughness for Unreal Engine.*

## Usage
1. Organize your Photoshop document using the following exact layer group names: `_Color`, `_Metallic`, `_AO`, `_Emission`, `_Smoothness`.
2. Run the script via `File > Scripts > Channel Packer`.
3. Select your target game engine and export directory.
4. Click **Export**.

## Bonus: Unity Shader Implementation

To demonstrate the immediate value of the packed textures, this repository includes a production-ready Unity Shader Graph asset. It natively unpacks the generated `.tga` mask and provides individual intensity controls for each channel.

**How to use:**
1. Download `Photoshop_to_URP_PackedShader.unitypackage` from the repository (or Releases page).
2. Drag and drop the package directly into your Unity Project window, or navigate to `Assets > Import Package > Custom Package`.
3. Apply the imported Material to your mesh. Assign the generated `_Albedo.png` to the Base Color slot and the `_Masks.tga` to the Packed Mask Map slot.
4. Use the exposed Inspector sliders (Metallic, AO, Emission, Smoothness Intensity) to fine-tune the PBR response dynamically without returning to Photoshop.

<img width="433" height="265" alt="image" src="https://github.com/user-attachments/assets/1b9cd8f4-5a1b-41fd-8732-7afbe7615e4b" />

*Material Inspector demonstrating texture assignments and exposed PBR intensity controls.*

<img width="1044" height="830" alt="image" src="https://github.com/user-attachments/assets/54ba7bc5-365e-43f3-9289-bc28b58c957d" />

*Shader Graph logic for unpacking the generated .tga mask and applying custom multipliers.*
