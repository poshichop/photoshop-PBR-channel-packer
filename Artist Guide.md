# Artist Guide

Welcome! This tool is designed to take the headache out of exporting textures for the game engine. You don't need to manually merge layers, copy-paste into channels, or worry about file formats. Just keep your PSD organized, and the script will do the heavy lifting.

## The Golden Rule: Name Your Groups
To make it all work, the script looks for specific **Layer Groups** in your PSD. You must use these exact names (including the underscore):

* `_Color` (Your main Base Color / Albedo)
* `_Metallic` (White for metal, black for non-metal)
* `_AO` (Ambient Occlusion shadows)
* `_Emission` (Glowing parts)
* `_Smoothness` (White for glossy, black for matte)

*Note: you do not need to have all of these groups! If your prop doesn't glow, just leave the `_Emission` folder out or leave it empty. The script is smart enough to figure it out and fill the missing data with safe default colors.*

`[gif]`

## How to Export

1. **Check Your Mode** ➖ make sure your document is in RGB mode (`Image > Mode > RGB Color`).
2. **Run the Tool** ➖ go to `File > Scripts > Channel Packer`.
3. **Check the Status** ➖ the tool will show you a green/red indicator for which groups it found in your PSD.
4. **Pick Your Engine** ➖ choose either **Unity** or **Unreal Engine** from the dropdown menu (if you pick Unreal, the script will automatically flip your Smoothness into Roughness for you!).
5. **Set the Path & Export** ➖ choose where you want to save the files and click **Export**. 

## What You Get
The script will generate two files perfectly formatted for the engine:
* `TX_[AssetName]_Albedo.png` (Your base colors)
* `TX_[AssetName]_Masks.tga` (Your packed channels ready to be plugged into the engine material)

## Troubleshooting
* **"Export button is greyed out!"** -> Ensure you have at least one of the golden rule folders created and that it contains visible art.
* **"Error: Document is not in RGB mode!"** -> The script only works with RGB files. Convert your document via `Image > Mode > RGB Color`.
