//=============================================================================
// RPG Maker MZ - Skill Blending
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [v1.0] 
 * @author Lloric
 * 
 * @help
 *  If an actor cannot pay for the blended skill result, nothing will happen.
 *  As a way around this, set the MP/TP cost of the blended skill result equal
 *  to the total cost of the skills being blended.
 * (The plugin calculates the total MP/TP cost so far with all the selected
 * skills.)
 * 
 * In order to trigger skill blending in combat, you must press Q when selecting
 * a skill. This tells the game you want to continue selecting skills.
 * When you are done selecting skills, you can just confirm a skill like normal.
 * 
 * Skill Notetags
 * <skillBlend:x,y,z...>
 * Add this to your resulting skill.
 * x,y,z and so on are the skill IDs which need to be used to produce the skill
 * this note tag is on.
 * 
 * @param defaultSelectableSkillNumber
 * @text Default Selectable Skill Number
 * @desc How many skills can be selected to attempt blending, by default.
 * @type number
 * @default 2
 * 
 * @param skipSkillIds
 * @text Skip Skill IDs
 * @desc When these skills are selected, skip skill blending.
 * @type text
 * @default 1,2
 * 
 */

(() => {
    "use strict";

    const PLUGIN_NAME = document.currentScript.src.match(/([^\/]+)\.js$/)[1];
    const parameters = PluginManager.parameters(PLUGIN_NAME);

    const defaultSelectableSkillNumber = Number(parameters.defaultSelectableSkillNumber || 2);
    const skipSkillIds = (parameters.skipSkillIds || "1,2").split(",").map(Number);

    var SkillBlending = SkillBlending || {};
    SkillBlending.selectedActions = [];

    SkillBlending.recipes = {};

    SkillBlending.tallyMpCostForSelectedActions = function () {
        let cost = 0;
        for (let i = 0; i < SkillBlending.selectedActions.length; i++) {
            const selectedAction = SkillBlending.selectedActions[i];
            cost += selectedAction._item.mpCost;
        }
        return cost;
    }

    SkillBlending.tallyTpCostForSelectedActions = function () {
        let cost = 0;
        for (let i = 0; i < SkillBlending.selectedActions.length; i++) {
            const selectedAction = SkillBlending.selectedActions[i];
            cost += selectedAction._item.tpCost;
        }
        return cost;
    }

    SkillBlending.canPayCost = function (actor, item) {
        if (!actor) return false;

        const mpCost = SkillBlending.tallyMpCostForSelectedActions();
        if (actor.mp < mpCost + item.mpCost) return false;

        const tpCost = SkillBlending.tallyTpCostForSelectedActions();
        if (actor.tp < tpCost + item.tpCost) return false;

        return true;
    }

    SkillBlending.addRecipe = function (resultSkill, id) {
        SkillBlending.recipes[id] = resultSkill;
    }

    SkillBlending.getRecipe = function (id) {
        return SkillBlending.recipes[id];
    }

    SkillBlending.checkForRecipe = function () {
        let actionObjArray = JSON.parse(JSON.stringify(SkillBlending.selectedActions));
        do {
            const skillIdArray = [];
            for (let i = 0; i < actionObjArray.length; i++) {
                const actionObj = actionObjArray[i];
                skillIdArray.push(actionObj._item.id);
            }
            const skillRecipeId = skillIdArray.sort((a, b) => a - b).join(",");
            const receipeResult = SkillBlending.getRecipe(skillRecipeId);
            if (receipeResult) {
                return receipeResult;
            }

            actionObjArray.shift();
        } while (actionObjArray.length > 1);

    }

    SkillBlending.createActionObj = function (action) {
        return {
            _forcing: action._forcing,
            _item: action.item(),
            _subjectActorId: action._subjectActorId,
            _subjectEnemyIndex: action._subjectEnemyIndex,
            _targetIndex: action._targetIndex
        };
    }

    const Llo_SkiBle_Scene_Battle_onActorOk = Scene_Battle.prototype.onActorOk;
    Scene_Battle.prototype.onActorOk = function () {
        const action = BattleManager.inputtingAction();
        const item = action.item();
        if (!DataManager.isSkill(item)) {
            Llo_SkiBle_Scene_Battle_onActorOk.call(this);
            return;
        }
        if (skipSkillIds.includes(item.id)) {
            Llo_SkiBle_Scene_Battle_onActorOk.call(this);
            return;
        }

        action.setTarget(this._actorWindow.index());

        const blendAction = SkillBlending.createActionObj(action);
        this.addSelectedAction(blendAction);

        if (!this._skillBlending) {
            this.applySkillBlending();
            this.hideSubInputWindows();
            this.selectNextCommand();
            return;
        }

        if (SkillBlending.selectedActions.length >= defaultSelectableSkillNumber) {
            this.applySkillBlending();
            this.hideSubInputWindows();
            this.selectNextCommand();
        } else {
            this.selectAnotherSkill();
        }
    };

    Scene_Battle.prototype.selectAnotherSkill = function () {
        this._skillBlending = false;
        this.hideSubInputWindows();
        this._skillWindow.show();
        this._skillWindow.refresh();
        this._skillWindow.activate();
    }

    const Llo_SkiBle_Scene_Battle_onEnemyOk = Scene_Battle.prototype.onEnemyOk;
    Scene_Battle.prototype.onEnemyOk = function () {
        const action = BattleManager.inputtingAction();
        const item = action.item();

        if (!DataManager.isSkill(item)) {
            Llo_SkiBle_Scene_Battle_onEnemyOk.call(this);
            return;
        }
        if (skipSkillIds.includes(item.id)) {
            Llo_SkiBle_Scene_Battle_onEnemyOk.call(this);
            return;
        }

        action.setTarget(this._enemyWindow.enemyIndex());

        const blendAction = SkillBlending.createActionObj(action);
        this.addSelectedAction(blendAction);

        if (!this._skillBlending) {
            this.applySkillBlending();
            this.hideSubInputWindows();
            this.selectNextCommand();
            return;
        }

        if (SkillBlending.selectedActions.length >= defaultSelectableSkillNumber) {
            this.applySkillBlending();
            this.hideSubInputWindows();
            this.selectNextCommand();
        } else {
            this.selectAnotherSkill();
        }
    };

    const Llo_SkiBle_Scene_Battle_onSelectAction = Scene_Battle.prototype.onSelectAction;
    Scene_Battle.prototype.onSelectAction = function () {
        if (!this._skillBlending) {
            Llo_SkiBle_Scene_Battle_onSelectAction.call(this);
            return;
        }

        const action = BattleManager.inputtingAction();
        const item = action.item();

        if (!action.needsSelection() && DataManager.isSkill(item)) {
            if (skipSkillIds.includes(item.id)) {
                Llo_SkiBle_Scene_Battle_onSelectAction.call(this);
                return;
            }

            const blendAction = SkillBlending.createActionObj(action);
            this.addSelectedAction(blendAction);

            if (!this._skillBlending) {
                this.applySkillBlending();
                this.selectNextCommand();
                return;
            }

            if (SkillBlending.selectedActions.length >= defaultSelectableSkillNumber) {
                this.applySkillBlending();
                this.selectNextCommand();
            } else {
                this.selectAnotherSkill();
            }
        } else {
            Llo_SkiBle_Scene_Battle_onSelectAction.call(this);
        }
    };

    Scene_Battle.prototype.addSelectedAction = function (action) {
        SkillBlending.selectedActions.push(action);
        this.updateSelectedActionTrackerWindow();
    }

    Scene_Battle.prototype.removeLastSelectedAction = function () {
        SkillBlending.selectedActions.pop();
        this.updateSelectedActionTrackerWindow();
    }

    Scene_Battle.prototype.updateSelectedActionTrackerWindow = function () {
        const selectedActionCount = SkillBlending.selectedActions.length;
        this._selectedActionTrackerWindow.height = this.calcWindowHeight(selectedActionCount, true);
        this._selectedActionTrackerWindow.y = Graphics.boxHeight - this._statusWindow.height - this._selectedActionTrackerWindow.height;
        this._selectedActionTrackerWindow.refresh();

        if (selectedActionCount <= 0) {
            this._selectedActionTrackerWindow.hide();
        } else {
            this._selectedActionTrackerWindow.show();
        }
    }



    const Llo_SkiBle_Scene_Battle_createSkillWindow = Scene_Battle.prototype.createSkillWindow;
    Scene_Battle.prototype.createSkillWindow = function () {
        const rect = this.skillWindowRect();
        this._skillWindow = new Window_BattleSkill(rect);
        this._skillWindow.setHelpWindow(this._helpWindow);
        this._skillWindow.setHandler("ok", this.onSkillOk.bind(this));
        this._skillWindow.setHandler("cancel", this.onSkillCancel.bind(this));
        this.addWindow(this._skillWindow);

        this._skillWindow.setHandler("pageup", this.flagSkillBlending.bind(this)); // Q
    };

    Scene_Battle.prototype.flagSkillBlending = function () {
        this._skillBlending = true;
        SoundManager.playOk();
        this.onSkillOk();
    }

    const Llo_SkiBle_Scene_Battle_onSkillCancel = Scene_Battle.prototype.onSkillCancel;
    Scene_Battle.prototype.onSkillCancel = function () {
        if (SkillBlending.selectedActions.length > 0) {
            this.removeLastSelectedAction();
            this.selectAnotherSkill();
        } else {
            SkillBlending.selectedActions = [];
            this._skillBlending = false;
            this.updateSelectedActionTrackerWindow();
            Llo_SkiBle_Scene_Battle_onSkillCancel.call(this);
        }
    };

    const Llo_SkiBle_Scene_Battle_startActorCommandSelection = Scene_Battle.prototype.startActorCommandSelection;
    Scene_Battle.prototype.startActorCommandSelection = function () {
        SkillBlending.selectedActions = [];
        this.updateSelectedActionTrackerWindow();
        this._skillBlending = false;
        Llo_SkiBle_Scene_Battle_startActorCommandSelection.call(this);
    };

    Scene_Battle.prototype.applySkillBlending = function () {
        const blendResult = SkillBlending.checkForRecipe();
        if (!blendResult) {
            return;
        }

        const action = BattleManager.inputtingAction();
        action._item = new Game_Item(blendResult);
    }

    const Llo_SkiBle_Scene_Battle_createAllWindows = Scene_Battle.prototype.createAllWindows;
    Scene_Battle.prototype.createAllWindows = function () {
        Llo_SkiBle_Scene_Battle_createAllWindows.call(this);

        this.createSelectedActionTrackerWindow();
    };

    Scene_Battle.prototype.createSelectedActionTrackerWindow = function () {
        const rect = this.selectedActionTrackerWindowRect();
        this._selectedActionTrackerWindow = new Window_SelectedActionTracker(rect);
        this.addWindow(this._selectedActionTrackerWindow);
        this._selectedActionTrackerWindow.hide();
    }

    Scene_Battle.prototype.selectedActionTrackerWindowRect = function () {
        const ww = this.selectedActionTrackerWindowWidth();
        const wh = 0;
        const wx = 0;
        const wy = Graphics.boxHeight - this._statusWindow.height;
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Battle.prototype.selectedActionTrackerWindowWidth = function () {
        return 256;
    }

    //-----------------------------
    // DataManager
    //

    const Llo_SkiBle_DataManager_onLoad = DataManager.onLoad;
    DataManager.onLoad = function (object) {
        Llo_SkiBle_DataManager_onLoad.call(this, object);

        const regex = /<skillBlend:([^>]+)>/g;

        if (object !== $dataSkills) return;

        $dataSkills.forEach(skill => {
            if (!skill) return;

            const matches = [...skill.note.matchAll(regex)];
            matches.forEach(match => {
                let skillList = match[1].split(",").map(Number);
                const skillBlendId = skillList.sort((a, b) => a - b).join(",");
                SkillBlending.addRecipe(skill, skillBlendId);
            });
        });
    };

    //-----------------------------
    // Window_BattleSkill
    //

    const Llo_SkiBle_Window_BattleSkill_isEnabled = Window_BattleSkill.prototype.isEnabled;
    Window_BattleSkill.prototype.isEnabled = function (item) {
        if (!SkillBlending.canPayCost(this._actor, item)) return false;
        return Llo_SkiBle_Window_BattleSkill_isEnabled.call(this, item);
    };


    //-----------------------------------------------------------------------------
    // Window_SelectedActionTracker
    //
    // 

    function Window_SelectedActionTracker() {
        this.initialize(...arguments);
    }

    Window_SelectedActionTracker.prototype = Object.create(Window_Selectable.prototype);
    Window_SelectedActionTracker.prototype.constructor = Window_SelectedActionTracker;

    Window_SelectedActionTracker.prototype.initialize = function (rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
    };

    Window_SelectedActionTracker.prototype.refresh = function () {
        Window_Selectable.prototype.refresh.call(this);
        this.createContents();

        for (let i = 0; i < SkillBlending.selectedActions.length; i++) {
            const selectedAction = SkillBlending.selectedActions[i];
            const rect = this.itemRect(i);
            this.drawText(selectedAction._item.name, rect.x, rect.y, rect.width);
        }
    }


})();
