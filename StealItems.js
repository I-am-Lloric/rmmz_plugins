//=============================================================================
// RPG Maker MZ - Steal Items
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [v1.0] Stealing Items from enemies - Choose from a list
 * @author Lloric
 *
 * @help
 * 
 * When stealing items, the player is given a window of available items.
 * Items can be hidden with ???? instead of showing the item name.
 * Custom steal chance formula.
 * 
 * Skill Notetags
 * <stealItem>
 * This skill can steal items.
 * 
 * <stealItem:x y z>
 * x = dataClass (i for item, w for weapon, a for armor, g for gold)
 * y = id (or value for gold)
 * z = base steal % chance
 * 
 * @param goldIconIndex
 * @text Gold Icon Index
 * @desc The icon to use for gold.
 * @type number
 * @default 0
 * 
 * @param itemStealSuccessMessage
 * @text Item Steal Success Message
 * @desc The text to display when you successfully steal. (use %item% for item name, use %target% for target name.)
 * @type text
 * @default Stole %item% from %target%
 * 
 * @param stealItemFormula
 * @text Item Steal Formula
 * @desc The formula for steal % chance. (a is the attacker, b is the target. %base% is the item's base steal chance)
 * @type text
 * @default %base% + ( a.agi - b.agi ) * 0.1 + ( a.luk * 0.05)
 * 
 * @param itemStealFailureMessage
 * @text Item Steal Failure Message
 * @desc The text to display when you fail to steal an item. (use %item% for item name, use %target% for target name.)
 * @type text
 * @default Steal failed!
 * 
 * @param itemHiddenName
 * @text Item Hidden Name
 * @desc The text to display for a hidden item.
 * @type text
 * @default ???
 * 
 * @param showIconWhenHidden
 * @text Show Icon When Hidden
 * @desc Should the icon be visible when an item is hidden?
 * @type boolean
 * @default false
 * 
 * @param hiddenIconIndex
 * @text Hidden Icon Index
 * @desc The icon to use for hidden items.
 * @type number
 * @default 0
 * 
 * @param revealHiddenItemsAfterStealSuccess
 * @text Reveal Hidden Items After Steal Success
 * @desc Once you have successfully stolen an item from an enemy, should it be revealed on other instances of the same enemy?
 * @type bool
 * @default true
 *
 */

(() => {
    "use strict";

    var StealItems = StealItems || {};

    StealItems.stolenItemRecord = {};

    StealItems.isItemInStolenItemRecord = function (gameEnemy, stealItemData) {
        if (!Object.keys(StealItems.stolenItemRecord).includes(`${gameEnemy._enemyId}`)) {
            return false;
        }

        const foundItems = StealItems.stolenItemRecord[`${gameEnemy._enemyId}`].filter(si => (si.dataClass === stealItemData.dataClass && si.id === stealItemData.id));
        if (foundItems && foundItems.length > 0) {
            return true;
        }
        return false;
    }

    StealItems.addToStolenItemRecord = function (gameEnemy, stealItemData) {
        if (!Object.keys(StealItems.stolenItemRecord).includes(`${gameEnemy._enemyId}`)) {
            StealItems.stolenItemRecord[`${gameEnemy._enemyId}`] = [];
        }
        StealItems.stolenItemRecord[`${gameEnemy._enemyId}`].push(stealItemData);
    }

    StealItems.getItemFromDataClassAndId = function (dataClass, id) {
        dataClass = dataClass.toLowerCase();

        if (dataClass === "w") {
            return $dataWeapons[id];
        }
        if (dataClass === "a") {
            return $dataArmors[id];
        }
        if (dataClass === "i") {
            return $dataItems[id];
        }
        return null;
    }

    StealItems.doesTargetHaveItem = function (target, stealItemData) {
        const foundItems = target._stealItems.filter(si => (si.dataClass === stealItemData.dataClass && si.id === stealItemData.id));
        if (foundItems && foundItems.length > 0) {
            return true;
        }
        return false;
    }

    StealItems.getNameForStealItemData = function (stealItemData) {
        if (!stealItemData) {
            return "";
        }

        if (stealItemData.dataClass.toLowerCase() === "g") {
            return `${stealItemData.id}${TextManager.currencyUnit}`;
        } else {
            return StealItems.getItemFromDataClassAndId(stealItemData.dataClass, stealItemData.id).name;
        }
    }

    const PLUGIN_NAME = document.currentScript.src.match(/([^\/]+)\.js$/)[1];
    const parameters = PluginManager.parameters(PLUGIN_NAME);

    const GOLD_ICON_INDEX = Number(parameters.goldIconIndex || 0);
    const ITEM_STEAL_SUCCESS_MESSAGE = parameters.itemStealSuccessMessage || "Steal success!";
    const ITEM_STEAL_FAILURE_MESSAGE = parameters.itemStealFailureMessage || "Steal failed!";
    const STEAL_ITEM_FORMULA = parameters.stealItemFormula || "%base%";
    const STEAL_ITEM_REGEXP = /<stealItem:([aAwWiIgG]+)\s+(\d+)\s+(\d+)(?:\s+(true))?>/g;
    const ITEM_HIDDEN_NAME = parameters.itemHiddenName || "?";
    const SHOW_ICON_WHEN_HIDDEN = parameters.showIconWhenHidden === "true" ?? false;
    const HIDDEN_ICON_INDEX = Number(parameters.hiddenIconIndex || 0);
    const REVEAL_HIDDEN_ITEMS_AFTER_STEAL_SUCCESS = parameters.revealHiddenItemsAfterStealSuccess === "true" ?? false;

    //------------------------------------
    // Game_Enemy
    //

    const Llo_SteIte_Game_Enemy_setup = Game_Enemy.prototype.setup;
    Game_Enemy.prototype.setup = function (enemyId, x, y) {
        Llo_SteIte_Game_Enemy_setup.call(this, enemyId, x, y);

        this.setupStealItems();
    };

    Game_Enemy.prototype.setupStealItems = function () {
        this._stealItems = [];

        const dataEnemy = $dataEnemies[this.enemyId()];
        const matches = [...dataEnemy.note.matchAll(STEAL_ITEM_REGEXP)];
        for (const match of matches) {
            const dataClass = match[1];
            const id = Number(match[2]);
            const baseStealChance = Number(match[3]);
            const hidden = match[4] ? true : false;
            this.addStealItem(dataClass, id, baseStealChance, hidden);
        }
    }

    Game_Enemy.prototype.addStealItem = function (dataClass, id, baseStealChance, hidden) {
        this._stealItems.push({ dataClass, id, baseStealChance, hidden });
    }

    Game_Enemy.prototype.removeStealItem = function (stealItemData) {
        this._stealItems = this._stealItems.filter(si => !(si.dataClass === stealItemData.dataClass && si.id === stealItemData.id));
    }

    Game_Enemy.prototype.getStealItemArray = function () {
        return this._stealItems;
    }

    //---------------------------------------
    // Scene_Battle
    //

    const Llo_SteIte_Scene_Battle_onEnemyOk = Scene_Battle.prototype.onEnemyOk;
    Scene_Battle.prototype.onEnemyOk = function () {
        const action = BattleManager.inputtingAction();
        const skill = action.item();
        if (DataManager.isSkill(skill) && skill.meta.stealItem) {
            // Open the steal window
            const gameEnemy = $gameTroop.members()[this._enemyWindow.enemyIndex()];
            this.openStealWindow(gameEnemy);
        } else {
            Llo_SteIte_Scene_Battle_onEnemyOk.call(this);
        }
    };

    Scene_Battle.prototype.openStealWindow = function (gameEnemy) {
        this._stealItemWindow.setGameEnemy(gameEnemy);
        this._stealItemWindow.show();
        this._stealItemWindow.activate();
        this._stealItemWindow.select(0);
    }

    const Llo_SteItem_Scene_Battle_isAnyInputWindowActive = Scene_Battle.prototype.isAnyInputWindowActive;
    Scene_Battle.prototype.isAnyInputWindowActive = function () {
        if (this._stealItemWindow.active) {
            return true;
        }
        return Llo_SteItem_Scene_Battle_isAnyInputWindowActive.call(this);
    };


    Scene_Battle.prototype.onStealItemOk = function () {
        let action = BattleManager.inputtingAction();
        action._stealItemData = this._stealItemWindow.item();

        this._stealItemWindow.hide();
        this._stealItemWindow.deactivate();
        Llo_SteIte_Scene_Battle_onEnemyOk.call(this);
    }

    Scene_Battle.prototype.onStealItemCancel = function () {
        this._stealItemWindow.hide();
        this._stealItemWindow.deactivate();

        this._enemyWindow.activate();
    }

    const Llo_SteIte_Scene_Battle_createAllWindows = Scene_Battle.prototype.createAllWindows;
    Scene_Battle.prototype.createAllWindows = function () {
        Llo_SteIte_Scene_Battle_createAllWindows.call(this);

        this.createStealItemWindow();
    };

    Scene_Battle.prototype.createStealItemWindow = function () {
        const rect = this.stealItemWindowRect();
        const stealItemWindow = new Window_StealItem(rect);
        stealItemWindow.y = Graphics.boxHeight - stealItemWindow.height;
        stealItemWindow.setHandler("ok", this.onStealItemOk.bind(this));
        stealItemWindow.setHandler("cancel", this.onStealItemCancel.bind(this));
        this.addWindow(stealItemWindow);
        this._stealItemWindow = stealItemWindow;
        this._stealItemWindow.hide();
    }

    Scene_Battle.prototype.stealItemWindowRect = function () {
        const ww = this.mainCommandWidth() * 2;
        const wh = this.windowAreaHeight();
        const wx = this.isRightInputMode() ? Graphics.boxWidth - ww : 0;
        const wy = Graphics.boxHeight - wh;
        return new Rectangle(wx, wy, ww, wh);
    };


    //-----------------------------------------------------------------------------
    // Window_StealItem
    //
    // The window for selecting an item on the item screen.

    function Window_StealItem() {
        this.initialize(...arguments);
    }

    Window_StealItem.prototype = Object.create(Window_ItemList.prototype);
    Window_StealItem.prototype.constructor = Window_StealItem;

    Window_StealItem.prototype.maxCols = function () {
        return 1;
    };

    Window_StealItem.prototype.isEnabled = function (item) {
        return true;
    };

    Window_StealItem.prototype.makeItemList = function () {
        if (!this._gameEnemy) {
            this._data = [];
            return;
        }

        this._data = this._gameEnemy.getStealItemArray();
        if (this.includes(null)) {
            this._data.push(null);
        }
    };

    Window_StealItem.prototype.drawItem = function (index) {
        if (this._data && index >= 0 === false) {
            return;
        }

        const stealItemData = this._data[index];

        let iconIndex = this.getIcon(stealItemData);
        let itemName = this.getName(stealItemData);

        this.changePaintOpacity(1);
        const iconWidth = ImageManager.standardIconWidth;
        const rect = this.itemLineRect(index);
        this.drawIcon(iconIndex, rect.x, rect.y);
        this.drawText(itemName, rect.x + iconWidth + 4, rect.y, rect.width);
        this.changePaintOpacity(1);
    };

    Window_StealItem.prototype.getIcon = function (stealItemData) {
        let iconIndex = 0;
        if (stealItemData.dataClass.toLowerCase() === "g") {
            // Draw gold
            iconIndex = GOLD_ICON_INDEX;
        } else {
            const item = StealItems.getItemFromDataClassAndId(stealItemData.dataClass, stealItemData.id);
            if (!item) {
                return 0;
            }

            iconIndex = item.iconIndex;
        }

        if (stealItemData.hidden) {
            if (SHOW_ICON_WHEN_HIDDEN) {
                return iconIndex;
            }

            if (REVEAL_HIDDEN_ITEMS_AFTER_STEAL_SUCCESS && StealItems.isItemInStolenItemRecord(this._gameEnemy, stealItemData)) {
                return iconIndex;
            }

            return HIDDEN_ICON_INDEX;
        }

        return iconIndex;
    }

    Window_StealItem.prototype.getName = function (stealItemData) {
        let itemName = "";
        if (stealItemData.dataClass.toLowerCase() === "g") {
            // Draw gold
            itemName = `${stealItemData.id}${TextManager.currencyUnit}`;
        } else {
            const item = StealItems.getItemFromDataClassAndId(stealItemData.dataClass, stealItemData.id);
            if (!item) {
                return "<item not found>";
            }

            itemName = item.name;
        }

        if (stealItemData.hidden) {
            if (REVEAL_HIDDEN_ITEMS_AFTER_STEAL_SUCCESS && StealItems.isItemInStolenItemRecord(this._gameEnemy, stealItemData)) {
                return itemName;
            }

            return ITEM_HIDDEN_NAME;
        }

        return itemName;
    }

    Window_StealItem.prototype.refresh = function () {
        this.makeItemList();
        Window_Selectable.prototype.refresh.call(this);
    };

    Window_StealItem.prototype.setGameEnemy = function (gameEnemy) {
        this._gameEnemy = gameEnemy;
        this.refresh();
    }

    //-----------------------------------
    // Game_Action
    //

    const Llo_SteIte_Game_Action_apply = Game_Action.prototype.apply;
    Game_Action.prototype.apply = function (target) {
        Llo_SteIte_Game_Action_apply.call(this, target);
        if (!this.item().meta.stealItem) return;
        if (!target.isEnemy()) return;

        const stealItemData = this._stealItemData;
        if (!StealItems.doesTargetHaveItem(target, stealItemData)) return;

        // Check steal chance
        const stealChance = this.evalStealFormula(target, stealItemData.baseStealChance);
        if (stealChance <= 0) {
            this.stealFailure(target);
            return;
        }

        const randomNumber = Math.floor(Math.random() * 100) + 1;
        if (randomNumber > stealChance) {
            this.stealFailure(target);
            return;
        }

        this.stealSuccess(target, stealItemData);
        target.removeStealItem(stealItemData);

        if (stealItemData.dataClass.toLowerCase() === "g") {
            $gameParty.gainGold(stealItemData.id); // id is actually the gold value here
        } else {
            const item = StealItems.getItemFromDataClassAndId(stealItemData.dataClass, stealItemData.id);
            $gameParty.gainItem(item, 1);
        }
    };

    Game_Action.prototype.stealSuccess = function (target, stealItemData) {
        const result = target.result();
        result._stealAttempted = true;
        result._stealSuccess = true;
        result._stealItem = stealItemData;
        this.makeSuccess(target);

        if (REVEAL_HIDDEN_ITEMS_AFTER_STEAL_SUCCESS) {
            StealItems.addToStolenItemRecord(target, stealItemData);
        }
    }

    Game_Action.prototype.stealFailure = function (target) {
        const result = target.result();
        result._stealAttempted = true;
        result._stealSuccess = false;
    }

    Game_Action.prototype.evalStealFormula = function (target, baseStealChance) {
        try {
            const a = this.subject(); // eslint-disable-line no-unused-vars
            const b = target; // eslint-disable-line no-unused-vars
            const v = $gameVariables._data; // eslint-disable-line no-unused-vars

            let stealItemFormula = STEAL_ITEM_FORMULA.replace("%base%", baseStealChance);
            const value = Math.min(100, Math.max(eval(stealItemFormula), 0));
            return isNaN(value) ? 0 : value;
        } catch (e) {
            return 0;
        }
    };

    //----------------------------------------
    // Window_BattleLog
    //

    Window_BattleLog.prototype.displayStealItemSuccess = function (target, stealItemData) {
        const itemName = StealItems.getNameForStealItemData(stealItemData);
        this.push("addText", ITEM_STEAL_SUCCESS_MESSAGE.replace("%target%", target.name()).replace("%item%", itemName));
    };

    Window_BattleLog.prototype.displayStealItemFailed = function (target, stealItemData) {
        const itemName = StealItems.getNameForStealItemData(stealItemData);
        this.push("addText", ITEM_STEAL_FAILURE_MESSAGE.replace("%target%", target.name()).replace("%item%", itemName));
    };

    const Llo_SteItem_Window_BattleLog_displayActionResults = Window_BattleLog.prototype.displayActionResults;
    Window_BattleLog.prototype.displayActionResults = function (subject, target) {
        Llo_SteItem_Window_BattleLog_displayActionResults.call(this, subject, target);

        if (target.result().used) {

            if (target.result()._stealAttempted) {
                if (target.result()._stealSuccess) {
                    this.displayStealItemSuccess(target, target.result()._stealItem);
                } else {
                    this.displayStealItemFailed(target, target.result()._stealItem);
                }
                this.push("wait");
            }

            target.result()._stealAttempted = false;
            target.result()._stealSuccess = null;
            target.result()._stealItem = null;
        }
    };

    //-------------------------------
    // DataManager
    //

    const Llo_SteIte_DataManager_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function () {
        const contents = Llo_SteIte_DataManager_makeSaveContents.call(this);
        contents.stolenItemRecord = StealItems.stolenItemRecord;
        return contents;
    };

    const Llo_SteIte_DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function (contents) {
        $gameSystem = contents.system;
        $gameScreen = contents.screen;
        $gameTimer = contents.timer;
        $gameSwitches = contents.switches;
        $gameVariables = contents.variables;
        $gameSelfSwitches = contents.selfSwitches;
        $gameActors = contents.actors;
        $gameParty = contents.party;
        $gameMap = contents.map;
        $gamePlayer = contents.player;

        Llo_SteIte_DataManager_extractSaveContents.call(this, contents);
        StealItems.stolenItemRecord = contents.stolenItemRecord;
    };

})();
