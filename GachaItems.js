/*:
 * @plugindesc Gacha Items
 * @author Lloric
 *
 * @param buyText
 * @text Buy Text
 * @type text
 * @desc The text to display on the buy button.
 * @default Play
 * 
 * @param stockText
 * @text Stock Text
 * @type text
 * @desc The text to display for viewing a gacha machine's stock.
 * @default Stock
 *
 * @param outOfStockText
 * @text Out of Stock Text
 * @type text
 * @desc The text to display when a gacha machine is out of stock.
 * @default Out of Stock!
 *
 * @param stockRemainingText
 * @text Stock Remaining Text
 * @type text
 * @desc The text to display after a gacha machine's stock count (ie.  9 Remaining or 5 Left).
 * @default Left
 *
 * @param priceText
 * @text Price Text
 * @type text
 * @desc The text to display before the gacha machine's cost per play.
 * @default Cost Per Play
 * 
 * @param secretItemId
 * @text Secret Item ID
 * @type number
 * @desc When an item is 'secret' a dummy item will be shown in its place. Must be an item.
 * @default 1
 *
 * @command PrepareGachaScene
 * @text Prepare Gacha Scene
 * @desc Prepare the gacha scene, for spending gold and getting items.
 *
 * @arg gachaId
 * @text Gacha ID
 * @type number
 * @desc The ID of the gacha machine.
 * @default 0
 * 
 * @arg costPerPlay
 * @text Cost Per Play
 * @type number
 * @desc The amount of gold spent per play.
 * @default 0
 *
 * @arg gachaTitle
 * @text Gacha Title
 * @type text
 * @desc The name displayed when operating the gacha machine.
 * @default Gacha
 *
 * @help
 * Excite your players by allowing them to spend their hard-earned gold on a chance at a cool rare items.
 * Adds Gacha machines to a game. Gacha machines can hold 'an item' (weapon, armour, item).
 * Spend gold to get a random item from the machine. Set inventories.
 * 
 * To Use: Run the Plugin Command 'PrepareGachaScene' and enter your values
 * Then set up a ShopProcessing event directly after your PrepareGachaScene command.
 * The items in the ShopProcessing event will be your machine's initial stock.
 * To make an item 'secret' set the 'Specify Price' option (any price is fine)
 * 
 *
 * Terms of Use:
 * Free for commercial and non-commercial use, with credit.
 */

