//=============================================================================
// RPG Maker MZ - Furnace Crafting
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Smelt items into other items, consuming fuel in the process.
 * @author Lloric
 *
 * @help FurnaceCrafting.js
 *
 * This plugin provides a way for players to craft items using items and fuel to produce other items.
 *
 * @param numberOfAllowedCharactersInItemName
 * @text Number of Allowed Characters In Item Name
 * @type number
 * @desc The number of characters in an item's name that will be displayed before truncating.
 * @default 13
 *
 * @param furnaceTickInterval
 * @text Furnace Tick Interval
 * @type number
 * @desc How often a furnace tick occurs (in ms)
 * @default 1000
 * 
 * @param truncatedNameAppendage
 * @text Truncated Name Appendage
 * @type text
 * @desc The text that is added to an item's name when it has been truncated.
 * @default ..
 * 
 * @param blacklistedFurnaceTickScenes
 * @text Blacklisted Furnace Tick Scenes
 * @type text[]
 * @desc The furnace will not function on these scenes. (format as Scene_Title, Scene_Save etc)
 * @default ["Scene_Title", "Scene_Save", "Scene_Load", "Scene_Boot", "Scene_Splash"]
 * 
 * @command OpenFurnaceScene
 * @text OpenFurnaceScene
 * @desc Opens the furnace scene to smelt items.
 *
 * @arg furnaceId
 * @text Furnace ID
 * @type number
 * @desc The ID of the furnace being used.
 * @default 0
 */

