//=============================================================================
// RPG Maker MZ - Max Level Utility
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [v1.0] A plugin to help you manipulate the max level
 * @author Lloric
 *
 * @help MaxLevelUtility.js
 * 
 * Script Call:
 * 
 * MaxLevelUtility.changeMaxLevelAll(x);
 * x = level delta (+ or -)
 * 
 * MaxLevelUtility.changeMaxLevel(x, y);
 * x = actor id
 * y = level delta (+ or -)
 *
 * @param showMaxLevelInMenu
 * @text Show Max Level In Menu
 * @desc Should the max level be shown in the menu?
 * @default true
 * 
 * @param minLevel
 * @text Minimum Level
 * @desc What is the absolute minimum level?
 * @default 1
 *
 * @param maxLevel
 * @text Maximum Level
 * @desc What is the absolute maximum level?
 * @default 99
 *
 * @command ChangeMaxLevel
 * @text Change Max Level
 * @desc Change the max level of an actor.
 *
 * @arg actorId
 * @text Actor ID
 * @desc The Actor ID
 * @type number
 *
 * @arg levelDelta
 * @text Level Delta
 * @desc The amount to change the level by (can be + or -)
 * @type number
 *
 * @command ChangeMaxLevelAll
 * @text Change Max Level All
 * @desc Change the max level of all actors.
 *
 * @arg levelDelta
 * @text Level Delta
 * @desc The amount to change the level by (can be + or -)
 * @type number
 *
 */

(() => {
    const PLUGIN_NAME = document.currentScript.src.match(/([^\/]+)\.js$/)[1];
    const params = PluginManager.parameters(PLUGIN_NAME);
    const minLevel = Number(params.minLevel || 1);
    const maxLevel = Number(params.maxLevel || 99);
    const showMaxLevelInMenu = params.showMaxLevelInMenu === "true";

    var MaxLevelUtility = MaxLevelUtility || {};
    window.MaxLevelUtility = MaxLevelUtility;

    MaxLevelUtility.changeMaxLevel = function (actorId, levelDelta) {
        const actor = $gameActors.actor(actorId);
        MaxLevelUtility.setLevel(actor, actor._maxLevel + levelDelta);
        if (levelDelta < 0) {
            MaxLevelUtility.levelLowered(actor);
        }
    }

    MaxLevelUtility.changeMaxLevelAll = function (levelDelta) {
        for (let i = 0; i < $dataActors.length; i++) {
            const gameActor = $gameActors.actor(i);
            if (!gameActor) continue;
            MaxLevelUtility.setLevel(gameActor, gameActor._maxLevel + levelDelta);
            if (levelDelta < 0) {
                MaxLevelUtility.levelLowered(gameActor);
            }
        }
    }

    MaxLevelUtility.levelLowered = function (actor) {
        while (actor.level > actor._maxLevel) {
            actor.levelDown();
            const setExpAmount = actor.currentLevelExp();
            actor.setExp(setExpAmount);
        }
    }

    MaxLevelUtility.setLevel = function (actor, level) {
        actor._maxLevel = Math.min(Math.max(level, minLevel), maxLevel);
    }

    PluginManager.registerCommand(PLUGIN_NAME, "ChangeMaxLevel", args => {
        const actorId = Number(args.actorId || 0);
        const levelDelta = Number(args.levelDelta || 0);
        MaxLevelUtility.changeMaxLevel(actorId, levelDelta);
    });

    PluginManager.registerCommand(PLUGIN_NAME, "ChangeMaxLevelAll", args => {
        const levelDelta = Number(args.levelDelta || 0);
        MaxLevelUtility.changeMaxLevelAll(levelDelta);
    });

    //---------------------------------
    // Game_Actor
    //

    const Llo_mlu_Game_Actor_initMembers = Game_Actor.prototype.initMembers;
    Game_Actor.prototype.initMembers = function () {
        Llo_mlu_Game_Actor_initMembers.call(this);
        this._maxLevel = 0;
    };

    const Llo_mlu_Game_Actor_setup = Game_Actor.prototype.setup;
    Game_Actor.prototype.setup = function (actorId) {
        Llo_mlu_Game_Actor_setup.call(this, actorId);

        const actor = $dataActors[actorId];
        this._maxLevel = actor.maxLevel;
    };

    Game_Actor.prototype.maxLevel = function () {
        return this._maxLevel;
    };

    const Llo_mlu_Game_Actor_changeExp = Game_Actor.prototype.changeExp;
    Game_Actor.prototype.changeExp = function (exp, show) {
        if (this.isMaxLevel()) return;

        Llo_mlu_Game_Actor_changeExp.call(this, exp, show);

        if (this.isMaxLevel()) {
            const setExpAmount = this.currentLevelExp();
            this.setExp(setExpAmount);
        }
    };

    Game_Actor.prototype.setExp = function (expAmount) {
        this._exp[this._classId] = expAmount;
    };

    //------------------------------------
    // Window_StatusBase
    //

    const Llo_mlu_Window_StatusBase_drawActorLevel = Window_StatusBase.prototype.drawActorLevel;
    Window_StatusBase.prototype.drawActorLevel = function (actor, x, y) {
        if (showMaxLevelInMenu) {
            this.changeTextColor(ColorManager.systemColor());
            this.drawText(TextManager.levelA, x, y, 48);
            this.resetTextColor();
            this.drawText(actor.level + "/" + actor._maxLevel, x + 84 - 36 * 2, y, 36 * 3, "right");
        } else {
            Llo_mlu_Window_StatusBase_drawActorLevel.call(this, actor, x, y);
        }
    };

})();
