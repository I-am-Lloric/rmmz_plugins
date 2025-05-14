//=============================================================================
// RPG Maker MZ - SkillCardBattleSystem.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc A battle system which limits the skills an actor can use in 
 * battle
 * @author Lloric
 * 
 * @param skillCommandMenuText
 * @text Skill Command Menu Text
 * @type text
 * @desc The text displayed in the battle command menu for the 'skill' command
 * @default Skills
 * 
 * @param passCommandMenuText
 * @text Pass Command Menu Text
 * @type text
 * @desc The text displayed in the battle command menu for the 'pass' command
 * @default Pass
 * 
 * @param defaultNumberOfSkillCardsChosenPerTurn
 * @text Default Number of Skill Cards Chosen Per Turn
 * @type number
 * @desc The number of skills an actor can choose from each turn (default).
 * @default 3
 * 
 * @param battleType
 * @text Battle Type
 * @type select
 * @option All Skills
 * @value allSkills
 * @option Skill Array
 * @value skillArray
 * @desc All Skills = Every turn, skills are chosen from the actor's entire skill list.
 * Skill Array = Chosen skills are removed from the skill array next turn. Once all skills 
 * have been used, the array will reset.
 * @default allSkills
 * 
 * @command ChangeNumberOfSkillCardsChosenPerTurn
 * @text Change Number of Skill Cards Chosen Per Turn
 * @desc Increase or decrease the number of skill cards chosen per turn for an actor
 *
 * @arg actorId
 * @text Actor ID
 * @type number
 * @desc The actor ID
 * 
 * @arg value
 * @text Value
 * @type number
 * @desc The number to change by (+ or -)
 * 
 * 
 * @help
 * Actor Notetags
 * 
 * <NumberOfSkillCardsChosenPerTurn:X>
 * The actor can choose from X number of skills each turn
 * 
 * 
 * 
 */