(function () {
    var GachaData = GachaData || {};
    GachaData.machineData = GachaData.machineData || {};

    GachaData.usingGachaMachine = false;
    GachaData.gachaId = 0;
    GachaData.gachaCost = 0;
    GachaData.gachaTitle = "";

    GachaData.doesMachineDataExist = function (gachaId) {
        return Object.keys(GachaData.machineData).includes(gachaId);
    }

    GachaData.makeGoodsArray = function (goods) {
        let goodsArray = [];
        for (let i = 0; i < goods.length; i++) {
            const good = goods[i];
            const dataClassId = good[0];
            const itemId = good[1];
            const secret = good[2];
            const index = i;
            goodsArray.push([dataClassId, itemId, secret, index]);
        }
        return goodsArray;
    }

    GachaData.getMachineData = function (gachaId) {
        return GachaData.machineData[gachaId];
    }

    GachaData.getInitialStockCount = function (gachaId) {
        return GachaData.machineData[gachaId]['initial'].length;
    }

    GachaData.getGachaStockCount = function (gachaId) {
        return GachaData.machineData[gachaId]['current'].filter(mi => mi).length;
    }

    GachaData.getArrayOfAvailableIndices = function (gachaId) {
        let indexArray = [];
        const machineData = GachaData.getMachineData(gachaId);
        for (let i = 0; i < machineData["current"].length; i++) {
            const machineItem = machineData["current"][i];
            if (machineItem) {
                indexArray.push(i);
            }
        }
        return indexArray;
    }

    GachaData.getCurrentItemArray = function (gachaId) {
        let itemArray = [];
        const machineData = GachaData.getMachineData(gachaId);
        for (let i = 0; i < machineData['current'].length; i++) {
            const machineItem = machineData['current'][i];
            const secret = machineItem[2];
            if (secret) {
                // Add a dummy item
                const item = GachaData.getItemFromDataClassAndItemId("item", secretItemId);
                itemArray.push(item);
            } else {
                const item = GachaData.getItemFromDataClassAndItemId(machineItem[0], machineItem[1]);
                itemArray.push(item);
            }
        }
        return itemArray;
    }

    GachaData.getCurrentItemQuantity = function (gachaId, item) {
        const machineData = GachaData.getMachineData(gachaId);
        return GachaData.getItemQuantity(machineData['current'], item);
    }

    GachaData.getInitialItemQuantity = function (gachaId, item) {
        const machineData = GachaData.getMachineData(gachaId);
        return GachaData.getItemQuantity(machineData['initial'], item);
    }


    GachaData.getItemQuantity = function (machineDataArray, item) {
        const dataClass = GachaData.getDataClassFromItem(item);
        const itemId = item.id;

        let quantity = 0;
        for (let i = 0; i < machineDataArray.length; i++) {
            const machineItem = machineDataArray[i];
            if (machineItem[0] === dataClass && machineItem[1] === itemId) {
                quantity++;
            }
        }

        return quantity;
    }

    GachaData.getInitialItemArray = function (gachaId) {
        let itemArray = [];
        const machineData = GachaData.getMachineData(gachaId);
        for (let i = 0; i < machineData["initial"].length; i++) {
            const machineItem = machineData["initial"][i];

            if (!machineItem) continue;

            const secret = machineItem[2];
            if (secret) {
                // Add a dummy item
                let item = GachaData.getItemFromDataClassAndItemId("item", secretItemId);
                item.uniqueId = machineItem[3];
                itemArray.push(item);
            } else {
                let item = GachaData.getItemFromDataClassAndItemId(machineItem[0], machineItem[1]);
                item.uniqueId = machineItem[3];
                itemArray.push(item);
            }
        }
        return itemArray;
    }

    GachaData.getDataClassFromItem = function (item) {
        if (DataManager.isItem(item)) {
            return 0;
        }
        if (DataManager.isWeapon(item)) {
            return 1;
        }
        if (DataManager.isArmor(item)) {
            return 2;
        }
        return -1;
    }

    GachaData.getItemFromDataClassAndItemId = function (dataClass, itemId) {
        if (dataClass === "item" || dataClass === 0) {
            return $dataItems[itemId];
        }
        if (dataClass === "weapon" || dataClass === 1) {
            return $dataWeapons[itemId];
        }
        if (dataClass === "armor" || dataClass === 2) {
            return $dataArmors[itemId];
        }
    }

    // Register the plugin command
    const buyText = PluginManager.parameters(PluginName()).buyText;
    const stockText = PluginManager.parameters(PluginName()).stockText;
    const secretItemId = PluginManager.parameters(PluginName()).secretItemId;
    const outOfStockText = PluginManager.parameters(PluginName()).outOfStockText;
    const stockRemainingText = PluginManager.parameters(PluginName()).stockRemainingText;
    const priceText = PluginManager.parameters(PluginName()).priceText;

    PluginManager.registerCommand(PluginName(), "PrepareGachaScene", args => {
        GachaData.gachaId = args.gachaId ?? 0;
        GachaData.gachaCost = args.costPerPlay ?? 0;
        GachaData.gachaTitle = args.gachaTitle ?? "<name error>";
        GachaData.usingGachaMachine = true;
    });

    // Helper function to get the plugin name
    function PluginName() {
        return document.currentScript.src.split("/").pop().replace(/\.js$/, "");
    }



    const Game_Interpreter_command302 = Game_Interpreter.prototype.command302;
    Game_Interpreter.prototype.command302 = function (params) {
        if (GachaData.usingGachaMachine) {
            // Check if machine data has been initialised
            if (!GachaData.doesMachineDataExist(GachaData.gachaId)) {
                console.log(`Initialising ${GachaData.gachaId}`);
                // Capture shop data
                const goods = [params];
                while (this.nextEventCode() === 605) {
                    this._index++;
                    goods.push(this.currentCommand().parameters);
                }

                let itemArray = GachaData.makeGoodsArray(goods);
                GachaData.machineData[GachaData.gachaId] = {};
                GachaData.machineData[GachaData.gachaId]['initial'] = [...itemArray];
                GachaData.machineData[GachaData.gachaId]['current'] = [...itemArray];
            }

            GachaData.usingGachaMachine = false;

            // Load gacha scene here
            SceneManager.push(Scene_Gacha);
        } else {
            // Call original shop processing
            return Game_Interpreter_command302.call(this, params);
        }

        return true;
    };



    //-----------------------------------------------------------------------------
    // Scene_Gacha
    //
    // The scene class of the item screen.

    function Scene_Gacha() {
        this.initialize(...arguments);
    }

    Scene_Gacha.prototype = Object.create(Scene_ItemBase.prototype);
    Scene_Gacha.prototype.constructor = Scene_Gacha;

    Scene_Gacha.prototype.initialize = function () {
        Scene_ItemBase.prototype.initialize.call(this);
    };

    Scene_Gacha.prototype.create = function () {
        Scene_ItemBase.prototype.create.call(this);
        this.createTitleWindow();
        this.createHelpWindow();
        this.createCategoryWindow();
        this.createGoldWindow();
        this.createItemWindow();
    };

    Scene_Gacha.prototype.createGoldWindow = function () {
        const rect = this.goldWindowRect();
        this._goldWindow = new Window_GachaGold(rect);
        this.addWindow(this._goldWindow);
    };

    Scene_Gacha.prototype.goldWindowRect = function () {
        const ww = Graphics.boxWidth;
        const wh = this.calcWindowHeight(1, true);
        const wx = Graphics.boxWidth - ww;
        const wy = this.mainAreaTop() + this._titleWindow.height + this._categoryWindow.height;
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Gacha.prototype.createTitleWindow = function () {
        const rect = this.titleWindowRect();
        this._titleWindow = new Window_GachaTitle(rect);
        this.addWindow(this._titleWindow);
        this._titleWindow.setText(GachaData.gachaTitle);
    }

    Scene_Gacha.prototype.titleWindowRect = function () {
        const wx = 0;
        const wy = this.mainAreaTop();
        const ww = Graphics.boxWidth;
        const wh = this.calcWindowHeight(1, true);
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Gacha.prototype.createCategoryWindow = function () {
        const rect = this.categoryWindowRect();
        this._categoryWindow = new Window_GachaCategory(rect);
        this._categoryWindow.setHelpWindow(this._helpWindow);
        this._categoryWindow.setHandler("ok", this.onCategoryOk.bind(this));
        this._categoryWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(this._categoryWindow);
    };

    Scene_Gacha.prototype.categoryWindowRect = function () {
        const wx = 0;
        const wy = this.mainAreaTop() + this._titleWindow.height;
        const wh = this.calcWindowHeight(1, true);
        const ww = Graphics.boxWidth;
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Gacha.prototype.createItemWindow = function () {
        const rect = this.itemWindowRect();
        this._itemWindow = new Window_GachaItemList(rect);
        this._itemWindow.setHelpWindow(this._helpWindow);
        this._itemWindow.setHandler("ok", this.onItemOk.bind(this));
        this._itemWindow.setHandler("cancel", this.onItemCancel.bind(this));
        this.addWindow(this._itemWindow);
        this._categoryWindow.setItemWindow(this._itemWindow);
    };

    Scene_Gacha.prototype.itemWindowRect = function () {
        const wx = 0;
        const wy = this._categoryWindow.y + this._categoryWindow.height + this._goldWindow.height;
        const ww = Graphics.boxWidth;
        const wh = this.mainAreaBottom() - wy;
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Gacha.prototype.user = function () {
        const members = $gameParty.movableMembers();
        const bestPha = Math.max(...members.map(member => member.pha));
        return members.find(member => member.pha === bestPha);
    };

    Scene_Gacha.prototype.onCategoryOk = function () {
        if (this._categoryWindow.currentSymbol() === "buy") {
            // Get 1 gacha item at random from the machine
            const indexArray = GachaData.getArrayOfAvailableIndices(GachaData.gachaId);
            console.log(indexArray);
            const max = indexArray.length;
            const min = 0;
            const i = Math.floor(Math.random() * (max - min)) + min;
            const winningIndex = indexArray[i];
            console.log(winningIndex);

            let machineData = GachaData.getMachineData(GachaData.gachaId);
            const result = machineData["current"][winningIndex];

            const item = GachaData.getItemFromDataClassAndItemId(result[0], result[1]);
            console.log(item);
            $gameParty.gainItem(item, 1);
            $gameParty.loseGold(GachaData.gachaCost);

            console.log(result);
            machineData["current"][winningIndex] = null;

            this._titleWindow.refresh();
            this._itemWindow.refresh();
            this._goldWindow.refresh();

            this._categoryWindow.refresh();
            this._categoryWindow.activate();
            return;
        }

        this._itemWindow.activate();
        this._itemWindow.selectLast();
    };

    Scene_Gacha.prototype.onItemOk = function () {
        $gameParty.setLastItem(this.item());
        this.determineItem();
    };

    Scene_Gacha.prototype.onItemCancel = function () {
        if (this._categoryWindow.needsSelection()) {
            this._itemWindow.deselect();
            this._categoryWindow.activate();
        } else {
            this.popScene();
        }
    };

    Scene_Gacha.prototype.playSeForItem = function () {
        SoundManager.playUseItem();
    };

    Scene_Gacha.prototype.useItem = function () {
        Scene_ItemBase.prototype.useItem.call(this);
        this._itemWindow.redrawCurrentItem();
    };

    //-----------------------------------------------------------------------------
    // Window_GachaGold
    //
    // The window for displaying the party's gold.

    function Window_GachaGold() {
        this.initialize(...arguments);
    }

    Window_GachaGold.prototype = Object.create(Window_Selectable.prototype);
    Window_GachaGold.prototype.constructor = Window_GachaGold;

    Window_GachaGold.prototype.initialize = function (rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this.refresh();
    };

    Window_GachaGold.prototype.refresh = function () {
        const rect = this.itemLineRect(0);
        const x = rect.x;
        const y = rect.y;
        const width = rect.width;
        this.contents.clear();
        this.drawText(this.value() + this.currencyUnit(), x, y, width);
        this.drawText(priceText + " " + GachaData.gachaCost + this.currencyUnit(), x, y, width, "right");
    };

    Window_GachaGold.prototype.value = function () {
        return $gameParty.gold();
    };

    Window_GachaGold.prototype.currencyUnit = function () {
        return TextManager.currencyUnit;
    };

    Window_GachaGold.prototype.open = function () {
        this.refresh();
        Window_Selectable.prototype.open.call(this);
    };

    //-----------------------------------------------------------------------------
    // Window_GachaCategory
    //
    // The window for selecting a category of items on the item and shop screens.

    function Window_GachaCategory() {
        this.initialize(...arguments);
    }

    Window_GachaCategory.prototype = Object.create(Window_HorzCommand.prototype);
    Window_GachaCategory.prototype.constructor = Window_GachaCategory;

    Window_GachaCategory.prototype.initialize = function (rect) {
        Window_HorzCommand.prototype.initialize.call(this, rect);
    };

    Window_GachaCategory.prototype.maxCols = function () {
        return 2;
    };

    Window_GachaCategory.prototype.update = function () {
        Window_HorzCommand.prototype.update.call(this);
        if (this._itemWindow) {
            this._itemWindow.setCategory(this.currentSymbol());
        }
    };

    Window_GachaCategory.prototype.refresh = function () {
        Window_HorzCommand.prototype.refresh.call(this);

        const hasEnoughMoney = $gameParty.gold() >= GachaData.gachaCost;
        const hasStock = GachaData.getGachaStockCount(GachaData.gachaId) > 0;
        this._list[0].enabled = hasEnoughMoney && hasStock;
    }

    Window_GachaCategory.prototype.makeCommandList = function () {
        this.addCommand(buyText, "buy");
        this.addCommand(stockText, "stock");
    };

    Window_GachaCategory.prototype.setItemWindow = function (itemWindow) {
        this._itemWindow = itemWindow;
    };

    Window_GachaCategory.prototype.needsSelection = function () {
        return this.maxItems() >= 2;
    };


    //-----------------------------------------------------------------------------
    // Window_GachaTitle
    //
    // The window for displaying the description of the selected item.

    function Window_GachaTitle() {
        this.initialize(...arguments);
    }

    Window_GachaTitle.prototype = Object.create(Window_Base.prototype);
    Window_GachaTitle.prototype.constructor = Window_GachaTitle;

    Window_GachaTitle.prototype.initialize = function (rect) {
        Window_Base.prototype.initialize.call(this, rect);
        this._text = "";
    };

    Window_GachaTitle.prototype.setText = function (text) {
        if (this._text !== text) {
            this._text = text;
            this.refresh();
        }
    };

    Window_GachaTitle.prototype.clear = function () {
        this.setText("");
    };

    Window_GachaTitle.prototype.refresh = function () {
        const rect = this.baseTextRect();
        this.contents.clear();
        this.drawTextEx(this._text, rect.x, rect.y, rect.width);
        const gachaLeftInThisMachine = GachaData.getGachaStockCount(GachaData.gachaId);
        if (gachaLeftInThisMachine === 0) {
            this.drawText(outOfStockText, rect.x, rect.y, rect.width, "right");
        } else {
            this.drawText(gachaLeftInThisMachine + " " + stockRemainingText, rect.x, rect.y, rect.width, "right");
        }
    };

    //-----------------------------------------------------------------------------
    // Window_GachaItemList
    //
    // The window for selecting an item on the item screen.

    function Window_GachaItemList() {
        this.initialize(...arguments);
    }

    Window_GachaItemList.prototype = Object.create(Window_ItemList.prototype);
    Window_GachaItemList.prototype.constructor = Window_GachaItemList;

    Window_GachaItemList.prototype.initialize = function (rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this._category = "none";
        this._data = [];
    };

    Window_GachaItemList.prototype.setCategory = function (category) {
        if (this._category !== category) {
            this._category = category;
            this.refresh();
            this.scrollTo(0, 0);
        }
    };

    Window_GachaItemList.prototype.includes = function (item) {
        return true;
    };

    Window_GachaItemList.prototype.isEnabled = function (index) {
        const machineData = GachaData.getMachineData(GachaData.gachaId);
        return machineData["current"][index];
    };

    Window_GachaItemList.prototype.makeItemList = function () {
        this._data = GachaData.getInitialItemArray(GachaData.gachaId);
        if (this._data.includes(null)) {
            this._data.push(null);
        }
    };

    Window_GachaItemList.prototype.drawItem = function (index) {
        const item = this.itemAt(index);
        if (item) {
            const numberWidth = this.numberWidth();
            const rect = this.itemLineRect(index);
            this.changePaintOpacity(this.isEnabled(index));
            this.drawItemName(item, rect.x, rect.y, rect.width - numberWidth);
            this.changePaintOpacity(1);
        }
    };

    Window_GachaItemList.prototype.refresh = function () {
        this.makeItemList();
        Window_Selectable.prototype.refresh.call(this);
    };

    //-----------------------------------------------------------------------------
    // Window_GachaBuy
    //
    // The window for displaying the party's gold.

    function Window_GachaBuy() {
        this.initialize(...arguments);
    }

    Window_GachaBuy.prototype = Object.create(Window_Selectable.prototype);
    Window_GachaBuy.prototype.constructor = Window_GachaBuy;

    Window_GachaBuy.prototype.initialize = function (rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this.refresh();
    };

    Window_GachaBuy.prototype.colSpacing = function () {
        return 0;
    };

    Window_GachaBuy.prototype.refresh = function () {
        const rect = this.itemLineRect(0);
        const x = rect.x;
        const y = rect.y;
        const width = rect.width;
        this.contents.clear();
        this.drawText(buyText, x, y, width);
    };

    Window_GachaBuy.prototype.itemWidth = function () {
        return Graphics.boxWidth / 2;
    };

    Window_GachaBuy.prototype.itemHeight = function () {
        return 128;
    };

    // Save - Load

    const DataManager_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function () {
        let contents = DataManager_makeSaveContents.call(this);

        contents.gachaMachineData = GachaData.machineData;

        return contents;
    };

    const DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function (contents) {
        DataManager_extractSaveContents.call(this, contents);

        GachaData.machineData = contents.gachaMachineData;
    };

})();