(() => {
    const pluginName = "FurnaceCrafting";
    const parameters = PluginManager.parameters(pluginName);

    // Parameters
    const numberOfAllowedCharactersInItemName = Number(parameters.numberOfAllowedCharactersInItemName) || 99;
    const truncatedNameAppendage = parameters.truncatedNameAppendage || "..";
    const furnaceTickInterval = Number(parameters.furnaceTickInterval) || 1000;

    // Access and parse the array of blacklisted scenes parameter
    let blacklistedFurnaceTickScenes = [];
    try {
        blacklistedFurnaceTickScenes = JSON.parse(parameters.blacklistedFurnaceTickScenes || '["Scene_Title", "Scene_Save", "Scene_Load", "Scene_Boot", "Scene_Splash"]');
        if (!Array.isArray(blacklistedFurnaceTickScenes)) {
            throw new Error("Parameter is not an array");
        }
    } catch (e) {
        console.warn(`Failed to parse blacklistedFurnaceTickScenes: ${e.message}. Using default.`);
        blacklistedFurnaceTickScenes = ["Scene_Title", "Scene_Save", "Scene_Load", "Scene_Boot", "Scene_Splash"]; // Fallback
    }



    // Plugin Commands
    PluginManager.registerCommand("FurnaceCrafting", "OpenFurnaceScene", function (args) {
        // Extract parameters
        const furnaceId = Number(args.furnaceId);

        // Push the custom scene to the scene manager
        SceneManager.push(Scene_Furnace.bind(this, furnaceId));

    });

    var FurnaceData = FurnaceData || {};
    FurnaceData.furnaces = FurnaceData.furnaces || {};

    FurnaceData.furnaceRecipeItemRegex = /<furnaceRecipeItem\s*:\s*([IiAaWw])(\d+)\s*,\s*(\d+)>/gi;
    FurnaceData.furnaceRecipeItemBreakdownRegex = /<furnaceRecipeItem:([IiAaWw])(\d+),(\d+)>/;

    //-----------------------------------------------------------------------------
    // Scene_Furnace
    //
    // The scene class of the item screen.

    function Scene_Furnace() {
        this.initialize(...arguments);
    }

    Scene_Furnace.prototype = Object.create(Scene_ItemBase.prototype);
    Scene_Furnace.prototype.constructor = Scene_Furnace;

    Scene_Furnace.prototype.initialize = function (furnaceId) {
        Scene_ItemBase.prototype.initialize.call(this);

        this._furnaceId = furnaceId;

        this.initialiseFurnaceData();
    };

    Scene_Furnace.prototype.initialiseFurnaceData = function () {
        FurnaceData.initialiseFurnace(this._furnaceId);
    }

    Scene_Furnace.prototype.create = function () {
        Scene_ItemBase.prototype.create.call(this);
        this.createHelpWindow();
        this.createCategoryWindow();
        this.createDisplayWindow();
        this.createItemWindow();
    };

    Scene_Furnace.prototype.createCategoryWindow = function () {
        const rect = this.categoryWindowRect();
        this._categoryWindow = new Window_FurnaceCommand(rect);
        this._categoryWindow.setHelpWindow(this._helpWindow);
        this._categoryWindow.setHandler("ok", this.onCategoryOk.bind(this));
        this._categoryWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(this._categoryWindow);
    };

    Scene_Furnace.prototype.categoryWindowRect = function () {
        const wx = 0;
        const wy = this.mainAreaTop();
        const ww = Graphics.boxWidth;
        const wh = this.calcWindowHeight(1, true);
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Furnace.prototype.createItemWindow = function () {
        const rect = this.itemWindowRect();
        this._itemWindow = new Window_FurnaceItemList(rect, this);
        this._itemWindow.setHelpWindow(this._helpWindow);
        this._itemWindow.setHandler("ok", this.onItemOk.bind(this));
        this._itemWindow.setHandler("cancel", this.onItemCancel.bind(this));
        this.addWindow(this._itemWindow);
        this._categoryWindow.setItemWindow(this._itemWindow);

        this._itemWindow.y += this._displayWindow.height;
        this._itemWindow.height -= this._displayWindow.height;
    };

    Scene_Furnace.prototype.itemWindowRect = function () {
        const wx = 0;
        const wy = this._categoryWindow.y + this._categoryWindow.height;
        const ww = Graphics.boxWidth;
        const wh = this.mainAreaBottom() - wy;
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Furnace.prototype.user = function () {
        const members = $gameParty.movableMembers();
        const bestPha = Math.max(...members.map(member => member.pha));
        return members.find(member => member.pha === bestPha);
    };

    Scene_Furnace.prototype.onCategoryOk = function () {
        this._itemWindow.activate();
        this._itemWindow.selectLast();
    };

    Scene_Furnace.prototype.onItemOk = function () {
        console.log(this.item());
        console.log(this._categoryWindow.currentSymbol());

        const category = this._categoryWindow.currentSymbol();
        if (category === "fuel") {
            this.selectFuel(this.item());
            return;
        }

        if (category === "input") {
            this.selectInput(this.item());
            return;
        }

        if (category === "output") {
            this.selectOutput(this.item());
            return;
        }
    };

    Scene_Furnace.prototype.getFurnaceData = function () {
        return FurnaceData.furnaces[this._furnaceId];
    }

    Scene_Furnace.prototype.selectOutput = function (item) {
        let furnaceData = this.getFurnaceData();

        $gameParty.gainItem(item, 1);

        const itemIdentifier = FurnaceData.generateItemIdentifier(item);
        furnaceData['outputItems'][itemIdentifier].quantity -= 1;

        if (furnaceData['outputItems'][itemIdentifier].quantity === 0) {
            delete furnaceData['outputItems'][itemIdentifier];
            furnaceData['refreshRequired'] = true;
        }

        this._itemWindow.refresh();
        this._itemWindow.activate();

        if (this._itemWindow.item() === undefined) {
            this._itemWindow.selectLast();
        }

    }

    Scene_Furnace.prototype.selectInput = function (item) {
        let furnaceData = this.getFurnaceData();

        if (item === furnaceData['inputItem'].item) {
            // the new input item is the SAME as the existing input item
            // just remove the item from the inventory and add 1 to the input item quantity
            $gameParty.loseItem(item, 1);
            furnaceData['inputItem'].quantity += 1;
        } else {
            // the new input item is DIFFERENT
            if (furnaceData['inputItem'].item !== null) {
                $gameParty.gainItem(furnaceData['inputItem'].item, furnaceData['inputItem'].quantity);
                FurnaceData.resetInputItemToNull(furnaceData);
            }

            if (item) {
                FurnaceData.addItemToInput(furnaceData, item);
                $gameParty.loseItem(item, 1);
            }
        }

        this._itemWindow.refresh();
        this._itemWindow.activate();

        if (this._itemWindow.item() === undefined) {
            this._itemWindow.selectLast();
        }

        this._displayWindow.refreshFurnaceData(furnaceData);
    }

    Scene_Furnace.prototype.selectFuel = function (item) {
        let furnaceData = this.getFurnaceData();

        if (item === furnaceData['fuelItem'].item) {
            // the new fuel type is the SAME as the existing fuel type
            // just remove the item from the inventory and add 1 to the fuel quantity
            $gameParty.loseItem(item, 1);
            furnaceData['fuelItem'].quantity += 1;
        } else {
            // the new fuel is DIFFERENT
            // attempt to return any current fuel items back to the inventory
            // then update the fuel item to reflect the new item
            if (furnaceData['fuelItem'].item !== null) {
                $gameParty.gainItem(furnaceData['fuelItem'].item, furnaceData['fuelItem'].quantity);
                FurnaceData.resetFuelItemToNull(furnaceData);
            }

            if (item) {
                FurnaceData.addItemToFuel(furnaceData, item);
                $gameParty.loseItem(item, 1);
            }
        }

        this._itemWindow.refresh();
        this._itemWindow.activate();

        if (this._itemWindow.item() === undefined) {
            this._itemWindow.selectLast();
        }

        this._displayWindow.refreshFurnaceData(furnaceData);
    }

    Scene_Furnace.prototype.onItemCancel = function () {
        if (this._categoryWindow.needsSelection()) {
            this._itemWindow.deselect();
            this._categoryWindow.activate();
        } else {
            this.popScene();
        }
    };

    Scene_Furnace.prototype.playSeForItem = function () {
        SoundManager.playUseItem();
    };

    Scene_Furnace.prototype.useItem = function () {
        Scene_ItemBase.prototype.useItem.call(this);
        this._itemWindow.redrawCurrentItem();
    };

    Scene_Furnace.prototype.createDisplayWindow = function () {
        const rect = this.displayWindowRect();
        this._displayWindow = new Window_FurnaceDisplay(rect);
        this.addWindow(this._displayWindow);

        const furnaceData = this.getFurnaceData();
        this._displayWindow.refreshFurnaceData(furnaceData);
    };

    Scene_Furnace.prototype.displayWindowRect = function () {
        const wx = 0;
        const wy = this._categoryWindow.y + this._categoryWindow.height;
        const ww = Graphics.boxWidth;
        const wh = this.calcWindowHeight(1, true);
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Furnace.prototype.update = function () {
        Scene_Base.prototype.update.call(this);

        let furnaceData = this.getFurnaceData();
        if (furnaceData['refreshRequired']) {
            furnaceData['refreshRequired'] = false;
            this._displayWindow.refreshFurnaceData(furnaceData);
            this._itemWindow.refresh();
        }
    };


    //-----------------------------------------------------------------------------
    // Window_FurnaceCommand
    //
    // The window for selecting a category of items on the item and shop screens.

    function Window_FurnaceCommand() {
        this.initialize(...arguments);
    }

    Window_FurnaceCommand.prototype = Object.create(Window_HorzCommand.prototype);
    Window_FurnaceCommand.prototype.constructor = Window_FurnaceCommand;

    Window_FurnaceCommand.prototype.initialize = function (rect) {
        Window_HorzCommand.prototype.initialize.call(this, rect);
    };

    Window_FurnaceCommand.prototype.maxCols = function () {
        return 3;
    };

    Window_FurnaceCommand.prototype.update = function () {
        Window_HorzCommand.prototype.update.call(this);
        if (this._itemWindow) {
            this._itemWindow.setCategory(this.currentSymbol());
        }
    };

    Window_FurnaceCommand.prototype.makeCommandList = function () {
        this.addCommand("Fuel", "fuel");
        this.addCommand("Input", "input");
        this.addCommand("Output", "output");
    };

    Window_FurnaceCommand.prototype.setItemWindow = function (itemWindow) {
        this._itemWindow = itemWindow;
    };

    Window_FurnaceCommand.prototype.needsSelection = function () {
        return this.maxItems() >= 2;
    };



    //-----------------------------------------------------------------------------
    // Window_FurnaceItemList
    //
    // The window for selecting an item on the item screen.

    function Window_FurnaceItemList() {
        this.initialize(...arguments);
    }

    Window_FurnaceItemList.prototype = Object.create(Window_ItemList.prototype);
    Window_FurnaceItemList.prototype.constructor = Window_FurnaceItemList;

    Window_FurnaceItemList.prototype.initialize = function (rect, scene) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this._category = "none";
        this._data = [];
        this._scene = scene;
    };

    Window_FurnaceItemList.prototype.setCategory = function (category) {
        if (this._category !== category) {
            this._category = category;
            this.refresh();
            this.scrollTo(0, 0);
        }
    };

    Window_FurnaceItemList.prototype.includes = function (item) {
        switch (this._category) {
            case "fuel":
                if (!item) return false;
                return item.meta.fuel !== undefined;
            case "input":
                if (!item) return false;
                return item.meta.furnaceRecipeCost !== undefined;
            case "output":
                return true;
            default:
                return false;
        }
    };

    Window_FurnaceItemList.prototype.isEnabled = function (item) {
        if (this._category === "fuel" || this._category === "input") {
            return true;
        }

        return item;
    };

    Window_FurnaceItemList.prototype.makeItemList = function () {
        this._data = [];
        if (this._category === "fuel" || this._category === "input") {
            this._data = $gameParty.allItems().filter(item => this.includes(item));
            this._data.push(null);
            return;
        }

        // Output item list
        // (Taken from furnaceData)
        const furnaceData = this._scene.getFurnaceData();
        const outputItemKeys = Object.keys(furnaceData['outputItems']);

        let outputItemArray = [];
        for (let i = 0; i < outputItemKeys.length; i++) {
            const outputItemAndQuantity = furnaceData['outputItems'][outputItemKeys[i]];
            const outputItem = outputItemAndQuantity.item;
            outputItemArray.push(outputItem);
        }

        this._data = outputItemArray.filter(item => this.includes(item));
    };

    Window_FurnaceItemList.prototype.drawItemNumber = function (item, x, y, width) {
        if (this.needsNumber()) {
            this.drawText(":", x, y, width - this.textWidth("00"), "right");
            if (this._category === "output") {
                const furnaceData = this._scene.getFurnaceData();
                const quantity = FurnaceData.getQuantityOfOutputItem(furnaceData, item);
                this.drawText(quantity, x, y, width, "right");
            } else {
                this.drawText($gameParty.numItems(item), x, y, width, "right");
            }
        }
    };

    //-----------------------------------------------------------------------------
    // Window_FurnaceDisplay
    //
    // The window displays the fuel item + quantity, input item + quantity, and current fuel level.

    function Window_FurnaceDisplay() {
        this.initialize(...arguments);
    }

    Window_FurnaceDisplay.prototype = Object.create(Window_Base.prototype);
    Window_FurnaceDisplay.prototype.constructor = Window_FurnaceDisplay;

    Window_FurnaceDisplay.prototype.initialize = function (rect) {
        Window_Base.prototype.initialize.call(this, rect);

    };

    Window_FurnaceDisplay.prototype.refreshFurnaceData = function (furnaceData) {
        this.contents.clear();
        this.drawFuel(furnaceData['fuelItem']);
        this.drawInput(furnaceData['inputItem']);
        this.drawFuelLevel(furnaceData['fuelLevel']);
    }

    Window_FurnaceDisplay.prototype.drawFuel = function (fuelData) {
        const w = this.getSectionWidth();
        const x = 0;
        const y = 0;

        if (!fuelData.item) return;

        const fuelName = this.getFirstXCharacters(fuelData.item.name, numberOfAllowedCharactersInItemName);
        const fuelQuantity = fuelData.quantity;
        this.drawIcon(fuelData.item.iconIndex, x, y);
        this.drawText(`${fuelName} x${fuelQuantity}`, x + ImageManager.standardIconWidth + 4, y, w, "left");
    }

    Window_FurnaceDisplay.prototype.drawInput = function (inputData) {
        const w = this.getSectionWidth();
        const x = w;
        const y = 0;

        if (!inputData.item) return;

        const itemName = this.getFirstXCharacters(inputData.item.name, numberOfAllowedCharactersInItemName);
        const itemQuantity = inputData.quantity;

        this.drawIcon(inputData.item.iconIndex, x, y);
        this.drawText(`${itemName} x${itemQuantity}`, x + ImageManager.standardIconWidth + 4, y, w, "left");
    }

    Window_FurnaceDisplay.prototype.getFirstXCharacters = function (text, numberOfCharacters) {
        let newText = text.substring(0, numberOfCharacters);
        if (newText.length != text.length) {
            newText += truncatedNameAppendage;
        }
        return newText;
    }

    Window_FurnaceDisplay.prototype.drawFuelLevel = function (fuelLevel) {
        const w = this.getSectionWidth();
        const x = w * 2;

        // TODO: Change this text to a gauge showing current fuel level vs the last fuel item's max fuel level
        this.drawText(`Fuel: ${fuelLevel}`, x, 0, w, "left");
    }

    Window_FurnaceDisplay.prototype.getSectionWidth = function () {
        return this.contentsWidth() / 3;
    }




    const SceneManager_onSceneTerminate = SceneManager.onSceneTerminate;
    SceneManager.onSceneTerminate = function () {
        SceneManager_onSceneTerminate.call(this);

        this.stopFurnaceTick();
    };

    const SceneManager_onSceneStart = SceneManager.onSceneStart;
    SceneManager.onSceneStart = function () {
        SceneManager_onSceneStart.call(this);

        if (!this.isSceneBlacklistedForFurnaceTick(this._scene)) {
            this.startFurnaceTick();
        }
    };

    SceneManager.isSceneBlacklistedForFurnaceTick = function (scene) {
        const blacklistScenes = blacklistedFurnaceTickScenes;
        for (let i = 0; i < blacklistScenes.length; i++) {
            const blacklistScene = window[blacklistScenes[i]];

            if (!blacklistScene) continue;

            if (scene instanceof blacklistScene) {
                return true;
            }
        }
        return false;
    }

    SceneManager.stopFurnaceTick = function () {
        if (FurnaceData.interval) {
            clearInterval(FurnaceData.interval);
        }
    }

    SceneManager.startFurnaceTick = function () {
        FurnaceData.interval = setInterval(() => {
            //console.log("tick");
            // Loop through each furnace

            // If the furnace runs out of fuel, check if there is an input item before adding more to the fuel level
            // If the furnace is out of fuel, has a fuel source AND there is an input item, reduce the fuel quantity and increase the fuel level

            const furnaceKeys = Object.keys(FurnaceData.furnaces);
            if (furnaceKeys.length <= 0) return;

            for (let i = 0; i < furnaceKeys.length; i++) {
                const furnaceData = FurnaceData.furnaces[furnaceKeys[i]];
                //console.log(furnaceData);
                // Attempt to reduce fuelLevel
                if (FurnaceData.isActive(furnaceData)) {
                    console.log(`Furnace ${furnaceData['furnaceId']} is active and ticked`);
                    furnaceData['fuelLevel'] -= 1;

                    if (FurnaceData.hasInput(furnaceData)) {
                        furnaceData['inputItem'].progress += 1;

                        // Check if the inputItem has enough progress to smelt into the output items
                        if (FurnaceData.isInputItemReady(furnaceData)) {
                            console.log("adding output items");
                            furnaceData['inputItem'].quantity -= 1;
                            FurnaceData.addOutputItems(furnaceData);
                            furnaceData['inputItem'].progress = 0;
                            if (furnaceData['inputItem'].quantity === 0) {
                                FurnaceData.resetInputItemToNull(furnaceData);
                            }
                        }
                    }

                    furnaceData['refreshRequired'] = true;
                    return;
                }

                // If the fuelLevel is 0 AND there is a fuel source AND there is an input item
                if (!FurnaceData.isActive(furnaceData) && FurnaceData.hasInput(furnaceData) && FurnaceData.hasFuel(furnaceData)) {
                    console.log(`Adding ${furnaceData['fuelItem'].item.meta.fuel} fuel to furnace ${furnaceData['furnaceId']}`);

                    // Check for infinite fuel source
                    if (!furnaceData['fuelItem'].item.meta.infiniteFuelSource) {
                        furnaceData['fuelItem'].quantity -= 1;
                    }

                    let fuelToAdd = Number(furnaceData['fuelItem'].item.meta.fuel);
                    if (!fuelToAdd) {
                        console.error("Tried to add fuel that was NaN");
                        fuelToAdd = 0;
                    }
                    furnaceData['fuelLevel'] += fuelToAdd;

                    if (furnaceData['fuelItem'].quantity === 0) {
                        FurnaceData.resetFuelItemToNull(furnaceData);
                    }

                    furnaceData['refreshRequired'] = true;
                    return;
                }
            };

        }, furnaceTickInterval);

    }

    FurnaceData.isActive = function (furnaceData) {
        return furnaceData['fuelLevel'] > 0;
    }

    FurnaceData.hasFuel = function (furnaceData) {
        return furnaceData['fuelItem'].item;
    }

    FurnaceData.hasInput = function (furnaceData) {
        return furnaceData['inputItem'].item;
    }

    FurnaceData.isInputItemReady = function (furnaceData) {
        const furnaceRecipeCost = Number(furnaceData['inputItem'].item.meta.furnaceRecipeCost);
        if (!furnaceRecipeCost) {
            console.error("Furnace recipe cost is NaN");
            furnaceRecipeCost = 9999;
        }
        console.log(`Is input item ready? progress: ${furnaceData['inputItem'].progress}, cost: ${furnaceRecipeCost}`);
        return furnaceData['inputItem'].progress >= furnaceRecipeCost;
    }

    FurnaceData.getQuantityOfOutputItem = function (furnaceData, item) {
        const itemIdentifier = FurnaceData.generateItemIdentifier(item);
        return furnaceData['outputItems'][itemIdentifier].quantity;
    }

    FurnaceData.addOutputItems = function (furnaceData) {
        const outputItemArray = furnaceData['inputItem'].item.furnaceRecipeOutputItems;

        if (!outputItemArray || outputItemArray.length <= 0) return;

        for (let i = 0; i < outputItemArray.length; i++) {
            const outputItem = outputItemArray[i][0];
            const outputItemQuantity = outputItemArray[i][1];

            const itemIdentifier = FurnaceData.generateItemIdentifier(outputItem);

            if (!Object.keys(furnaceData['outputItems']).includes(itemIdentifier)) {
                furnaceData['outputItems'][itemIdentifier] = {
                    itemIdentifier: itemIdentifier,
                    item: outputItem,
                    quantity: 0,
                    dataClass: FurnaceData.getDataClassFromItem(outputItem),
                    itemId: outputItem.id
                }
            }

            furnaceData['outputItems'][itemIdentifier]['quantity'] += outputItemQuantity;
        }
    }

    FurnaceData.generateItemIdentifier = function (item) {
        const dataClass = FurnaceData.getDataClassFromItem(item);
        return `${dataClass}${item.id}`;
    }

    FurnaceData.getItemFromDataclassAndId = function (dataClass, itemId) {
        if (dataClass.toLowerCase() === "i" || dataClass.toLowerCase() === "item") {
            return $dataItems[itemId];
        }
        if (dataClass.toLowerCase() === "a" || dataClass.toLowerCase() === "armor") {
            return $dataArmors[itemId];
        }
        if (dataClass.toLowerCase() === "w" || dataClass.toLowerCase() === "weapon") {
            return $dataWeapons[itemId];
        }
    }

    FurnaceData.resetFuelItemToNull = function (furnaceData) {
        furnaceData['fuelItem'] = {
            item: null,
            dataClass: null,
            itemId: null,
            quantity: 0
        };
    }

    FurnaceData.resetInputItemToNull = function (furnaceData) {
        furnaceData['inputItem'] = {
            item: null,
            dataClass: null,
            itemId: null,
            quantity: 0,
            progress: 0
        };
    }

    FurnaceData.addItemToFuel = function (furnaceData, item) {
        furnaceData['fuelItem'] = {
            item: item,
            dataClass: FurnaceData.getDataClassFromItem(item),
            itemId: item.id,
            quantity: 1
        }
    }

    FurnaceData.addItemToInput = function (furnaceData, item) {
        furnaceData['inputItem'] = {
            item: item,
            dataClass: FurnaceData.getDataClassFromItem(item),
            itemId: item.id,
            quantity: 1,
            progress: 0
        };
    }

    FurnaceData.getDataClassFromItem = function (item) {
        let dataClass = "";
        if (DataManager.isItem(item)) dataClass = "item";
        if (DataManager.isWeapon(item)) dataClass = "weapon";
        if (DataManager.isArmor(item)) dataClass = "armor";
        return dataClass;
    }

    FurnaceData.initialiseFurnace = function (furnaceId) {
        if (FurnaceData.furnaces[furnaceId] !== undefined) return;

        FurnaceData.furnaces[furnaceId] = {};

        let furnaceData = FurnaceData.furnaces[furnaceId];

        furnaceData['furnaceId'] = furnaceId;
        furnaceData['fuelLevel'] = 0;
        this.resetFuelItemToNull(furnaceData);
        this.resetInputItemToNull(furnaceData);
        furnaceData['outputItems'] = {};

        furnaceData['refreshRequired'] = false;
    }

    FurnaceData.parseMultipleNoteTags = function (item) {
        if (!item || !item.note) return;
        const matches = item.note.match(FurnaceData.furnaceRecipeItemRegex) || [];
        if (matches.length <= 0) return;

        item.furnaceRecipeOutputItems = [];
        for (let i = 0; i < matches.length; i++) {
            const match = matches[i].match(FurnaceData.furnaceRecipeItemBreakdownRegex);
            if (!match) continue;

            const dataClass = match[1];
            const itemId = Number(match[2]);
            const quantity = Number(match[3]);

            if (!itemId || !quantity) continue;

            const outputItem = FurnaceData.getItemFromDataclassAndId(dataClass, itemId);
            item.furnaceRecipeOutputItems.push([outputItem, quantity]);
        }
    }

    FurnaceData.loadFuelItem = function (furnaceData) {
        const dataClass = furnaceData['fuelItem'].dataClass;
        const itemId = furnaceData['fuelItem'].itemId;
        if (!dataClass || !itemId) {
            furnaceData['fuelItem'].item = null;
            return;
        }

        const item = FurnaceData.getItemFromDataclassAndId(dataClass, itemId);

        furnaceData['fuelItem'].item = item;
    }

    FurnaceData.loadInputItem = function (furnaceData) {
        const dataClass = furnaceData['inputItem'].dataClass;
        const itemId = furnaceData['inputItem'].itemId;
        if (!dataClass || !itemId) {
            furnaceData['inputItem'].item = null;
            return;
        }

        const item = FurnaceData.getItemFromDataclassAndId(dataClass, itemId);
        furnaceData['inputItem'].item = item;
    }

    FurnaceData.loadOutputItems = function (furnaceData) {
        const outputItemKeys = Object.keys(furnaceData['outputItems']);
        for (let i = 0; i < outputItemKeys.length; i++) {
            const outputItemData = furnaceData['outputItems'][outputItemKeys[i]];
            const dataClass = outputItemData.dataClass;
            const itemId = outputItemData.itemId;

            if (!dataClass || !itemId) {
                delete outputItemData;
                continue;
            }
            const item = FurnaceData.getItemFromDataclassAndId(dataClass, itemId);

            outputItemData.item = item;
        }

    }

    const Scene_Boot_onDatabaseLoaded = Scene_Boot.prototype.onDatabaseLoaded;
    Scene_Boot.prototype.onDatabaseLoaded = function () {
        this.parseMultipleNoteTags($dataItems);
        this.parseMultipleNoteTags($dataWeapons);
        this.parseMultipleNoteTags($dataArmors);

        Scene_Boot_onDatabaseLoaded.call(this);
    };

    Scene_Boot.prototype.parseMultipleNoteTags = function (objArray) {
        for (let i = 0; i < objArray.length; i++) {
            const data = objArray[i];
            if (!data) continue;

            FurnaceData.parseMultipleNoteTags(data);
        }
    }

    // Save
    const DataManager_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function () {
        let contents = DataManager_makeSaveContents.call(this);

        contents.furnaces = FurnaceData.furnaces;
        console.log(contents.furnaces);
        return contents;
    };

    // Load
    const DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function (contents) {
        DataManager_extractSaveContents.call(this, contents);

        FurnaceData.furnaces = contents.furnaces;
        console.log(contents.furnaces);
        this.loadFurnaceItems();
    };

    DataManager.loadFurnaceItems = function () {
        const furnaceKeys = Object.keys(FurnaceData.furnaces);
        console.log(furnaceKeys);
        for (let i = 0; i < furnaceKeys.length; i++) {
            let furnaceData = FurnaceData.furnaces[furnaceKeys[i]];
            console.log(furnaceData);
            FurnaceData.loadFuelItem(furnaceData);
            FurnaceData.loadInputItem(furnaceData);
            FurnaceData.loadOutputItems(furnaceData);
        }

    }


})();