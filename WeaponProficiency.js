//=============================================================================
// RPG Maker MZ - Weapon Proficiency
//=============================================================================

/*:
 * @target MZ
 * @plugindesc When an actor uses a weapon type, they will gain exp for that weapon and can gain Weapon Proficiency levels.
 * @author Lloric
 * 
 * @param startingProficiency
 * @text Starting Proficiency
 * @desc The default/starting proficiency level for all weapons
 * @type number
 * @default 0
 * 
 * @param defaultExpGained
 * @text Default Exp Gained
 * @desc The default amount of weapon proficiency exp gained from using a skill
 * @type number
 * @default 1
 * 
 * @param maximumProficiencyLevel
 * @text Maximum Proficiency Level
 * @desc The highest level a weapon proficiency can reach
 * @type number
 * @default 5
 * 
 * @param expFormula
 * @text Exp Formula
 * @desc The formula to provide how much exp is required to level up (using wpnProfLvl will replace with the actual proficiency level)
 * @type text
 * @default 10 * (1 + (Math.sqrt(wpnProfLvl) / 10))
 * 
 * @param levelUpText
 * @text Level Up Text
 * @desc The text displayed when an actor gains a level in weapon proficiency. Can use: {actor_name} {weapon_type_name} {proficiency_level}
 * @type text
 * @default {actor_name} gained proficiency with {weapon_type_name}! [Lv {proficiency_level}]
 * 
 * @param menuCommandText
 * @text Menu Command Text
 * @desc The text displayed for the weapon proficiency scene in the menu command window.
 * @type text
 * @default Weapon Proficiency
 * 
 * @param maximumProficiencyLevelText
 * @text Maximum Proficiency Level Text
 * @desc The text displayed in the weapon proficiency scene when a weapon has reached max proficiency.
 * @type text
 * @default MAX
 * 
 * @param individualExp
 * @text Individual Exp
 * @desc Should the actor gain weapon proficiency exp for every target hit? (False = only gain exp once per attack, not per target)
 * @type boolean
 * @default true
 * 
 * @help
 * 
 * Weapon Proficiencies only appear in the actor's weapon proficiency scene IF they can use that weapon type
 * 
 * Actor Notetags
 * <weaponProficiency:x y>
 * x = weapon type id
 * y = starting weapon profiency level
 * 
 * Skill Notetags
 * <weaponProficiencyExp:x>
 * x = the amount of weapon proficiency exp gained when using this skill
 *
 * <alwaysRewardWeaponProficiencyExp>
 * This will grant weapon proficiency exp to whichever weapon type is equipped
 * 
 */

