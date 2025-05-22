//=============================================================================
// RPG Maker MZ - Substitute Inventory
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Entire inventories can be swapped in or out with a plugin command.
 * @author Lloric
 * 
 * @command setActiveInventory
 * @text Set Active Inventory
 * @desc Set the active inventory
 *
 * @arg inventoryId
 * @type number
 * @default -1
 * @text Inventory ID
 * @desc The inventory ID to switch to. (-1 is the default inventory)
 * 
 * @help
 * 
 */

(() => {
    'use strict';

    var SubstituteInventory = SubstituteInventory || {};
    SubstituteInventory.data = {};
    SubstituteInventory.activeInventoryId = "-1";

    SubstituteInventory.save = function (inventoryId) {
        SubstituteInventory.data[inventoryId] = {};

        SubstituteInventory.data[inventoryId].items = $gameParty._items;
        SubstituteInventory.data[inventoryId].weapons = $gameParty._weapons;
        SubstituteInventory.data[inventoryId].armors = $gameParty._armors;
    }

    SubstituteInventory.load = function (inventoryId) {
        SubstituteInventory.activeInventoryId = inventoryId;

        const inventoryData = SubstituteInventory.data[inventoryId];
        if (!inventoryData) {
            $gameParty._items = {};
            $gameParty._weapons = {};
            $gameParty._armors = {};
        } else {
            $gameParty._items = inventoryData.items;
            $gameParty._weapons = inventoryData.weapons;
            $gameParty._armors = inventoryData.armors;
        }
    }

    const pluginName = "SubstituteInventory";

    PluginManager.registerCommand(pluginName, "setActiveInventory", args => {
        const inventoryId = Number(args.inventoryId || -1);

        if (SubstituteInventory.activeInventoryId === inventoryId) return;

        // Save the currently active inventory
        SubstituteInventory.save(SubstituteInventory.activeInventoryId);

        // Load the new inventory
        SubstituteInventory.load(inventoryId);
    });

    //----------------------------------
    // DataManager
    //

    const Llo_SubInv_DataManager_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function () {
        const contents = Llo_SubInv_DataManager_makeSaveContents.call(this);
        contents.substituteInventories = SubstituteInventory.data;
        contents.activeInventoryId = SubstituteInventory.activeInventoryId;
        return contents;
    };

    const Llo_SubInv_DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function (contents) {
        Llo_SubInv_DataManager_extractSaveContents.call(this, contents);
        SubstituteInventory.data = contents.substituteInventories;
        SubstituteInventory.activeInventoryId = contents.activeInventoryId;
    };

})();
