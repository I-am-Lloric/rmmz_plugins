//=============================================================================
// RPG Maker MZ - Magic Chests
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Chest storage for items. Insert items into 'slots' to access different sets of items in storage.
 * @author Lloric
 * 
 * @param keyDisplayStyle
 * @text Key Display Style
 * @type select
 * @option Name Only
 * @value nameOnly
 * @option Icon Only
 * @value iconOnly
 * @option Name and Icon
 * @value nameAndIcon
 * @default iconOnly
 * @desc How are the keys displayed in the command menu? Name only, Icon only or Both.
 *
 * @param keysPerChest
 * @text Keys Per Chest
 * @type number
 * @default 3
 * @desc How many keys a chest can have for determining the inventory inside
 * @min 1
 * @max 99
 * 
 * @param commandsPerRow
 * @text Commands Per Row
 * @type number
 * @default 4
 * @desc How many keys are displayed on one row in the command menu PLUS the items command
 * @min 1
 * @max 99
 *
 * @param inventoryCommandName
 * @text Inventory Command Name
 * @type text
 * @default Inventory
 * @desc The label for the party inventory.
 *
 * @param chestInventoryCommandName
 * @text Chest Inventory Command Name
 * @type text
 * @default Chest
 * @desc The label for the chest inventory.
 * 
 * @command openChestWithId
 * @text OpenChestWithId
 * @desc Open a magic chest with the given ID
 * @arg chestId
 * @text Chest Id
 * @type number
 * @default 0
 * @desc The number to pass to the scene.
 * 
 * @help MagicChests.js
 *
 * This plugin offers the player a way to store items in chests.
 * The player can enter a number of items into slots in the chest and it will display a different inventory based on those items.
 * Two chests in different parts of the world can display the same inventory of items if they have the same slotted items.
 *
 */

