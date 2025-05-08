/*:
 * @plugindesc Equip Skills
 * @author Lloric
 *
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 *
 * Skills must be equipped by an actor before they can use them.
 * 
 * Learned skills are put into a pool and can be equipped/unequipped 
 * at will.
 * 
 * ============================================================================
 * Terms of Use
 * ============================================================================
 *
 * Free for use in both commercial and non-commercial projects.
 * Please credit YourName.
 *
 * @param MenuText
 * @text Menu Text
 * @desc The name displayed in the menu for navigating to the Equip Skills scene
 * @type string
 * @default Equip Skills
 *
 * @param EquipText
 * @text Equip Text
 * @desc The text displayed in the Equip Skills command window for equipping skills
 * @type string
 * @default Equip
 *
 * @param ClearText
 * @text Clear Text
 * @desc The text displayed in the Equip Skills command window for removing all skills from an actor
 * @type string
 * @default Clear
 *
 * @param DefaultSkillSlots
 * @text Default Skill Slots
 * @desc The default number of skills that can be equipped.
 * @type number
 * @default 4
 *
 * @command changeEquipSlotNumber
 * @text Change Equip Slot Number
 * @desc Change an actor's equip slot number by a given amount.
 *
 * @arg actorId
 * @type number
 * @text Actor ID
 * @desc The actor ID.
 * @default 1
 * 
 * @arg amount
 * @type number
 * @text Amount
 * @desc The amount to change by. (can be + or -)
 * @default 1
 * 
 */