(() => {
    const battleTypeAllSkills = "allSkills";
    const battleTypeSkillArray = "skillArray"

    // Retrieve plugin parameters
    const pluginName = document.currentScript.src.match(/([^\/]+)\.js$/)[1];
    const parameters = PluginManager.parameters(pluginName);
    const skillCommandMenuText = parameters['skillCommandMenuText'] || "Skills";
    const passCommandMenuText = parameters['passCommandMenuText'] || "Pass";
    const defaultNumberOfSkillCardsChosenPerTurn = Number(parameters['defaultNumberOfSkillCardsChosenPerTurn'] || 3);
    const battleType = parameters['battleType'] || battleTypeAllSkills;


    PluginManager.registerCommand(pluginName, "ChangeNumberOfSkillCardsChosenPerTurn", args => {
        const actorId = Number(args.actorId || 0);
        const value = Number(args.value || 0);

        $gameActors.actor(actorId)._numberOfSkillCardsChosenPerTurn += value;
        if ($gameActors.actor(actorId)._numberOfSkillCardsChosenPerTurn < 1) {
            $gameActors.actor(actorId)._numberOfSkillCardsChosenPerTurn = 1;
        }
    });

    const Llo_SCBS_Scene_Battle_createActorCommandWindow = Scene_Battle.prototype.createActorCommandWindow;
    Scene_Battle.prototype.createActorCommandWindow = function () {
        Llo_SCBS_Scene_Battle_createActorCommandWindow.call(this);
        this._actorCommandWindow.setHandler("skillCard", this.commandSkillCard.bind(this));
        this._actorCommandWindow.setHandler("pass", this.commandPass.bind(this));
    };

    Scene_Battle.prototype.createSkillWindow = function () {
        const rect = this.skillWindowRect();
        this._skillWindow = new Window_SC_BattleSkill(rect);
        this._skillWindow.setHelpWindow(this._helpWindow);
        this._skillWindow.setHandler("ok", this.onSkillOk.bind(this));
        this._skillWindow.setHandler("cancel", this.onSkillCancel.bind(this));
        this.addWindow(this._skillWindow);
    };

    Scene_Battle.prototype.commandSkillCard = function () {
        this._skillWindow.setActor(BattleManager.actor());
        this._skillWindow.refresh();
        this._skillWindow.show();
        this._skillWindow.activate();
        this._statusWindow.hide();
        this._actorCommandWindow.hide();
    };

    Scene_Battle.prototype.commandPass = function () {
        this.selectNextCommand();
    }

    Window_ActorCommand.prototype.makeCommandList = function () {
        if (this._actor) {
            this.addCommand(skillCommandMenuText, "skillCard", true);
            this.addItemCommand();
            this.addCommand(passCommandMenuText, "pass", true);
        }
    };


    //-----------------------------------------------------------------------------
    // Window_SC_BattleSkill
    //
    // The window for selecting a skill to use on the battle screen.

    function Window_SC_BattleSkill() {
        this.initialize(...arguments);
    }

    Window_SC_BattleSkill.prototype = Object.create(Window_BattleSkill.prototype);
    Window_SC_BattleSkill.prototype.constructor = Window_SC_BattleSkill;

    Window_SC_BattleSkill.prototype.initialize = function (rect) {
        Window_BattleSkill.prototype.initialize.call(this, rect);
    };

    Window_SC_BattleSkill.prototype.includes = function (item) {
        return item;
    };

    Window_SC_BattleSkill.prototype.makeItemList = function () {
        if (this._actor) {
            this._data = this._actor._skillCards.filter(item => this.includes(item));
        } else {
            this._data = [];
        }
    };

    const Llo_SCBS_BattleManager_startActorInput = BattleManager.startActorInput;
    BattleManager.startActorInput = function () {
        if (this._currentActor && !this._currentActor._skillsAlreadyChosen) {
            // Set a 'skills already chosen' flag            
            this._currentActor._skillsAlreadyChosen = true;
            // Select X skills from the actor's pool
            if (battleType === battleTypeAllSkills) {
                this.chooseSkillCardsForActor(this._currentActor);
            }
            if (battleType === battleTypeSkillArray) {
                this.skillArrayChooseSkillCardsForActor(this._currentActor);
            }
        }

        Llo_SCBS_BattleManager_startActorInput.call(this);
    };

    BattleManager.skillArrayChooseSkillCardsForActor = function (actor) {
        actor._skillCards = [];

        if (actor._temporarySkillCardArray.length <= 0) {
            actor._temporarySkillCardArray = actor.skills();
        }

        for (let i = 0; i < actor._numberOfSkillCardsChosenPerTurn; i++) {
            if (actor._temporarySkillCardArray.length <= 0) break;

            const min = Math.ceil(0);
            const max = Math.floor(actor._temporarySkillCardArray.length);
            const skillIndex = Math.floor(Math.random() * (max - min)) + min;
            const skill = actor._temporarySkillCardArray[skillIndex];
            actor._temporarySkillCardArray = actor._temporarySkillCardArray.filter(s => s != skill);
            actor._skillCards.push(skill);
        }
    }

    BattleManager.chooseSkillCardsForActor = function (actor) {
        actor._skillCards = [];
        let actorSkillArray = actor.skills();
        for (let i = 0; i < actor._numberOfSkillCardsChosenPerTurn; i++) {
            if (actorSkillArray.length <= 0) break;

            const min = Math.ceil(0);
            const max = Math.floor(actorSkillArray.length);
            const skillIndex = Math.floor(Math.random() * (max - min)) + min;
            const skill = actorSkillArray[skillIndex];
            actorSkillArray = actorSkillArray.filter(s => s != skill);
            actor._skillCards.push(skill);
        }
    }

    const Llo_SCBS_BattleManager_finishActorInput = BattleManager.finishActorInput;
    BattleManager.finishActorInput = function () {
        if (this._currentActor && this._currentActor._skillsAlreadyChosen) {
            // Reset the 'skills already chosen' flag
            this._currentActor._skillsAlreadyChosen = false;
        }

        Llo_SCBS_BattleManager_finishActorInput.call(this);
    };

    const Llo_SCBS_Game_Actor_initMembers = Game_Actor.prototype.initMembers;
    Game_Actor.prototype.initMembers = function () {
        Llo_SCBS_Game_Actor_initMembers.call(this);
        this._skillCards = [];
        this._numberOfSkillCardsChosenPerTurn = 0;

        if (battleType === battleTypeSkillArray) {
            this._temporarySkillCardArray = [];
        }

    };

    const Llo_SCBS_Game_Actor_setup = Game_Actor.prototype.setup;
    Game_Actor.prototype.setup = function (actorId) {
        Llo_SCBS_Game_Actor_setup.call(this, actorId);

        this._numberOfSkillCardsChosenPerTurn = defaultNumberOfSkillCardsChosenPerTurn;
        const actor = $dataActors[actorId];
        const numberOfSkillCardsChosenPerTurn = actor.meta.NumberOfSkillCardsChosenPerTurn;
        if (numberOfSkillCardsChosenPerTurn) {
            this._numberOfSkillCardsChosenPerTurn = numberOfSkillCardsChosenPerTurn;
        }
    };

})();