(() => {
    'use strict';

    const pluginName = "WeaponProficiency";
    const parameters = PluginManager.parameters(pluginName);
    const startingProficiency = Number(parameters.startingProficiency || 0);
    const defaultExpGained = Number(parameters.defaultExpGained || 1);
    const maximumProficiencyLevel = Number(parameters.maximumProficiencyLevel || 100);
    const individualExp = parameters.individualExp === "true";
    const expFormula = parameters.expFormula || "10 * (1 + (Math.sqrt(wpnProfLvl) / 10))";
    const levelUpText = parameters.levelUpText || "{actor_name} Weapon Proficiency Up";
    const menuCommandText = parameters.menuCommandText || "Wpn Prof";
    const maximumProficiencyLevelText = parameters.maximumProficiencyLevelText || "--";

    const WEAPON_PROFICIENCY_REGEX = /<weaponProficiency:(\d+)\s+(\d+)>/g;
    const WEAPON_PROFICIENCY_SYMBOL = "weaponProficiency";

    //-------------------------
    // Game_Actor
    //

    const Llo_WeaPro_Game_Actor_initMembers = Game_Actor.prototype.initMembers;
    Game_Actor.prototype.initMembers = function () {
        Llo_WeaPro_Game_Actor_initMembers.call(this);

        this._weaponProficiencies = {};

        const weaponTypes = $dataSystem.weaponTypes;
        for (let i = 0; i < weaponTypes.length; i++) {
            const weaponType = weaponTypes[i];
            if (!weaponType) continue;

            this._weaponProficiencies[i] = {
                level: startingProficiency,
                exp: 0,
            };
        }

    };

    const Llo_WeaPro_Game_Actor_setup = Game_Actor.prototype.setup;
    Game_Actor.prototype.setup = function (actorId) {
        Llo_WeaPro_Game_Actor_setup.call(this, actorId);

        const actor = $dataActors[actorId];
        const matches = [...actor.note.matchAll(WEAPON_PROFICIENCY_REGEX)];
        if (!matches) return;

        matches.forEach(match => {
            const wtypeId = Number(match[1]);
            const proficiencyLevel = Number(match[2]);
            if (wtypeId && proficiencyLevel) {
                this.setWeaponProficiency(wtypeId, proficiencyLevel);
            }
        });

    };

    Game_Actor.prototype.setWeaponProficiency = function (wtypeId, proficiencyLevel) {
        this._weaponProficiencies[wtypeId].level = proficiencyLevel;
        this.checkForMaxWeaponProficiencyLevel(wtypeId);
    }

    Game_Actor.prototype.incrementWeaponProficiency = function (wtypeId) {
        this._weaponProficiencies[wtypeId].level = (this._weaponProficiencies[wtypeId].level + 1);
        this.checkForMaxWeaponProficiencyLevel(wtypeId);
    }

    Game_Actor.prototype.checkForMaxWeaponProficiencyLevel = function (wtypeId) {
        const level = this._weaponProficiencies[wtypeId].level;
        this._weaponProficiencies[wtypeId].level = level.clamp(0, maximumProficiencyLevel)

        if (this.getWeaponProficiencyLevel(wtypeId) === maximumProficiencyLevel) {
            this.setWeaponProficiencyExp(wtypeId, 0);
        }
    }

    Game_Actor.prototype.getWeaponProficiencyLevel = function (wtypeId) {
        return this._weaponProficiencies[wtypeId].level;
    }

    Game_Actor.prototype.getWeaponProficiencyExp = function (wtypeId) {
        return this._weaponProficiencies[wtypeId].exp;
    }

    Game_Actor.prototype.setWeaponProficiencyExp = function (wtypeId, value) {
        this._weaponProficiencies[wtypeId].exp = value;
    }

    Game_Actor.prototype.gainWeaponProficiencyExp = function (wtypeId, exp) {
        if (this.getWeaponProficiencyLevel(wtypeId) === maximumProficiencyLevel) return;
        this._weaponProficiencies[wtypeId].exp += exp;

        this.checkForWeaponProficiencyLevelUp(wtypeId);
    }

    Game_Actor.prototype.checkForWeaponProficiencyLevelUp = function (wtypeId) {

        let currentExp = this.getWeaponProficiencyExp(wtypeId);
        let currentLevel = this.getWeaponProficiencyLevel(wtypeId);
        let expToLevelUp = this.getWeaponProficiencyExpForLevel(currentLevel + 1);
        do {
            currentExp = this.getWeaponProficiencyExp(wtypeId);
            currentLevel = this.getWeaponProficiencyLevel(wtypeId);
            expToLevelUp = this.getWeaponProficiencyExpForLevel(currentLevel + 1);

            if (currentExp >= expToLevelUp) {
                // Should level up
                this.setWeaponProficiencyExp(wtypeId, currentExp - expToLevelUp);
                this.incrementWeaponProficiency(wtypeId);

                let message = levelUpText;
                message = message.replace("{actor_name}", this.name());
                message = message.replace("{weapon_type_name}", $dataSystem.weaponTypes[wtypeId]);
                message = message.replace("{proficiency_level}", currentLevel + 1);
                $gameMessage.add(message);
            }
        } while (currentExp >= expToLevelUp);
    }

    Game_Actor.prototype.getWeaponProficiencyExpForLevel = function (level) {
        let formula = expFormula;
        formula = formula.replaceAll("wpnProfLvl", level);
        return Math.ceil(eval(formula));
    }

    const Llo_WeaPro_DataManager_onLoad = DataManager.onLoad;
    DataManager.onLoad = function (object) {
        Llo_WeaPro_DataManager_onLoad.call(this, object);

        if (object === $dataSkills) {
            for (let i = 0; i < $dataSkills.length; i++) {
                const skill = $dataSkills[i];
                if (!skill) continue;
                skill._weaponProficiencyExp = Number(skill.meta.weaponProficiencyExp ?? defaultExpGained);
            }
        }
    };

    //----------------------------
    // Game_Action
    //

    const Llo_WeaPro_Game_Action_apply = Game_Action.prototype.apply;
    Game_Action.prototype.apply = function (target) {
        Llo_WeaPro_Game_Action_apply.call(this, target);

        const subject = this.subject();
        const skill = this.item();

        if (subject instanceof Game_Enemy) return;
        if (!DataManager.isSkill(skill)) return;
        if (this._alreadyAppliedExp) return;


        const result = target.result();
        if (result.isHit()) {
            const weapon = subject.equips()[0];

            if (!weapon) return;

            if (!skill.meta.alwaysRewardWeaponProficiencyExp) {
                // If we are NOT rewarding WP exp for any equipped weapon...
                // check the equipped weapon
                if (skill.requiredWtypeId1 !== weapon.wtypeId &&
                    skill.requiredWtypeId2 !== weapon.wtypeId) return;
            }

            const wtypeId = weapon.wtypeId;
            subject.gainWeaponProficiencyExp(wtypeId, skill._weaponProficiencyExp);
            if (!individualExp) {
                this._alreadyAppliedExp = true;
            }
        }
    };

    const Llo_WeaPro_BattleManager_endAction = BattleManager.endAction;
    BattleManager.endAction = function () {
        if (this._subject && this._subject instanceof Game_Actor) {
            this._subject._alreadyAppliedExp = false;
        }
        Llo_WeaPro_BattleManager_endAction.call(this);
    };

    //-----------------------------------------------------------------------------
    // Scene_ActorWeaponProficiency
    //
    // The scene class of the skill screen.

    function Scene_ActorWeaponProficiency() {
        this.initialize(...arguments);
    }

    Scene_ActorWeaponProficiency.prototype = Object.create(Scene_ItemBase.prototype);
    Scene_ActorWeaponProficiency.prototype.constructor = Scene_ActorWeaponProficiency;

    Scene_ActorWeaponProficiency.prototype.initialize = function () {
        Scene_ItemBase.prototype.initialize.call(this);
    };

    Scene_ActorWeaponProficiency.prototype.create = function () {
        Scene_ItemBase.prototype.create.call(this);
        this.createStatusWindow();
        this.createItemWindow();
        this.createActorWindow();
    };

    Scene_ActorWeaponProficiency.prototype.start = function () {
        Scene_ItemBase.prototype.start.call(this);
        this.refreshActor();
    };

    Scene_ActorWeaponProficiency.prototype.createStatusWindow = function () {
        const rect = this.statusWindowRect();
        this._statusWindow = new Window_SkillStatus(rect);
        this.addWindow(this._statusWindow);
    };

    Scene_ActorWeaponProficiency.prototype.statusWindowRect = function () {
        const ww = Graphics.boxWidth;
        const wh = this.calcWindowHeight(3, true);
        const wx = this.isRightInputMode() ? 0 : Graphics.boxWidth - ww;
        const wy = this.mainAreaTop();
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_ActorWeaponProficiency.prototype.createItemWindow = function () {
        const rect = this.itemWindowRect();
        this._itemWindow = new Window_WeaponProficiencyList(rect);
        this._itemWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(this._itemWindow);

        this._itemWindow.refresh();
        this._itemWindow.select(0);
        this._itemWindow.activate();
    };

    Scene_ActorWeaponProficiency.prototype.itemWindowRect = function () {
        const wx = 0;
        const wy = this._statusWindow.y + this._statusWindow.height;
        const ww = Graphics.boxWidth;
        const wh = Graphics.boxHeight - this.mainAreaTop() - this._statusWindow.height;
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_ActorWeaponProficiency.prototype.needsPageButtons = function () {
        return true;
    };

    Scene_ActorWeaponProficiency.prototype.arePageButtonsEnabled = function () {
        return !this.isActorWindowActive();
    };

    Scene_ActorWeaponProficiency.prototype.refreshActor = function () {
        const actor = this.actor();
        this._statusWindow.setActor(actor);
        this._itemWindow.setActor(actor);
    };

    Scene_ActorWeaponProficiency.prototype.user = function () {
        return this.actor();
    };

    Scene_ActorWeaponProficiency.prototype.onActorChange = function () {
        Scene_MenuBase.prototype.onActorChange.call(this);
        this.refreshActor();
        this._itemWindow.deselect();
        this._skillTypeWindow.activate();
    };

    //-----------------------------------------------------------------------------
    // Window_WeaponProficiencyList
    //
    // The window for selecting a skill on the skill screen.

    function Window_WeaponProficiencyList() {
        this.initialize(...arguments);
    }

    Window_WeaponProficiencyList.prototype = Object.create(Window_SkillList.prototype);
    Window_WeaponProficiencyList.prototype.constructor = Window_WeaponProficiencyList;

    Window_WeaponProficiencyList.prototype.initialize = function (rect) {
        Window_SkillList.prototype.initialize.call(this, rect);

    };

    Window_WeaponProficiencyList.prototype.maxCols = function () {
        return 1;
    };

    Window_WeaponProficiencyList.prototype.includes = function (wtypeId) {
        return this._actor.isEquipWtypeOk(wtypeId);
    };

    Window_WeaponProficiencyList.prototype.isEnabled = function (item) {
        return true;
    };

    Window_WeaponProficiencyList.prototype.makeItemList = function () {
        if (this._actor) {
            this._data = [];
            for (let i = 0; i < $dataSystem.weaponTypes.length; i++) {
                if (this.includes(i)) {
                    this._data.push(i);
                }
            }
        } else {
            this._data = [];
        }
    };

    Window_WeaponProficiencyList.prototype.drawItem = function (index) {
        const wtypeId = this.itemAt(index);
        if (wtypeId) {
            const rect = this.itemLineRect(index);
            const weaponTypeName = $dataSystem.weaponTypes[wtypeId];
            if (!weaponTypeName) return;
            const currentExp = this._actor.getWeaponProficiencyExp(wtypeId);
            const level = this._actor.getWeaponProficiencyLevel(wtypeId);
            const expForNextLevel = this._actor.getWeaponProficiencyExpForLevel(level + 1);
            const startText = weaponTypeName + " Lv" + level;
            let endText = `${currentExp}/${expForNextLevel}`;
            if (level === maximumProficiencyLevel) {
                endText = maximumProficiencyLevelText;
            }


            this.drawText(startText, rect.x, rect.y, rect.width);
            this.drawText(endText, rect.x, rect.y, rect.width, "right");
        }
    };

    Window_WeaponProficiencyList.prototype.refresh = function () {
        this.makeItemList();
        Window_Selectable.prototype.refresh.call(this);
    };

    //-----------------------------
    // Scene_Menu
    // 

    const Llo_WeaPro_Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
    Scene_Menu.prototype.createCommandWindow = function () {
        Llo_WeaPro_Scene_Menu_createCommandWindow.call(this);
        this._commandWindow.setHandler(WEAPON_PROFICIENCY_SYMBOL, this.commandPersonal.bind(this));
    };

    const Llo_WeaPro_Scene_Menu_onPersonalOk = Scene_Menu.prototype.onPersonalOk;
    Scene_Menu.prototype.onPersonalOk = function () {
        if (this._commandWindow.currentSymbol() === WEAPON_PROFICIENCY_SYMBOL) {
            SceneManager.push(Scene_ActorWeaponProficiency);
            return;
        }

        Llo_WeaPro_Scene_Menu_onPersonalOk.call(this);
    };

    const Llo_WeaPro_Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
    Window_MenuCommand.prototype.addOriginalCommands = function () {
        Llo_WeaPro_Window_MenuCommand_addOriginalCommands.call(this);

        const enabled = this.areMainCommandsEnabled();
        this.addCommand(menuCommandText, WEAPON_PROFICIENCY_SYMBOL, enabled);
    };

})();