(function () {
    const pluginName = document.currentScript.src.split('/').pop().replace('.js', '');

    // Plugin parameters
    const parameters = PluginManager.parameters(pluginName);

    // Example parameter
    const Llo_equipSkills_menuText = String(parameters['MenuText'] || 'Equip Skills');
    const Llo_equipSkills_equipText = String(parameters['EquipText'] || 'Equip');
    const Llo_equipSkills_clearText = String(parameters['ClearText'] || 'Clear');
    const Llo_equipSkills_defaultSkillSlots = String(parameters['DefaultSkillSlots'] || 4);

    // Register plugin commands
    PluginManager.registerCommand(pluginName, 'changeEquipSlotNumber', args => {
        // Example plugin command logic
        const actorId = Number(args.actorId);
        const amount = Number(args.amount);

        $gameActors.actor(actorId).changeEquipSlotNumber(amount);
    });


    // Actor skills are stored in... $gameActors.actor(x).skills()

    // 


    //-----------------------------------------------------------------------------
    // Game_Actor
    //
    // The game object class for an actor.
    const Llo_EquipSkills_Game_Actor_initMembers = Game_Actor.prototype.initMembers;
    Game_Actor.prototype.initMembers = function () {
        Llo_EquipSkills_Game_Actor_initMembers.call(this);

        // Initialise equippedSkills
        this._equipSlotNumber = 0;
        this._equippedSkills = [];
    };

    Game_Actor.prototype.equippedSkills = function () {
        return this._equippedSkills;
    }

    Game_Actor.prototype.clearEquippedSkills = function () {
        this._equippedSkills = [];

        for (let i = 0; i < this._equipSlotNumber; i++) {
            this._equippedSkills.push(null);
        }
    }

    Game_Actor.prototype.equipDefaultSkills = function () {
        const defaultEquippedSkills = $dataActors[this._actorId].meta.defaultEquippedSkills;
        if (!defaultEquippedSkills) return;

        const equippedSkillList = defaultEquippedSkills.split(',');
        for (let i = 0; i < equippedSkillList.length; i++) {
            const equippedSkill = equippedSkillList[i];
            const skill = $dataSkills[equippedSkill];
            if (skill) {
                this.equipSkill(skill, i);
            }
        }
    }

    const Llo_EquipSkills_Game_Actor_setup = Game_Actor.prototype.setup
    Game_Actor.prototype.setup = function (actorId) {
        Llo_EquipSkills_Game_Actor_setup.call(this, actorId);

        this._equipSlotNumber = Llo_equipSkills_defaultSkillSlots;
        const overrideEquipSlots = $dataActors[this._actorId].meta.equipSlots;
        if (overrideEquipSlots) {
            this._equipSlotNumber = Number(overrideEquipSlots);
        }

        this.clearEquippedSkills();

        // Setup default equipped skills here
        this.equipDefaultSkills();
    };

    Game_Actor.prototype.equipSkill = function (skill, index) {
        if (index >= this._equippedSkills.length) return;
        this._equippedSkills[index] = skill;
    }

    Game_Actor.prototype.unequipSkill = function (index) {
        this._equippedSkills[index] = null;
    }

    Game_Actor.prototype.hasSkillEquipped = function (skill) {
        return this._equippedSkills.includes(skill);
    }

    Game_Actor.prototype.changeEquipSlotNumber = function (amount) {
        if (amount >= 0) {
            this._equipSlotNumber += amount;
            this._equippedSkills.push(null);
            return;
        }

        let newArray = [];
        for (let i = 0; i < this._equippedSkills.length + amount; i++) {

            const equippedSkill = this._equippedSkills[i];
            newArray.push(equippedSkill);
        }

        this._equippedSkills = newArray;
        this._equipSlotNumber += amount; // amount is negative
    }

    //-----------------------------------------------------------------------------
    // Window_BattleSkill
    //
    // The window for selecting a skill to use on the battle screen.

    Window_BattleSkill.prototype.makeItemList = function () {
        if (this._actor) {
            this._data = this._actor.equippedSkills().filter(item => this.includes(item));
        } else {
            this._data = [];
        }
    };

    //-----------------------------------------------------------------------------
    // Scene_Menu
    //
    // The scene class of the menu screen.

    Scene_Menu.prototype.createCommandWindow = function () {
        const rect = this.commandWindowRect();
        const commandWindow = new Window_MenuCommand(rect);
        commandWindow.setHandler("item", this.commandItem.bind(this));
        commandWindow.setHandler("skill", this.commandPersonal.bind(this));

        commandWindow.setHandler("equipSkills", this.commandPersonal.bind(this));

        commandWindow.setHandler("equip", this.commandPersonal.bind(this));
        commandWindow.setHandler("status", this.commandPersonal.bind(this));
        commandWindow.setHandler("formation", this.commandFormation.bind(this));
        commandWindow.setHandler("options", this.commandOptions.bind(this));
        commandWindow.setHandler("save", this.commandSave.bind(this));
        commandWindow.setHandler("gameEnd", this.commandGameEnd.bind(this));
        commandWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(commandWindow);
        this._commandWindow = commandWindow;
    };

    const Llo_EquipSkills_SceneMenu_onPersonalOk = Scene_Menu.prototype.onPersonalOk;
    Scene_Menu.prototype.onPersonalOk = function () {
        if (this._commandWindow.currentSymbol() === "equipSkills") {
            SceneManager.push(Scene_EquipSkills);
            return;
        }
        Llo_EquipSkills_SceneMenu_onPersonalOk.call(this);
    };

    //-----------------------------------------------------------------------------
    // Window_MenuCommand
    //
    // The window for selecting a command on the menu screen.

    Window_MenuCommand.prototype.addMainCommands = function () {
        const enabled = this.areMainCommandsEnabled();
        if (this.needsCommand("item")) {
            this.addCommand(TextManager.item, "item", enabled);
        }
        if (this.needsCommand("skill")) {
            this.addCommand(TextManager.skill, "skill", enabled);
        }
        if (this.needsCommand("equipSkills")) {
            this.addCommand(Llo_equipSkills_menuText, "equipSkills", enabled);
        }
        if (this.needsCommand("equip")) {
            this.addCommand(TextManager.equip, "equip", enabled);
        }
        if (this.needsCommand("status")) {
            this.addCommand(TextManager.status, "status", enabled);
        }
    };

    //-----------------------------------------------------------------------------
    // Scene_EquipSkills
    //
    // The scene class of the equipment screen.

    function Scene_EquipSkills() {
        this.initialize(...arguments);
    }

    Scene_EquipSkills.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_EquipSkills.prototype.constructor = Scene_EquipSkills;

    Scene_EquipSkills.prototype.initialize = function () {
        Scene_MenuBase.prototype.initialize.call(this);
    };

    Scene_EquipSkills.prototype.create = function () {
        Scene_MenuBase.prototype.create.call(this);
        this.createHelpWindow();
        this.createStatusWindow();
        this.createCommandWindow();
        this.createEquippedSkillsWindow();
        this.createSkillPoolWindow();
        this.refreshActor();
    };

    Scene_EquipSkills.prototype.createStatusWindow = function () {
        const rect = this.statusWindowRect();
        this._statusWindow = new Window_EquipSkillsStatus(rect);
        this.addWindow(this._statusWindow);
    };

    Scene_EquipSkills.prototype.statusWindowRect = function () {
        const wx = 0;
        const wy = this.mainAreaTop();
        const ww = Graphics.boxWidth - this.mainCommandWidth();
        const wh = this.calcWindowHeight(3, true);
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_EquipSkills.prototype.createCommandWindow = function () {
        const rect = this.commandWindowRect();
        this._commandWindow = new Window_EquipSkillCommand(rect);
        this._commandWindow.setHelpWindow(this._helpWindow);
        this._commandWindow.setHandler("equip", this.commandEquip.bind(this));
        this._commandWindow.setHandler("clear", this.commandClear.bind(this));
        this._commandWindow.setHandler("cancel", this.popScene.bind(this));
        this._commandWindow.setHandler("pagedown", this.nextActor.bind(this));
        this._commandWindow.setHandler("pageup", this.previousActor.bind(this));
        this.addWindow(this._commandWindow);
    };

    Scene_EquipSkills.prototype.commandWindowRect = function () {
        const wx = Graphics.boxWidth - this.mainCommandWidth();
        const wy = this.mainAreaTop();
        const ww = this.mainCommandWidth();
        const wh = this.calcWindowHeight(3, true);
        return new Rectangle(wx, wy, ww, wh);
    };


    Scene_EquipSkills.prototype.createEquippedSkillsWindow = function () {
        const rect = this.itemWindowRect();
        rect.x = Graphics.boxWidth / 2;
        this._equippedWindow = new Window_EquippedSkillList(rect);
        this._equippedWindow.setHelpWindow(this._helpWindow);
        this._equippedWindow.setHandler("ok", this.onEquippedOk.bind(this));
        this._equippedWindow.setHandler("cancel", this.onEquippedCancel.bind(this));
        this.addWindow(this._equippedWindow);
    };

    Scene_EquipSkills.prototype.createSkillPoolWindow = function () {
        const rect = this.itemWindowRect();
        this._poolWindow = new Window_FullSkillList(rect);
        this._poolWindow.setHelpWindow(this._helpWindow);
        this._poolWindow.setHandler("ok", this.onPoolOk.bind(this));
        this._poolWindow.setHandler("cancel", this.onPoolCancel.bind(this));
        this.addWindow(this._poolWindow);
    };

    Scene_EquipSkills.prototype.itemWindowRect = function () {
        const commandWindowRect = this.commandWindowRect();
        const wx = 0;
        const wy = commandWindowRect.y + commandWindowRect.height;
        const ww = Graphics.boxWidth / 2;
        const wh = this.mainAreaHeight() - commandWindowRect.height;
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_EquipSkills.prototype.refreshActor = function () {
        const actor = this.actor();
        this._commandWindow.setActor(actor);
        this._poolWindow.setActor(actor);
        this._equippedWindow.setActor(actor);
        this._statusWindow.setActor(actor);

        this._poolWindow.refresh();
        this._equippedWindow.refresh();
    };

    Scene_EquipSkills.prototype.commandEquip = function () {
        this._equippedWindow.select(0);
        this._equippedWindow.activate();
    };

    Scene_EquipSkills.prototype.commandClear = function () {
        SoundManager.playEquip();
        this.actor().clearEquippedSkills();
        this._equippedWindow.refresh();
        this._poolWindow.refresh();

        this._commandWindow.activate();
    };

    Scene_EquipSkills.prototype.onPoolOk = function () {
        SoundManager.playEquip();
        this.executeSkillChange();

        this.refreshActor();
        this._poolWindow.deselect();
        this._equippedWindow.activate();
    };

    Scene_EquipSkills.prototype.onPoolCancel = function () {
        this._equippedWindow.activate();
        this._poolWindow.deselect();
    };

    Scene_EquipSkills.prototype.onEquippedOk = function () {
        this._poolWindow.select(0);
        this._poolWindow.activate();
    };

    Scene_EquipSkills.prototype.executeSkillChange = function () {
        const poolSkill = this._poolWindow.item();
        const equipSkillIndex = this._equippedWindow.index();
        const equipSkill = this._equippedWindow.item();

        this.actor().equipSkill(poolSkill, equipSkillIndex);
    };

    Scene_EquipSkills.prototype.onEquippedCancel = function () {
        this._equippedWindow.deselect();
        this._commandWindow.activate();
    };

    Scene_EquipSkills.prototype.onActorChange = function () {
        Scene_MenuBase.prototype.onActorChange.call(this);
        this.refreshActor();
        this._commandWindow.activate();
    };

    //-----------------------------------------------------------------------------
    // Window_EquipSkillsStatus
    //
    // The window for displaying the skill user's status on the skill screen.

    function Window_EquipSkillsStatus() {
        this.initialize(...arguments);
    }

    Window_EquipSkillsStatus.prototype = Object.create(Window_StatusBase.prototype);
    Window_EquipSkillsStatus.prototype.constructor = Window_EquipSkillsStatus;

    Window_EquipSkillsStatus.prototype.initialize = function (rect) {
        Window_StatusBase.prototype.initialize.call(this, rect);
        this._actor = null;
    };

    Window_EquipSkillsStatus.prototype.setActor = function (actor) {
        if (this._actor !== actor) {
            this._actor = actor;
            this.refresh();
        }
    };

    Window_EquipSkillsStatus.prototype.refresh = function () {
        Window_StatusBase.prototype.refresh.call(this);
        if (this._actor) {
            const x = this.colSpacing() / 2;
            const h = this.innerHeight;
            const y = h / 2 - this.lineHeight() * 1.5;
            this.drawActorFace(this._actor, x + 1, 0, 144, h);
            this.drawActorSimpleStatus(this._actor, x + 180, y);
        }
    };

    //-----------------------------------------------------------------------------
    // Window_EquipSkillCommand
    //
    // The window for selecting a skill type on the skill screen.

    function Window_EquipSkillCommand() {
        this.initialize(...arguments);
    }

    Window_EquipSkillCommand.prototype = Object.create(Window_Command.prototype);
    Window_EquipSkillCommand.prototype.constructor = Window_EquipSkillCommand;

    Window_EquipSkillCommand.prototype.initialize = function (rect) {
        Window_Command.prototype.initialize.call(this, rect);
        this._actor = null;
    };

    Window_EquipSkillCommand.prototype.setActor = function (actor) {
        if (this._actor !== actor) {
            this._actor = actor;
            this.refresh();
        }
    };

    Window_EquipSkillCommand.prototype.makeCommandList = function () {
        if (this._actor) {
            this.addCommand(Llo_equipSkills_equipText, "equip", true);
            this.addCommand(Llo_equipSkills_clearText, "clear", true);
        }
    };

    Window_EquipSkillCommand.prototype.update = function () {
        Window_Command.prototype.update.call(this);
        if (this._skillWindow) {
            this._skillWindow.setStypeId(this.currentExt());
        }
    };


    function Window_EquippedSkillList() {
        this.initialize(...arguments);
    }

    Window_EquippedSkillList.prototype = Object.create(Window_SkillList.prototype);
    Window_EquippedSkillList.prototype.constructor = Window_EquippedSkillList;

    Window_EquippedSkillList.prototype.initialize = function (rect) {
        Window_SkillList.prototype.initialize.call(this, rect);
    };

    Window_EquippedSkillList.prototype.makeItemList = function () {
        if (this._actor) {
            this._data = this._actor.equippedSkills().filter(item => this.includes(item));
        } else {
            this._data = [];
        }
    };

    Window_EquippedSkillList.prototype.includes = function (item) {
        return true;
    };

    Window_EquippedSkillList.prototype.maxCols = function () {
        return 1;
    };

    Window_EquippedSkillList.prototype.isEnabled = function (item) {
        return true;
    };


    function Window_FullSkillList() {
        this.initialize(...arguments);
    }

    Window_FullSkillList.prototype = Object.create(Window_SkillList.prototype);
    Window_EquippedSkillList.prototype.constructor = Window_FullSkillList;

    Window_FullSkillList.prototype.initialize = function (rect) {
        Window_SkillList.prototype.initialize.call(this, rect);
    };

    Window_FullSkillList.prototype.makeItemList = function () {
        if (this._actor) {
            this._data = this._actor.skills().filter(skill => this.includes(skill));
        } else {
            this._data = [];
        }
    };

    Window_FullSkillList.prototype.includes = function (skill) {
        return skill;
    };

    Window_FullSkillList.prototype.maxCols = function () {
        return 1;
    };

    Window_FullSkillList.prototype.isEnabled = function (skill) {
        return !this._actor.hasSkillEquipped(skill);
    };

})();

