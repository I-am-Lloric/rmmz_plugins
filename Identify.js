//=============================================================================
// RPG Maker MZ - Identify
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Items can require identification before seeing their name, value, description etc.
 * @author Lloric
 * 
 * @param substituteName
 * @text Substitute Name
 * @type text
 * @desc The text that displays in place of an item's name when requiring identification
 * @default ???
 * 
 * @param hideName
 * @text Hide Name
 * @type boolean
 * @desc Should an item's name be hidden when requiring identification?
 * @default true
 * 
 * @param hideIcon
 * @text Hide Icon
 * @type boolean
 * @desc Should an item's icon be hidden when requiring identification?
 * @default true
 * 
 * @param substituteIcon
 * @text Substitute Icon
 * @type number
 * @desc The icon displayed when an item requires identification
 * @default 16
 * 
 * @param hideDescription
 * @text Hide Description
 * @type boolean
 * @desc Should an item's description be hidden when requiring identification?
 * @default true
 * 
 * @param hideEquipParams
 * @text Hide Equip Params
 * @type boolean
 * @desc Should an item's paramters be hidden in the equip menu when requiring identification?
 * @default true
 * 
 * @param substituteParamText
 * @text Substitute Param Text
 * @type text
 * @desc The text to replace an item's parameters in the equip menu
 * @default ??
 * 
 * @param substituteDescription
 * @text Substitute Description
 * @type text
 * @desc The description text displayed when an item requires identification
 * @default [ MUST BE IDENTIFIED ]
 * 
 * @param itemsRequireIdentificationByDefault
 * @text Items Require Identification By Default
 * @type boolean
 * @desc Should an item require identification by default?
 * @default true
 * 
 * @param identifyItemsWhenUsed
 * @text Identify Items When Used
 * @type boolean
 * @desc Should an item be identified after use?
 * @default true
 * 
 * @param identifyItemsWhenEquipped
 * @text Identify Items When Equipped
 * @type boolean
 * @desc Should an item be identified after being equipped?
 * @default true
 * 
 * @param identifyFlatCost
 * @text Identify Flat Cost
 * @type number
 * @desc A flat cost to identify items at a shop
 * @default 100
 * 
 * @param identifyCostPercentageOfValue
 * @text Identify Cost Percentage of Value
 * @type boolean
 * @desc Should identify cost be based on value of the item? (This overrides Identify Flat Cost)
 * @default false
 * 
 * @param identifyPercentageCost
 * @text Identify Percentage Cost
 * @type number
 * @desc When Identify Cost Percentage of Value is true, this is the % cost.
 * @default 50
 * 
 * @param identifyPopupText
 * @text Identify Popup Text
 * @type text
 * @desc The text displayed when an item is identified. (Use %itemname% in place of the item's name)
 * @default Identified %itemname%!!!
 *
 * @command openIdentificationShop
 * @text Open Identification Shop
 * @desc Open the scene to purchase item identification.
 * 
 * @help
 * Item / Weapon / Armour
 * 
 * <requireIdentify> (this item requires identification)
 * <identifyUponEquip> (this item will be identified when equipped)
 * 
 * When creating items that can identify, set Cosume to No.
 * The code will handle removing the item upon identifying an item.
 * 
 * 
 * 
 * 
 */

(() => {
    var IdentifyData = IdentifyData ?? {};
    IdentifyData.data = {};

    IdentifyData.getDataClass = function (item) {
        var dataClass = "";
        if (DataManager.isItem(item)) {
            dataClass = "item";
        }
        if (DataManager.isWeapon(item)) {
            dataClass = "weapon";
        }
        if (DataManager.isArmor(item)) {
            dataClass = "armor";
        }
        return dataClass;
    }

    IdentifyData.createItemIdentifier = function (item) {
        if (!item) return "";
        const dataClass = IdentifyData.getDataClass(item);
        return `${dataClass} ${item.id}`;
    }

    IdentifyData.getData = function (item) {
        const itemIdentifier = IdentifyData.createItemIdentifier(item);
        if (!Object.keys(IdentifyData.data).includes(itemIdentifier)) {
            IdentifyData.data[itemIdentifier] = itemsRequireIdentificationByDefault;
        }
        return IdentifyData.data[itemIdentifier];
    }

    IdentifyData.initData = function (item, dataClass) {
        const itemIdentifier = `${dataClass} ${item.id}`;
        if (!Object.keys(IdentifyData.data).includes(itemIdentifier)) {
            IdentifyData.data[itemIdentifier] = itemsRequireIdentificationByDefault;
        }
        if (item.meta.requireIdentify) {
            IdentifyData.data[itemIdentifier] = true;
        }
    }

    IdentifyData.updateData = function (item, requiresIdentification) {
        const itemIdentifier = IdentifyData.createItemIdentifier(item);
        IdentifyData.data[itemIdentifier] = requiresIdentification;
    }

    IdentifyData.getCost = function (item) {
        if (!identifyCostPercentageOfValue) {
            return identifyFlatCost;
        } else {
            return IdentifyData.calculatePercentageCost(item);
        }
    }

    IdentifyData.calculatePercentageCost = function (item) {
        return Math.ceil((item.price / 100) * identifyPercentageCost);
    }

    IdentifyData.createPopupText = function (item) {
        var popupText = identifyPopupText;
        popupText = popupText.replace("%itemname%", item.name);
        return popupText;
    }

    // Retrieve plugin parameters
    const pluginName = document.currentScript.src.match(/([^\/]+)\.js$/)[1];
    const parameters = PluginManager.parameters(pluginName);
    const substituteName = parameters['substituteName'] || "?";
    const substituteIcon = parameters['substituteIcon'] || 0;
    const substituteDescription = parameters['substituteDescription'] || "";
    const hideName = parameters['hideName'] === 'true';
    const hideIcon = parameters['hideIcon'] === 'true';
    const hideDescription = parameters['hideDescription'] === 'true';
    const itemsRequireIdentificationByDefault = parameters['itemsRequireIdentificationByDefault'] === 'true';
    const identifyItemsWhenUsed = parameters['identifyItemsWhenUsed'] === 'true';
    const identifyItemsWhenEquipped = parameters['identifyItemsWhenEquipped'] === 'true';
    const identifyFlatCost = parameters['identifyFlatCost'] || 100;
    const identifyCostPercentageOfValue = parameters['identifyCostPercentageOfValue'] === 'true';
    const identifyPercentageCost = parameters['identifyPercentageCost'] || 50;
    const identifyPopupText = parameters['identifyPopupText'] || "Identified %itemname%";
    const hideEquipParams = parameters['hideEquipParams'] === 'true';
    const substituteParamText = parameters['substituteParamText'] || "?";

    PluginManager.registerCommand(pluginName, "openIdentificationShop", args => {
        SceneManager.push(Scene_ShopIdentify);
    });

    const Llo_Ide_Window_Base_drawItemName = Window_Base.prototype.drawItemName;
    Window_Base.prototype.drawItemName = function (item, x, y, width) {
        if (item && IdentifyData.getData(item)) {
            const iconY = y + (this.lineHeight() - ImageManager.iconHeight) / 2;
            const delta = ImageManager.standardIconWidth - ImageManager.iconWidth;
            const textMargin = ImageManager.standardIconWidth + 4;
            const itemWidth = Math.max(0, width - textMargin);
            this.resetTextColor();

            if (hideIcon) {
                this.drawIcon(substituteIcon, x + delta / 2, iconY);
            } else {
                this.drawIcon(item.iconIndex, x + delta / 2, iconY);
            }
            if (hideName) {
                this.drawText(substituteName, x + textMargin, y, itemWidth);
            } else {
                this.drawText(item.name, x + textMargin, y, itemWidth);
            }
        }
        else {
            Llo_Ide_Window_Base_drawItemName.call(this, item, x, y, width);
        }
    };

    const Llo_Ide_Window_Help_setItem = Window_Help.prototype.setItem;
    Window_Help.prototype.setItem = function (item) {
        if (item && hideDescription && IdentifyData.getData(item)) {
            this.setText(item ? substituteDescription : "");
        } else {
            Llo_Ide_Window_Help_setItem.call(this, item);
        }

    };

    const Llo_Ide_DataManager_onLoad = DataManager.onLoad;
    DataManager.onLoad = function (object) {
        Llo_Ide_DataManager_onLoad.call(this, object);

        if (object === $dataItems || object === $dataWeapons || object === $dataArmors) {
            object.forEach(item => {
                if (!item) return;

                if (object === $dataItems) {
                    DataManager.initIdentify(item, "item");
                }
                if (object === $dataWeapons) {
                    DataManager.initIdentify(item, "weapon");
                }
                if (object === $dataArmors) {
                    DataManager.initIdentify(item, "armor");
                }
            });
        }
    };

    DataManager.initIdentify = function (item, dataClass) {
        IdentifyData.initData(item, dataClass);
    }

    const Llo_Ide_Game_Battler_consumeItem = Game_Battler.prototype.consumeItem;
    Game_Battler.prototype.consumeItem = function (item) {
        Llo_Ide_Game_Battler_consumeItem.call(this, item);

        if (identifyItemsWhenUsed) {
            IdentifyData.updateData(item, false);
        }
    };

    const Llo_Ide_Game_Battler_useItem = Game_Battler.prototype.useItem;
    Game_Battler.prototype.useItem = function (item) {
        Llo_Ide_Game_Battler_useItem.call(this, item);

        if (DataManager.isSkill(item) && item.meta.canIdentify) {
            IdentifyData._lastIdentifyItemUsed = item;
            IdentifyData._lastIdentifyItemBattler = this;
            SceneManager.push(Scene_SkillIdentify);
        }
    };

    const Llo_Ide_Game_Party_consumeItem = Game_Party.prototype.consumeItem;
    Game_Party.prototype.consumeItem = function (item) {
        Llo_Ide_Game_Party_consumeItem.call(this, item);

        if (item.meta.canIdentify) {
            IdentifyData._lastIdentifyItemUsed = item;
            SceneManager.push(Scene_ItemIdentify);
        }
    };

    //-----------------------------------------------------------------------------
    // Scene_ItemIdentify
    //
    // The scene class of the item screen.

    function Scene_ItemIdentify() {
        this.initialize(...arguments);
    }

    Scene_ItemIdentify.prototype = Object.create(Scene_Item.prototype);
    Scene_ItemIdentify.prototype.constructor = Scene_ItemIdentify;

    Scene_ItemIdentify.prototype.create = function () {
        Scene_Item.prototype.create.call(this);

        this.createPopupWindow();
    };

    Scene_ItemIdentify.prototype.createItemWindow = function () {
        const rect = this.itemWindowRect();
        this._itemWindow = new Window_IdentifyItemList(rect);
        this._itemWindow.setHelpWindow(this._helpWindow);
        this._itemWindow.setHandler("ok", this.onItemOk.bind(this));
        this._itemWindow.setHandler("cancel", this.onItemCancel.bind(this));
        this.addWindow(this._itemWindow);
        this._categoryWindow.setItemWindow(this._itemWindow);
        if (!this._categoryWindow.needsSelection()) {
            this._itemWindow.y -= this._categoryWindow.height;
            this._itemWindow.height += this._categoryWindow.height;
            this._itemWindow.createContents();
            this._categoryWindow.update();
            this._categoryWindow.hide();
            this._categoryWindow.deactivate();
            this.onCategoryOk();
        }
    };

    Scene_ItemIdentify.prototype.onItemOk = function () {
        IdentifyData.updateData(this.item(), false);
        $gameParty.loseItem(IdentifyData._lastIdentifyItemUsed, 1);

        this._popupWindow.setText(IdentifyData.createPopupText(this.item()));
        this._popupWindow.show();
        this._popupWindow.activate();
    };

    //-----------------------------------------------------------------------------
    // Scene_SkillIdentify
    //
    // The scene class of the item screen.

    function Scene_SkillIdentify() {
        this.initialize(...arguments);
    }

    Scene_SkillIdentify.prototype = Object.create(Scene_Item.prototype);
    Scene_SkillIdentify.prototype.constructor = Scene_SkillIdentify;


    Scene_SkillIdentify.prototype.create = function () {
        Scene_Item.prototype.create.call(this);

        this.createPopupWindow();
    };

    Scene_SkillIdentify.prototype.createItemWindow = function () {
        const rect = this.itemWindowRect();
        this._itemWindow = new Window_IdentifyItemList(rect);
        this._itemWindow.setHelpWindow(this._helpWindow);
        this._itemWindow.setHandler("ok", this.onItemOk.bind(this));
        this._itemWindow.setHandler("cancel", this.onItemCancel.bind(this));
        this.addWindow(this._itemWindow);
        this._categoryWindow.setItemWindow(this._itemWindow);
        if (!this._categoryWindow.needsSelection()) {
            this._itemWindow.y -= this._categoryWindow.height;
            this._itemWindow.height += this._categoryWindow.height;
            this._itemWindow.createContents();
            this._categoryWindow.update();
            this._categoryWindow.hide();
            this._categoryWindow.deactivate();
            this.onCategoryOk();
        }
    };

    Scene_SkillIdentify.prototype.onItemOk = function () {
        IdentifyData.updateData(this.item(), false);

        this._popupWindow.setText(IdentifyData.createPopupText(this.item()));
        this._popupWindow.show();
        this._popupWindow.activate();
    };

    Scene_SkillIdentify.prototype.onItemCancel = function () {
        if (this._categoryWindow.needsSelection()) {
            this._itemWindow.deselect();
            this._categoryWindow.activate();
        } else {
            this.returnMpCost();
            this.popScene();
        }
    };

    Scene_SkillIdentify.prototype.returnMpCost = function () {
        const mpReturn = IdentifyData._lastIdentifyItemUsed.mpCost;
        IdentifyData._lastIdentifyItemBattler.gainMp(mpReturn);
    }

    Scene_SkillIdentify.prototype.createCategoryWindow = function () {
        const rect = this.categoryWindowRect();
        this._categoryWindow = new Window_ItemCategory(rect);
        this._categoryWindow.setHelpWindow(this._helpWindow);
        this._categoryWindow.setHandler("ok", this.onCategoryOk.bind(this));
        this._categoryWindow.setHandler("cancel", this.onCategoryCancel.bind(this));
        this.addWindow(this._categoryWindow);
    };

    Scene_SkillIdentify.prototype.onCategoryCancel = function () {
        this.returnMpCost();
        this.popScene();
    }

    //-----------------------------------------------------------------------------
    // Scene_ShopIdentify
    //
    // The scene class of the item screen.

    function Scene_ShopIdentify() {
        this.initialize(...arguments);
    }

    Scene_ShopIdentify.prototype = Object.create(Scene_Item.prototype);
    Scene_ShopIdentify.prototype.constructor = Scene_ShopIdentify;

    Scene_ShopIdentify.prototype.create = function () {
        Scene_Item.prototype.create.call(this);
        this.createGoldWindow();
        this.createPopupWindow();
    };

    Scene_ShopIdentify.prototype.createGoldWindow = function () {
        const rect = this.goldWindowRect();
        this._goldWindow = new Window_Gold(rect);
        this.addWindow(this._goldWindow);
    };

    Scene_ShopIdentify.prototype.goldWindowRect = function () {
        const ww = this.mainCommandWidth();
        const wh = this.calcWindowHeight(1, true);
        const wx = Graphics.boxWidth - ww;
        const wy = this.mainAreaTop();
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_ShopIdentify.prototype.createCategoryWindow = function () {
        const rect = this.categoryWindowRect();
        this._categoryWindow = new Window_IdentifyShopItemCategory(rect);
        this._categoryWindow.setHelpWindow(this._helpWindow);
        this._categoryWindow.setHandler("ok", this.onCategoryOk.bind(this));
        this._categoryWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(this._categoryWindow);
    };

    Scene_ShopIdentify.prototype.categoryWindowRect = function () {
        const wx = 0;
        const wy = this.mainAreaTop();
        const ww = Graphics.boxWidth - this.mainCommandWidth();
        const wh = this.calcWindowHeight(1, true);
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_ShopIdentify.prototype.createItemWindow = function () {
        const rect = this.itemWindowRect();
        this._itemWindow = new Window_ShopIdentifyItemList(rect);
        this._itemWindow.setHelpWindow(this._helpWindow);
        this._itemWindow.setHandler("ok", this.onItemOk.bind(this));
        this._itemWindow.setHandler("cancel", this.onItemCancel.bind(this));
        this.addWindow(this._itemWindow);
        this._categoryWindow.setItemWindow(this._itemWindow);
        if (!this._categoryWindow.needsSelection()) {
            this._itemWindow.y -= this._categoryWindow.height;
            this._itemWindow.height += this._categoryWindow.height;
            this._itemWindow.createContents();
            this._categoryWindow.update();
            this._categoryWindow.hide();
            this._categoryWindow.deactivate();
            this.onCategoryOk();
        }
    };

    Scene_ShopIdentify.prototype.onItemOk = function () {
        IdentifyData.updateData(this.item(), false);
        $gameParty.loseGold(IdentifyData.getCost(this.item()));

        this._popupWindow.setText(IdentifyData.createPopupText(this.item()));
        this._popupWindow.show();
        this._popupWindow.activate();

        this._goldWindow.refresh();
        this._itemWindow.refresh();
    };

    Scene_ShopIdentify.prototype.onPopupInput = function () {
        this._popupWindow.hide();

        this._itemWindow.activate();
        this._itemWindow.selectLast();
    }

    // Scene_Item

    Scene_Item.prototype.createPopupWindow = function () {
        const rect = this.popupWindowRect();
        this._popupWindow = new Window_IdentifyPopup(rect);
        this._popupWindow.hide();

        this._popupWindow.setHandler("ok", this.onPopupInput.bind(this));
        this._popupWindow.setHandler("cancel", this.onPopupInput.bind(this));

        this.addWindow(this._popupWindow);
    };

    Scene_Item.prototype.onPopupInput = function () {
        this.popScene();
    }

    Scene_Item.prototype.popupWindowRect = function () {
        const ww = Graphics.boxWidth * 0.75;
        const wh = this.calcWindowHeight(1, true);
        const wx = Graphics.boxWidth * 0.5 - (ww * 0.5);
        const wy = Graphics.boxHeight * 0.5 - (wh * 0.5);
        return new Rectangle(wx, wy, ww, wh);
    };

    //-----------------------------------------------------------------------------
    // Window_IdentifyPopup
    //
    // The window for displaying the description of the selected item.

    function Window_IdentifyPopup() {
        this.initialize(...arguments);
    }

    Window_IdentifyPopup.prototype = Object.create(Window_Selectable.prototype);
    Window_IdentifyPopup.prototype.constructor = Window_IdentifyPopup;

    Window_IdentifyPopup.prototype.initialize = function (rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this._text = "";
    };

    Window_IdentifyPopup.prototype.setText = function (text) {
        if (this._text !== text) {
            this._text = text;
            this.refresh();
        }
    };

    Window_IdentifyPopup.prototype.clear = function () {
        this.setText("");
    };

    Window_IdentifyPopup.prototype.setItem = function (item) {
        this.setText(item ? item.description : "");
    };

    Window_IdentifyPopup.prototype.refresh = function () {
        Window_Selectable.prototype.refresh.call(this);
        const rect = this.baseTextRect();
        this.contents.clear();
        this.drawText(this._text, rect.x, rect.y, rect.width, "center");
    };

    //-----------------------------------------------------------------------------
    // Window_IdentifyShopItemCategory
    //
    // The window for selecting a category of items on the item and shop screens.

    function Window_IdentifyShopItemCategory() {
        this.initialize(...arguments);
    }

    Window_IdentifyShopItemCategory.prototype = Object.create(Window_ItemCategory.prototype);
    Window_IdentifyShopItemCategory.prototype.constructor = Window_IdentifyShopItemCategory;

    Window_IdentifyShopItemCategory.prototype.initialize = function (rect) {
        Window_ItemCategory.prototype.initialize.call(this, rect);
    };

    Window_IdentifyShopItemCategory.prototype.maxCols = function () {
        return 3;
    };

    Window_IdentifyShopItemCategory.prototype.makeCommandList = function () {
        if (this.needsCommand("item")) {
            this.addCommand(TextManager.item, "item");
        }
        if (this.needsCommand("weapon")) {
            this.addCommand(TextManager.weapon, "weapon");
        }
        if (this.needsCommand("armor")) {
            this.addCommand(TextManager.armor, "armor");
        }
    };

    //-----------------------------------------------------------------------------
    // Window_IdentifyItemList
    //
    // The window for identifying items via item or skill

    function Window_IdentifyItemList() {
        this.initialize(...arguments);
    }

    Window_IdentifyItemList.prototype = Object.create(Window_ItemList.prototype);
    Window_IdentifyItemList.prototype.constructor = Window_IdentifyItemList;

    Window_IdentifyItemList.prototype.includes = function (item) {
        const requiresIdentification = IdentifyData.getData(item);
        if (!requiresIdentification) return false;

        return Window_ItemList.prototype.includes.call(this, item);
    };

    Window_IdentifyItemList.prototype.isEnabled = function (item) {
        return item;
    };

    //-----------------------------------------------------------------------------
    // Window_ShopIdentifyItemList
    //
    // The window for identifying items in a shop.

    function Window_ShopIdentifyItemList() {
        this.initialize(...arguments);
    }

    Window_ShopIdentifyItemList.prototype = Object.create(Window_ItemList.prototype);
    Window_ShopIdentifyItemList.prototype.constructor = Window_ShopIdentifyItemList;

    Window_ShopIdentifyItemList.prototype.includes = function (item) {
        const requiresIdentification = IdentifyData.getData(item);
        if (!requiresIdentification) return false;

        return Window_ItemList.prototype.includes.call(this, item);
    };

    Window_ShopIdentifyItemList.prototype.maxCols = function () {
        return 1;
    };

    Window_ShopIdentifyItemList.prototype.isEnabled = function (item) {
        return item && $gameParty.gold() >= IdentifyData.getCost(item);
    };

    Window_ShopIdentifyItemList.prototype.drawItem = function (index) {
        const item = this.itemAt(index);
        if (item) {
            const numberWidth = this.numberWidth();
            const rect = this.itemLineRect(index);
            this.changePaintOpacity(this.isEnabled(item));
            this.drawItemName(item, rect.x, rect.y, (rect.width / 2) - numberWidth);
            this.drawItemNumber(item, rect.x, rect.y, (rect.width / 2));
            this.changePaintOpacity(1);

            this.drawIdentifyCost(item, rect.x, rect.y, rect.width);
        }
    };

    Window_ShopIdentifyItemList.prototype.drawIdentifyCost = function (item, x, y, width) {
        const cost = IdentifyData.getCost(item);
        this.drawText(`${cost}${TextManager.currencyUnit}`, x, y, width, "right");
    };

    const Llo_Ide_Window_EquipStatus_drawNewParam = Window_EquipStatus.prototype.drawNewParam;
    Window_EquipStatus.prototype.drawNewParam = function (x, y, paramId) {
        if (IdentifyData._identifyEquipItem) {
            const paramWidth = this.paramWidth();
            this.drawText(substituteParamText, x, y, paramWidth, "right");
        } else {
            Llo_Ide_Window_EquipStatus_drawNewParam.call(this, x, y, paramId);
        }
    }

    const Llo_Ide_Window_EquipItem_updateHelp = Window_EquipItem.prototype.updateHelp;
    Window_EquipItem.prototype.updateHelp = function () {
        if (this._actor && this._statusWindow && this._slotId >= 0 && hideEquipParams) {
            if (IdentifyData.getData(this.item())) {
                IdentifyData._identifyEquipItem = this.item();
            } else {
                IdentifyData._identifyEquipItem = null;
            }
        }

        Llo_Ide_Window_EquipItem_updateHelp.call(this);
    };

    const Llo_Ide_Scene_Equip_executeEquipChange = Scene_Equip.prototype.executeEquipChange;
    Scene_Equip.prototype.executeEquipChange = function () {
        Llo_Ide_Scene_Equip_executeEquipChange.call(this);

        const item = this._itemWindow.item();
        if (identifyItemsWhenEquipped) {
            IdentifyData.updateData(item, false);
        }

        if (item.meta.identifyUponEquip) {
            IdentifyData.updateData(item, false);
        }
    };

    // Save and Load
    const Llo_Ide_DataManager_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function () {
        var contents = Llo_Ide_DataManager_makeSaveContents.call(this);
        contents.identifyData = IdentifyData.data;
        return contents;
    };

    const Llo_Ide_DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function (contents) {
        Llo_Ide_DataManager_extractSaveContents.call(this, contents);
        IdentifyData.data = contents.identifyData;
    };

})();