(() => {
    // Get the parameters
    var parameters = PluginManager.parameters("MagicChests");
    var keysPerChest = Number(parameters.keysPerChest) || 1;
    var commandsPerRow = Number(parameters.commandsPerRow) || 1;
    var inventoryCommandName = parameters.inventoryCommandName || "Inventory";
    var chestInventoryCommandName = parameters.chestInventoryCommandName || "Chest";

    const nameOnly = "nameOnly";
    const iconOnly = "iconOnly";
    const nameAndIcon = "nameAndIcon";
    var keyDisplayStyle = parameters.keyDisplayStyle || iconOnly;



    // Register the plugin command
    PluginManager.registerCommand("MagicChests", "openChestWithId", function (args) {
        var chestId = Number(args.chestId); // Convert the argument to an integer
        SceneManager.push(Scene_MagicChest.bind(this, chestId)); // Pass the number to the scene
    });

    var MagicChestData = MagicChestData || {};
    MagicChestData.chests = MagicChestData.chests || {};
    MagicChestData.items = MagicChestData.items || {};

    // .chests
    // This holds the keys used to determine which inventory to show

    // .items
    // This holds an array of keys and an array of items

    //-----------------------------------------------------------------------------
    // Scene_MagicChest
    //
    // The scene class of the item screen.

    function Scene_MagicChest() {
        this.initialize(...arguments);
    }

    Scene_MagicChest.prototype = Object.create(Scene_ItemBase.prototype);
    Scene_MagicChest.prototype.constructor = Scene_MagicChest;

    Scene_MagicChest.prototype.initialiseChest = function (chestId) {
        if (MagicChestData.chests[chestId] === undefined) {
            const keyArray = Array(keysPerChest).fill(null);
            const key = this.createKey(keyArray);
            MagicChestData.chests[this._chestId] = {
                key: key,
                keyArray: keyArray,
            }
        }
    }

    Scene_MagicChest.prototype.initialiseChestInventory = function (key) {
        if (MagicChestData.items[key] === undefined) {
            MagicChestData.items[key] = {
                key: key,
                inventory: {}
            }
        }
    }

    Scene_MagicChest.prototype.createKey = function (keyArray) {
        let key = "";
        for (let i = 0; i < keyArray.length; i++) {
            const magicChestKey = keyArray[i];
            console.log(magicChestKey);
            key += this.createItemIdentifier(magicChestKey);
        }
        return key;
    }

    Scene_MagicChest.prototype.createItemIdentifier = function (item) {
        if (item === null) {
            return "null0";
        }

        let dataClass = this.getDataClassFromItem(item);

        return `${dataClass}${item.id}`;
    }

    Scene_MagicChest.prototype.getDataClassFromItem = function (item) {
        let dataClass = "";
        if (DataManager.isItem(item)) dataClass = "item";
        if (DataManager.isWeapon(item)) dataClass = "weapon";
        if (DataManager.isArmor(item)) dataClass = "armor";
        return dataClass;
    }


    Scene_MagicChest.prototype.addItemToMagicChest = function (item, quantity) {
        const key = MagicChestData.chests[this._chestId].key;

        // Check if a record already exists for this item.
        const itemIdentifier = this.createItemIdentifier(item);
        if (MagicChestData.items[key].inventory[itemIdentifier] === undefined) {
            MagicChestData.items[key].inventory[itemIdentifier] = {
                itemIdentifier: itemIdentifier,
                itemDataClass: this.getDataClassFromItem(item),
                itemId: item.id,
                quantity: 0,
                item: item,
            }
        }

        MagicChestData.items[key].inventory[itemIdentifier].quantity += quantity;
    }

    Scene_MagicChest.prototype.getMagicChestWithId = function (chestId) {
        return MagicChestData.chests[chestId];
    }

    Scene_MagicChest.prototype.getMagicChestInventoryWithkey = function (key) {
        return MagicChestData.items[key];
    }

    // Return the number of items that were NOT removed from the magic chest
    Scene_MagicChest.prototype.removeItemFromMagicChest = function (item, quantity) {
        const key = MagicChestData.chests[this._chestId].key;

        // Check if a record exists for this item
        const itemIdentifier = this.createItemIdentifier(item);
        if (MagicChestData.items[key].inventory[itemIdentifier] === undefined) {
            return quantity;
        }

        const quantityInMagicChest = MagicChestData.items[key].inventory[itemIdentifier].quantity;
        if (quantityInMagicChest <= quantity) {
            MagicChestData.items[key].inventory[itemIdentifier].quantity -= quantityInMagicChest;
            delete MagicChestData.items[key].inventory[itemIdentifier];
            return quantity - quantityInMagicChest;
        }

        MagicChestData.items[key].inventory[itemIdentifier].quantity -= quantity;
        return 0;
    }

    Scene_MagicChest.prototype.getQuantityOfItemInMagicChest = function (item) {
        const key = MagicChestData.chests[this._chestId].key;
        const itemIdentifier = this.createItemIdentifier(item);
        return MagicChestData.items[key].inventory[itemIdentifier].quantity;
    }

    Scene_MagicChest.prototype.getMagicChestInventoryAsArray = function () {
        const key = MagicChestData.chests[this._chestId].key;
        const chestInventory = MagicChestData.items[key].inventory;

        let itemArray = [];
        for (var itemIdentifier in chestInventory) {
            const itemId = chestInventory[itemIdentifier].itemId;
            if (chestInventory[itemIdentifier].itemDataClass == "item") {
                itemArray.push($dataItems[itemId]);
            }
            if (chestInventory[itemIdentifier].itemDataClass == "weapon") {
                itemArray.push($dataWeapons[itemId]);
            }
            if (chestInventory[itemIdentifier].itemDataClass == "armor") {
                itemArray.push($dataArmors[itemId]);
            }
        }

        return itemArray;
    }

    Scene_MagicChest.prototype.initialize = function (chestId) {
        Scene_ItemBase.prototype.initialize.call(this);

        this._chestId = chestId;

        this.initialiseChest(this._chestId);
        const key = MagicChestData.chests[this._chestId].key;
        this.initialiseChestInventory(key);

        var allItems = $gameParty.allItems();
        for (let i = 0; i < allItems.length; i++) {
            const item = allItems[i];
            let isMagicChestKey = item.meta.magicChestKey ?? false;
        }
    };

    Scene_MagicChest.prototype.chestId = function () {
        return this._chestId;
    }

    Scene_MagicChest.prototype.create = function () {
        Scene_ItemBase.prototype.create.call(this);
        this.createHelpWindow();
        this.createCommandWindow();
        this.createItemWindow();
    };

    Scene_MagicChest.prototype.createCommandWindow = function () {
        const rect = this.commandWindowRect();
        this._commandWindow = new Window_MagicChestCommand(rect, this);
        this._commandWindow.setHelpWindow(this._helpWindow);
        this._commandWindow.setHandler("ok", this.onCommandOk.bind(this));
        this._commandWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(this._commandWindow);
    };

    Scene_MagicChest.prototype.commandWindowRect = function () {
        const wx = 0;
        const wy = this.mainAreaTop();
        const ww = Graphics.boxWidth;
        const wh = this.calcWindowHeight(1, true);
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_MagicChest.prototype.createItemWindow = function () {
        const rect = this.itemWindowRect();
        this._itemWindow = new Window_MagicChestItemList(rect, this);
        this._itemWindow.setHelpWindow(this._helpWindow);
        this._itemWindow.setHandler("ok", this.onItemOk.bind(this));
        this._itemWindow.setHandler("cancel", this.onItemCancel.bind(this));
        this.addWindow(this._itemWindow);
        this._commandWindow.setItemWindow(this._itemWindow);
    };

    Scene_MagicChest.prototype.itemWindowRect = function () {
        const wx = 0;
        const wy = this._commandWindow.y + this._commandWindow.height;
        const ww = Graphics.boxWidth;
        const wh = this.mainAreaBottom() - wy;
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_MagicChest.prototype.onCommandOk = function () {
        this._itemWindow.select(0);
        this._itemWindow.activate();
    };

    Scene_MagicChest.prototype.onItemOk = function () {
        const item = this.item();
        const commandSymbol = this._commandWindow.currentSymbol();

        switch (commandSymbol) {
            case "magicChestKey":
                // Update keyArray for chest with ID
                // Remove item from player inventory
                const commandIndex = this._commandWindow.index();

                // Check if an item is already in this array slot
                // As we may have to return an item to the player's inventory
                let chest = this.getMagicChestWithId(this.chestId());
                const currentSlotItem = chest.keyArray[commandIndex];
                if (currentSlotItem != null) {
                    $gameParty.gainItem(currentSlotItem, 1);
                }

                // Then remove the new item from the inventory
                $gameParty.loseItem(item, 1);

                // Update the keyArray for the chest to include the new item
                chest.keyArray[commandIndex] = item;
                chest.key = this.createKey(chest.keyArray);

                // Attempt to initialise a chest inventory for the new key setup
                this.initialiseChestInventory(chest.key);

                // Redraw item and command windows
                this._itemWindow.refresh();
                this._commandWindow.refresh();

                this._itemWindow.activate();
                break;
            case "inventory":
                // Add item to chest inventory, remove from player inventory
                this.addItemToMagicChest(item, 1);

                $gameParty.loseItem(item, 1);

                this._itemWindow.refresh();
                this._itemWindow.activate();
                break;
            case "chest":
                // Add item to player inventory, remove from chest inventory
                const remaining = this.removeItemFromMagicChest(item, 1);
                $gameParty.gainItem(item, 1); // TODO: Factor in only granting the player the quantity removed from storage, not just ALL the requested amount.

                this._itemWindow.refresh();
                this._itemWindow.activate();
                break;
            default:
                break;
        }

        // TODO : Add a sound effect when switching items to/from inventories and also when setting a key


    };

    Scene_MagicChest.prototype.onItemCancel = function () {
        this._itemWindow.deselect();
        this._commandWindow.activate();
    };

    //-----------------------------------------------------------------------------
    // Window_MagicChestKeys
    //
    // The window for selecting a category of items on the item and shop screens.

    function Window_MagicChestCommand() {
        this.initialize(...arguments);
    }

    Window_MagicChestCommand.prototype = Object.create(Window_HorzCommand.prototype);
    Window_MagicChestCommand.prototype.constructor = Window_MagicChestCommand;

    Window_MagicChestCommand.prototype.initialize = function (rect, scene) {
        this._scene = scene;
        Window_HorzCommand.prototype.initialize.call(this, rect);
    };

    Window_MagicChestCommand.prototype.maxCols = function () {
        return commandsPerRow;
    };

    Window_MagicChestCommand.prototype.update = function () {
        Window_HorzCommand.prototype.update.call(this);
        if (this._itemWindow) {
            this._itemWindow.setCategory(this.currentSymbol());
        }
    };

    Window_MagicChestCommand.prototype.drawItem = function (index) {
        const rect = this.itemLineRect(index);
        const align = this.itemTextAlign();
        this.resetTextColor();
        this.changePaintOpacity(this.isCommandEnabled(index));

        let commandText = this.commandName(index);
        let iconMatch = commandText.match(/\\i\[(\d+)\]/);
        let xOffset = 0;
        if (iconMatch) {
            let iconIndex = Number(iconMatch[1]);
            commandText = commandText.replace(/\\i\[\d+\]/, "").trim();
            xOffset = ImageManager.standardIconWidth + 4;

            let iconX = rect.x;
            if (keyDisplayStyle == iconOnly) {
                console.log(ImageManager.standardIconWidth);
                iconX = rect.x + (rect.width / 2) - (ImageManager.standardIconWidth / 2);
            }
            this.drawIcon(iconIndex, iconX, rect.y + 2);
        }

        this.drawText(commandText, rect.x + xOffset, rect.y, rect.width, align);
    };

    Window_MagicChestCommand.prototype.makeCommandList = function () {
        // Grab the current keys associated with the chest
        const keyArray = MagicChestData.chests[this._scene.chestId()].keyArray;

        for (let i = 0; i < keyArray.length; i++) {
            const key = keyArray[i];

            let keyName = "";
            if (key !== null) {
                switch (keyDisplayStyle) {
                    case nameOnly:
                        keyName = key.name;
                        break;
                    case iconOnly:
                        keyName = `\\i[${key.iconIndex}]`;
                        break;
                    case nameAndIcon:
                        keyName = `\\[${key.iconIndex}] ${key.name}`;
                        break;
                    default:
                        break;
                }
            }

            this.addCommand(keyName, "magicChestKey");
        }

        this.addCommand(inventoryCommandName, "inventory");
        this.addCommand(chestInventoryCommandName, "chest");
    };

    Window_MagicChestCommand.prototype.setItemWindow = function (itemWindow) {
        this._itemWindow = itemWindow;
    };

    Window_MagicChestCommand.prototype.needsSelection = function () {
        return this.maxItems() >= 2;
    };


    //-----------------------------------------------------------------------------
    // Window_MagicChestItemList
    //
    // The window for selecting an equipment item on the equipment screen.

    function Window_MagicChestItemList() {
        this.initialize(...arguments);
    }

    Window_MagicChestItemList.prototype = Object.create(Window_ItemList.prototype);
    Window_MagicChestItemList.prototype.constructor = Window_MagicChestItemList;

    Window_MagicChestItemList.prototype.initialize = function (rect, scene) {
        this._scene = scene;
        Window_ItemList.prototype.initialize.call(this, rect);
    };

    Window_MagicChestItemList.prototype.includes = function (item) {
        switch (this._category) {
            case "magicChestKey":
                if (item) {
                    return item.meta.magicChestKey;
                }
                return false;
            case "inventory":
            case "chest":
                if (item) {
                    return true;
                }
                return false;
            default:
                return false;
        }
    };

    Window_MagicChestItemList.prototype.makeItemList = function () {

        switch (this._category) {
            case "chest":
                this._data = this._scene.getMagicChestInventoryAsArray().filter(item => this.includes(item));

                if (this.includes(null)) {
                    this._data.push(null);
                }
                break;
            case "magicChestKey":
                this._data = $gameParty.allItems().filter(item => this.includes(item));
                this._data.push(null);
                break;
            case "inventory":
            default:
                this._data = $gameParty.allItems().filter(item => this.includes(item));
                if (this.includes(null)) {
                    this._data.push(null);
                }
        }

        Window_MagicChestItemList.prototype.isEnabled = function (item) {
            if (this._category == "magicChestKey") {
                return true;
            }

            return item;
        };

        Window_MagicChestItemList.prototype.drawItemNumber = function (item, x, y, width) {
            if (this.needsNumber()) {
                switch (this._category) {
                    case "chest":
                        const quantity = this._scene.getQuantityOfItemInMagicChest(item);
                        this.drawText(":", x, y, width - this.textWidth("00"), "right");
                        this.drawText(quantity, x, y, width, "right");
                        break;
                    case "inventory":
                    case "magicChestKey":
                        this.drawText(":", x, y, width - this.textWidth("00"), "right");
                        this.drawText($gameParty.numItems(item), x, y, width, "right");
                        break;
                }
            }
        };

    };

    // SAVE
    var _DataManager_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function () {
        var contents = _DataManager_makeSaveContents.call(this);
        contents.magicChestData = MagicChestData;
        return contents;
    };

    // LOAD
    var _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function (contents) {
        _DataManager_extractSaveContents.call(this, contents);
        if (contents.magicChestData) {
            MagicChestData = contents.magicChestData;
        }

        this.assignItemsToMagicChestData();
    };

    DataManager.assignItemsToMagicChestData = function () {

        const inventoryKeys = Object.keys(MagicChestData.items);
        for (let i = 0; i < inventoryKeys.length; i++) {
            const inventoryKey = inventoryKeys[i];
            const magicChestDataItem = MagicChestData.items[inventoryKey];
            const itemKeys = Object.keys(magicChestDataItem.inventory);

            for (let x = 0; x < itemKeys.length; x++) {
                const itemKey = itemKeys[x];
                const dataClass = MagicChestData.items[inventoryKey].inventory[itemKey].dataClass;
                switch (dataClass) {
                    case "item":
                        MagicChestData.items[inventoryKey].inventory[itemKey].item = $dataItems[item.itemId];
                        break;
                    case "weapon":
                        MagicChestData.items[inventoryKey].inventory[itemKey].item = $dataWeapons[item.itemId];
                        break;
                    case "armor":
                        MagicChestData.items[inventoryKey].inventory[itemKey].item = $dataArmors[item.itemId];
                        break;
                    default:
                        break;
                }
            }
        }
    }

})();