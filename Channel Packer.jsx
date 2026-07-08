/**
 * @fileoverview Texture Channel Packer for Photoshop
 * @description Automates the process of packing specific layer groups into 
 * Texture Channels (Albedo and Packed Masks) for Unity and Unreal Engine pipelines.
 * @author PoshiChop 
 * @version 1.0.0  
 */

(function () {
    "use strict";

    // --- CONFIGURATION & CONSTANTS ---
    var CONFIG = {
        PREF_FILE_PATH: Folder.userData + "/ChannelPacker_LastPath.txt",
        GROUPS: [
            { name: "_Color", isAlpha: false },
            { name: "_Metallic", isAlpha: false },
            { name: "_AO", isAlpha: false },
            { name: "_Emission", isAlpha: true },
            { name: "_Smoothness", isAlpha: true }
        ],
        ENGINES: ["Unity", "Unreal Engine"],
        UI_WIDTH_CHARS: 90,
        UI_INPUT_CHARS: 40
    };

    // --- ENTRY POINT ---
    if (app.documents.length === 0) {
        alert("Error: No active document found. Please open a PSD file first.", "Channel Packer", true);
        return;
    }

    var sourceDoc = app.activeDocument;

    if (sourceDoc.mode !== DocumentMode.RGB) {
        alert("🛑 Error: Document is not in RGB mode!\n\nPlease convert the file to RGB (Image -> Mode -> RGB Color) before exporting masks.", "Channel Packer", true);
        return;
    }

    // --- MAIN SCRIPT LOGIC ---
    var docWidth = sourceDoc.width;
    var docHeight = sourceDoc.height;
    var docResolution = sourceDoc.resolution;
    var assetBaseName = sourceDoc.name.replace(/\.[^\.]+$/, "");
    var exportPath = getExportPath(sourceDoc);
    
    var groupData = [];
    for (var i = 0; i < CONFIG.GROUPS.length; i++) {
        groupData.push(getGroupStatus(sourceDoc, CONFIG.GROUPS[i].name));
    }

    buildAndRunUI();

    // ==========================================
    // UI BUILDER
    // ==========================================
    function buildAndRunUI() {
        var win = new Window("dialog", "Texture Channel Packer");
        win.alignChildren = "fill";

        var nameGroup = win.add("group");
        nameGroup.alignChildren = "left";
        nameGroup.add("statictext", undefined, "Asset Name:");
        var inputAssetName = nameGroup.add("edittext", undefined, assetBaseName);
        inputAssetName.characters = CONFIG.UI_INPUT_CHARS;

        var engineGroup = win.add("group");
        engineGroup.alignChildren = "left";
        engineGroup.add("statictext", undefined, "Target Engine:");
        var engineDropdown = engineGroup.add("dropdownlist", undefined, CONFIG.ENGINES);
        engineDropdown.selection = 0;

        var pathPanel = win.add("panel", undefined, "Export Directory");
        pathPanel.alignChildren = "left";
        var pathGroup = pathPanel.add("group");
        var btnBrowse = pathGroup.add("button", undefined, "Browse...");
        var lblPath = pathGroup.add("statictext", undefined, exportPath ? exportPath.fsName : "No path selected", { truncate: "middle" });
        lblPath.characters = CONFIG.UI_INPUT_CHARS;

        btnBrowse.onClick = function () {
            var userFolder = Folder.selectDialog("Select folder for texture export:");
            if (userFolder) {
                exportPath = userFolder;
                lblPath.text = userFolder.fsName;
            }
        };

        var statusPanel = win.add("panel", undefined, "PSD Group Status");
        statusPanel.alignChildren = "fill"; 
        var uiLabels = [];

        for (var j = 0; j < groupData.length; j++) {
            var st = statusPanel.add("statictext", undefined, "");
            st.characters = CONFIG.UI_WIDTH_CHARS;
            uiLabels.push(st);
        }

        function refreshLabels() {
            var isUnreal = (engineDropdown.selection.index === 1);
            updateStatusLabels(uiLabels, groupData, isUnreal);
        }

        refreshLabels();
        engineDropdown.onChange = refreshLabels;

        var btnGroup = win.add("group");
        btnGroup.alignment = "right";
        var btnExport = btnGroup.add("button", undefined, "Export", { name: "ok" });
        var btnCancel = btnGroup.add("button", undefined, "Cancel", { name: "cancel" });

        var hasContent = false;
        for (var k = 0; k < groupData.length; k++) {
            if (groupData[k].exists) {
                hasContent = true;
                break;
            }
        }
        btnExport.enabled = hasContent;

        if (win.show() === 1) {
            if (!exportPath) {
                alert("Error: No export path selected.", "Export Failed", true);
                return;
            }

            assetBaseName = inputAssetName.text;
            saveLastPath(exportPath);
            executeExport(engineDropdown.selection.index === 1);
        }
    }

    // ==========================================
    // EXPORT LOGIC
    // ==========================================
    function executeExport(isUnreal) {
        // Safe state caching
        var originalRulerUnits = app.preferences.rulerUnits;
        var originalDialogs = app.displayDialogs;
        
        app.preferences.rulerUnits = Units.PIXELS;
        app.displayDialogs = DialogModes.NO; // Prevent popup interruptions

        var maskDoc = app.documents.add(docWidth, docHeight, docResolution, "TX_" + assetBaseName + "_Masks", NewDocumentMode.RGB, DocumentFill.BACKGROUNDCOLOR);
        
        var colorBlack = getSolidColor(0, 0, 0);
        var colorWhite = getSolidColor(255, 255, 255);

        // --- MASK CHANNEL ASSIGNMENTS ---
        if (isUnreal) {
            processChannel(maskDoc, 0, groupData[2], false, colorWhite); // R: AO
            processChannel(maskDoc, 1, groupData[4], true, colorWhite);  // G: Roughness (Inv Smoothness)
            processChannel(maskDoc, 2, groupData[1], false, colorBlack); // B: Metallic
        } else {
            processChannel(maskDoc, 0, groupData[1], false, colorBlack); // R: Metallic
            processChannel(maskDoc, 1, groupData[2], false, colorWhite); // G: AO
            processChannel(maskDoc, 2, groupData[3], false, colorBlack); // B: Emission
        }

        // --- ALPHA CHANNEL ---
        var needAlpha = isUnreal ? groupData[3].exists : groupData[4].exists;
        var tgaOptions = new TargaSaveOptions();

        if (needAlpha) {
            var alphaChannel = maskDoc.channels.add();
            alphaChannel.name = isUnreal ? "Emission Alpha" : "Smoothness Alpha";
            
            var targetGroup = isUnreal ? groupData[3] : groupData[4];
            var fallbackColor = isUnreal ? colorBlack : colorWhite;

            processChannel(maskDoc, alphaChannel, targetGroup, false, fallbackColor);
            
            maskDoc.activeChannels = [maskDoc.channels[0], maskDoc.channels[1], maskDoc.channels[2]];
            alphaChannel.visible = true;
            
            tgaOptions.resolution = TargaBitsPerPixels.THIRTYTWO;
            tgaOptions.alphaChannels = true; // Explicitly enforce alpha saving
        } else {
            tgaOptions.resolution = TargaBitsPerPixels.TWENTYFOUR;
            tgaOptions.alphaChannels = false;
        }

        var tgaFile = new File(exportPath + "/TX_" + assetBaseName + "_Masks.tga");
        maskDoc.saveAs(tgaFile, tgaOptions, true, Extension.LOWERCASE);
        maskDoc.close(SaveOptions.DONOTSAVECHANGES);

        // --- ALBEDO (COLOR) EXPORT ---
        setActiveDocument(sourceDoc);
        var albedoDoc = app.documents.add(docWidth, docHeight, docResolution, "TX_" + assetBaseName + "_Albedo", NewDocumentMode.RGB, DocumentFill.BACKGROUNDCOLOR);
        
        if (groupData[0].exists && copyGroupContent(groupData[0], false, null)) {
            setActiveDocument(albedoDoc);
            albedoDoc.selection.selectAll();
            albedoDoc.paste();
            albedoDoc.selection.deselect();
        } else {
            setActiveDocument(albedoDoc);
            fillCurrentSelection(albedoDoc, colorWhite);
        }

        var pngFile = new File(exportPath + "/TX_" + assetBaseName + "_Albedo.png");
        var pngOptions = new PNGSaveOptions();
        albedoDoc.saveAs(pngFile, pngOptions, true, Extension.LOWERCASE);
        albedoDoc.close(SaveOptions.DONOTSAVECHANGES);

        // --- CLEANUP ---
        app.preferences.rulerUnits = originalRulerUnits;
        app.displayDialogs = originalDialogs;
        app.activeDocument = sourceDoc;
        
        alert("Success! Textures exported for " + (isUnreal ? "Unreal Engine" : "Unity") + ".\nSaved to: " + exportPath.fsName, "Export Complete");
    }

    // ==========================================
    // HELPER FUNCTIONS
    // ==========================================

    function updateStatusLabels(uiLabels, data, isUnreal) {
        var formatSuffix = function(count, exists) {
            if (count === 0) return "[Not found]";
            if (count > 0 && !exists) return "[Visually empty]"; 
            return "[" + count + (count === 1 ? " layer" : " layers") + "]";
        };

        var getIcon = function(defName, exists) {
            if (defName === "_Color") return exists ? "🔴" : "❌";
            return exists ? "🔴" : "⚪️";
        };

        uiLabels[0].text = getIcon(data[0].name, data[0].exists) + "  _Color (RGB) → Base Color  " + formatSuffix(data[0].count, data[0].exists);

        if (isUnreal) {
            uiLabels[1].text = getIcon(data[1].name, data[1].exists) + "  _Metallic (B) → Metallic   " + formatSuffix(data[1].count, data[1].exists);
            uiLabels[2].text = getIcon(data[2].name, data[2].exists) + "  _AO (R) → Ambient Occlusion  " + formatSuffix(data[2].count, data[2].exists);
            uiLabels[3].text = getIcon(data[3].name, data[3].exists) + "  _Emission (A) → Emission  " + formatSuffix(data[3].count, data[3].exists);
            uiLabels[4].text = getIcon(data[4].name, data[4].exists) + "  _Smoothness (G) → Roughness (Inv.)  " + formatSuffix(data[4].count, data[4].exists);
        } else {
            uiLabels[1].text = getIcon(data[1].name, data[1].exists) + "  _Metallic (R) → Metallic  " + formatSuffix(data[1].count, data[1].exists);
            uiLabels[2].text = getIcon(data[2].name, data[2].exists) + "  _AO (G) → Ambient Occlusion  " + formatSuffix(data[2].count, data[2].exists);
            uiLabels[3].text = getIcon(data[3].name, data[3].exists) + "  _Emission (B) → Emission  " + formatSuffix(data[3].count, data[3].exists);
            uiLabels[4].text = getIcon(data[4].name, data[4].exists) + "  _Smoothness (A) → Smoothness  " + formatSuffix(data[4].count, data[4].exists);
        }
    }

    function getGroupStatus(doc, groupName) {
        var info = { name: groupName, exists: false, count: 0, group: null };
        var originalHistory = null;
        try {
            info.group = doc.layerSets.getByName(groupName);
            info.count = info.group.layers.length;
            
            if (info.count > 0) {
                originalHistory = doc.activeHistoryState;
                
                var dup = info.group.duplicate();
                var merged = dup.merge();
                var b = merged.bounds;
                
                var isEmpty = (b[0].value === 0 && b[1].value === 0 && b[2].value === 0 && b[3].value === 0);
                info.exists = !isEmpty;
            }
        } catch (e) {
            info.exists = false;
        } finally {
            if (originalHistory) {
                try { doc.activeHistoryState = originalHistory; } catch(err) {}
            }
        }
        return info;
    }

    function processChannel(doc, channelOrIndex, groupDef, doInvert, fallbackColor) {
        setActiveDocument(doc);
        var activeChan = (typeof channelOrIndex === "number") ? doc.channels[channelOrIndex] : channelOrIndex;
        doc.activeChannels = [activeChan];

        if (groupDef.exists && copyGroupContent(groupDef, doInvert, fallbackColor)) {
            setActiveDocument(doc);
            doc.activeChannels = [activeChan]; 
            doc.selection.selectAll();
            doc.paste();
            doc.selection.deselect();
        } else {
            fillCurrentSelection(doc, fallbackColor);
        }
    }

    function copyGroupContent(groupDef, doInvert, fallbackColor) {
        var originalHistory = null;
        try {
            setActiveDocument(sourceDoc);
            var group = groupDef.group;
            if (!group) return false;

            originalHistory = sourceDoc.activeHistoryState;

            group.visible = true;
            var dup = group.duplicate();
            
            // Merge the group BEFORE adding the background to avoid breaking clipping masks 
            var merged = dup.merge(); 

            var bgLayer = sourceDoc.artLayers.add();
            bgLayer.move(merged, ElementPlacement.PLACEAFTER);

            if (fallbackColor) {
                // Fill the background with a solid color for masks
                sourceDoc.selection.selectAll();
                sourceDoc.selection.fill(fallbackColor);
                sourceDoc.selection.deselect();
            } else {
                // For Albedo, place invisible anchors in the corners to preserve the canvas size
                var tempColor = getSolidColor(0, 0, 0);
                sourceDoc.selection.select([[0, 0], [1, 0], [1, 1], [0, 1]]);
                sourceDoc.selection.fill(tempColor);
                
                var wPx = sourceDoc.width.value;
                var hPx = sourceDoc.height.value;
                sourceDoc.selection.select([[wPx - 1, hPx - 1], [wPx, hPx - 1], [wPx, hPx], [wPx - 1, hPx]]);
                sourceDoc.selection.fill(tempColor);
                sourceDoc.selection.deselect();
                
                bgLayer.opacity = 1; // Make the points nearly transparent (1%)
            }

            // Merge the texture layer with the background/anchor layer to ensure full coverage
            merged = merged.merge();

            if (doInvert) {
                try { merged.invert(); } catch (err) {}
            }

            sourceDoc.activeLayer = merged;
            sourceDoc.selection.selectAll();
            sourceDoc.selection.copy();

            sourceDoc.activeHistoryState = originalHistory;
            sourceDoc.selection.deselect();

            return true;
        } catch (e) {
            if (originalHistory) {
                try { sourceDoc.activeHistoryState = originalHistory; } catch(err) {}
            }
            return false;
        }
    }

    function getExportPath(doc) {
        var prefFile = new File(CONFIG.PREF_FILE_PATH);
        if (prefFile.exists) {
            prefFile.open("r");
            var savedPath = prefFile.read();
            prefFile.close();
            if (Folder(savedPath).exists) return Folder(savedPath);
        }

        try {
            return doc.path;
        } catch (e) {
            return Folder.selectDialog("Unsaved PSD! Please select an export directory:");
        }
    }

    function saveLastPath(folderObj) {
        var prefFile = new File(CONFIG.PREF_FILE_PATH);
        prefFile.open("w");
        prefFile.write(folderObj.fsName);
        prefFile.close();
    }

    function setActiveDocument(doc) {
        app.activeDocument = doc;
    }

    function fillCurrentSelection(doc, colorObj) {
        doc.selection.selectAll();
        doc.selection.fill(colorObj);
        doc.selection.deselect();
    }

    function getSolidColor(r, g, b) {
        var color = new SolidColor();
        color.rgb.red = r;
        color.rgb.green = g;
        color.rgb.blue = b;
        return color;
    }

})();