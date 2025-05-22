//=============================================================================
// RPG Maker MZ - Substitute Inventory
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Entire inventories can be swapped in or out with a plugin command.
 * @author Lloric
 * @version 1.1.0
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
 * Either use the plugin command to change the active inventory OR use the script
 * call below;
 * $gameParty.setActiveInventory(x);
 * x = the inventoryId
 * 
 * Using the script call code allows you to use a $gameVariable or some other 
 * variable to set the active inventory.
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

    PluginManager.registerCommand(pluginName, "setActiveInventory", function (args) {
        const inventoryId = Number(args.inventoryId || -1);

        $gameParty.setActiveInventory(inventoryId);
    });

    //---------------------------------
    // Game_Party
    //

    Game_Party.prototype.setActiveInventory = function (inventoryId) {
        if (SubstituteInventory.activeInventoryId === inventoryId) return;

        // Save the currently active inventory
        SubstituteInventory.save(SubstituteInventory.activeInventoryId);

        // Load the new inventory
        SubstituteInventory.load(inventoryId);
    }

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
