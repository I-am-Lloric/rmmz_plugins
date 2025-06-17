//=============================================================================
// RPG Maker MZ - Active Time Events
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 
 * @author Lloric
 *
 * @param promptText
 * @text Prompt Text
 * @desc
 * @type text
 * @default You have active time events available
 *
 * @param openMenuKey
 * @text Open Active Time Events Menu Key
 * @desc
 * @type number
 * @default 9
 * 
 * @command addEvent
 * @text Add Event
 * @desc 
 *
 * @arg id
 * @text ID
 * @desc 
 * @type text
 *
 * @arg name
 * @text Name
 * @desc 
 * @type text
 *
 * @arg commonEventId
 * @text Common Event ID
 * @desc 
 * @type number
 *
 * @command removeEvent
 * @text Remove Event
 * @desc 
 *
 * @arg id
 * @text ID
 * @desc 
 * @type text
 * 
 * @command endEvent
 * @text End Event
 * @desc 
 *  
 * @help ActiveTimeEvents.js
 *
 * The developer can add 'events' to a list that the player can view at a time
 * that suits them.
 * Those events can 'expire' if not watched quickly enough.
 *
 * How to use;
 * - Call the addEvent plugin command.
 * - Only have a transfer player event in your common event. Move the player to 
 *   the new map.
 * - On the new map, set up an auto run event that fades in.
 *   Then add whatever event commands you wish.
 * - When finishing the event, use the endEvent plugin command.
 *   (And removeEvent if you wish to only allow one viewing of the event)
 * That's it.
 * 
 */

(() => {
    const PLUGIN_NAME = "ActiveTimeEvents";
    const PARAMETERS = PluginManager.parameters(PLUGIN_NAME);

    const PROMPT_TEXT = PARAMETERS.promptText || "Active Time Events";
    const OPEN_MENU_KEY = Number(PARAMETERS.openMenuKey || 9);


    Input.keyMapper[OPEN_MENU_KEY] = 'open_active_time_events_menu_key';

    PluginManager.registerCommand(PLUGIN_NAME, "addEvent", args => {
        const id = args.id || "eventId";
        const name = args.name || "eventName";
        const commonEventId = Number(args.commonEventId || -1);
        ActiveTimeEvents.addEvent(id, name, commonEventId);
    });

    PluginManager.registerCommand(PLUGIN_NAME, "removeEvent", args => {
        const id = args.id || "eventId";
        ActiveTimeEvents.removeEvent(id);
    });

    PluginManager.registerCommand(PLUGIN_NAME, "endEvent", args => {
        const id = ActiveTimeEvents.activeEvent;
        if (id && !ActiveTimeEvents.hasWatched(id)) {
            ActiveTimeEvents.data.watched.push(id);
        }

        $gameScreen.startFadeOut(30);

        setTimeout(() => {
            $gamePlayer.reserveTransfer(
                ActiveTimeEvents.returnMapId,
                ActiveTimeEvents.returnMapX,
                ActiveTimeEvents.returnMapY,
                ActiveTimeEvents.returnMapFacing,
                2
            );
            $gameMap._interpreter.setWaitMode("transfer");
            setTimeout(() => {
                $gamePlayer.setThrough(false);
                $gamePlayer.setOpacity(255);

                $gameScreen.startFadeIn(30);
            }, 1);

        }, 500);

        setTimeout(() => {
            ActiveTimeEvents.inAnEvent = false;
            $gamePlayer.resetStopMovementForActiveTimeEvents();
            $gameSystem.enableMenu();
        }, 1000);
    });

    var ActiveTimeEvents = ActiveTimeEvents || {};
    window.ActiveTimeEvents = ActiveTimeEvents;

    ActiveTimeEvents.data = ActiveTimeEvents.data || {};
    ActiveTimeEvents.data.list = ActiveTimeEvents.data.list || [];
    ActiveTimeEvents.data.watched = [];
    ActiveTimeEvents.data.missed = [];

    ActiveTimeEvents.inAnEvent = false;
    ActiveTimeEvents.activeEvent = "";
    ActiveTimeEvents.returnMapId = -1;
    ActiveTimeEvents.returnMapX = -1;
    ActiveTimeEvents.returnMapY = -1;
    ActiveTimeEvents.returnMapFacing = -1;

    ActiveTimeEvents.hasWatched = function (id) {
        return ActiveTimeEvents.data.watched.includes(id);
    }

    ActiveTimeEvents.hasMissed = function (id) {
        return ActiveTimeEvents.data.missed.includes(id);
    }

    ActiveTimeEvents.addEvent = function (id, name, commonEventId) {
        ActiveTimeEvents.data.list.push({
            id,
            name,
            commonEventId
        });
    }

    ActiveTimeEvents.removeEvent = function (id) {
        if (!ActiveTimeEvents.hasWatched(id) && !ActiveTimeEvents.hasMissed(id)) {
            ActiveTimeEvents.data.missed.push(id);
        }

        ActiveTimeEvents.data.list = ActiveTimeEvents.data.list.filter(ate => ate.id !== id);
    }


    //-----------------------------------------------------------------------------
    // Window_ActiveTimeEvent
    //
    // The window for selecting an item on the item screen.

    function Window_ActiveTimeEvent() {
        this.initialize(...arguments);
    }

    Window_ActiveTimeEvent.prototype = Object.create(Window_Selectable.prototype);
    Window_ActiveTimeEvent.prototype.constructor = Window_ActiveTimeEvent;

    Window_ActiveTimeEvent.prototype.initialize = function (rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this._data = [];
    };

    Window_ActiveTimeEvent.prototype.maxCols = function () {
        return 1;
    };

    Window_ActiveTimeEvent.prototype.colSpacing = function () {
        return 16;
    };

    Window_ActiveTimeEvent.prototype.maxItems = function () {
        return this._data ? this._data.length : 1;
    };

    Window_ActiveTimeEvent.prototype.item = function () {
        return this.itemAt(this.index());
    };

    Window_ActiveTimeEvent.prototype.itemAt = function (index) {
        return this._data && index >= 0 ? this._data[index] : null;
    };

    Window_ActiveTimeEvent.prototype.makeItemList = function () {
        this._data = ActiveTimeEvents.data.list;
        if (this._data.includes(null)) {
            this._data.push(null);
        }
    };

    Window_ActiveTimeEvent.prototype.selectLast = function () {
        const index = ActiveTimeEvents.data.list.length > 0 ? ActiveTimeEvents.data.list.length - 1 : 0;
        this.forceSelect(index >= 0 ? index : 0);
    };

    Window_ActiveTimeEvent.prototype.drawItem = function (index) {
        const item = this.itemAt(index);
        if (item) {
            const rect = this.itemLineRect(index);
            this.changePaintOpacity(1);
            this.drawText(item.name, rect.x, rect.y, rect.width);
        }
    };

    Window_ActiveTimeEvent.prototype.refresh = function () {
        this.makeItemList();
        Window_Selectable.prototype.refresh.call(this);
    };


    //-----------------------------------------------------------------------------
    // Window_ActiveTimeEventsPrompt
    //
    // The window for displaying the description of the selected item.

    function Window_ActiveTimeEventsPrompt() {
        this.initialize(...arguments);
    }

    Window_ActiveTimeEventsPrompt.prototype = Object.create(Window_Base.prototype);
    Window_ActiveTimeEventsPrompt.prototype.constructor = Window_ActiveTimeEventsPrompt;

    Window_ActiveTimeEventsPrompt.prototype.setText = function () {
        this.contents.clear();
        this.drawText(PROMPT_TEXT, 0, 0, this.innerWidth, "center");
    }

    //---------------------------------------
    // Scene_Map
    //

    const Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function () {
        Scene_Map_createAllWindows.call(this);
        this.createActiveTimeEventsPromptWindow();
        this.createActiveTimeEventsWindow();
    };

    Scene_Map.prototype.createActiveTimeEventsPromptWindow = function () {
        const rect = this.activeTimeEventsWindowRect();
        this._activeTimeEventsPromptWindow = new Window_ActiveTimeEventsPrompt(rect);
        this._activeTimeEventsPromptWindow.openness = 0;
        this._activeTimeEventsPromptWindow.setText();
        this.addWindow(this._activeTimeEventsPromptWindow);
    }

    Scene_Map.prototype.createActiveTimeEventsWindow = function () {
        const rect = this.activeTimeEventsWindowRect();
        this._activeTimeEventsWindow = new Window_ActiveTimeEvent(rect);
        this._activeTimeEventsWindow.setHandler("ok", this.onActiveTimeEventsWindowOk.bind(this));
        this._activeTimeEventsWindow.setHandler("cancel", this.onActiveTimeEventsWindowCancel.bind(this));
        this._activeTimeEventsWindow.openness = 0;
        this.addWindow(this._activeTimeEventsWindow);
    }

    Scene_Map.prototype.onActiveTimeEventsWindowOk = function () {
        this.setReturnMapData();
        ActiveTimeEvents.inAnEvent = true;
        this._activeTimeEventsWindow.close();
        $gameScreen.startFadeOut(30);
        setTimeout(() => {
            $gamePlayer.setThrough(true);
            $gamePlayer.setOpacity(0);

            const eventData = this._activeTimeEventsWindow.item();
            ActiveTimeEvents.activeEvent = eventData.id;
            $gameTemp.reserveCommonEvent(eventData.commonEventId);
        }, 500);
    }

    Scene_Map.prototype.setReturnMapData = function () {
        ActiveTimeEvents.returnMapId = $gameMap.mapId();
        ActiveTimeEvents.returnMapX = $gamePlayer.x;
        ActiveTimeEvents.returnMapY = $gamePlayer.y;
        ActiveTimeEvents.returnMapFacing = $gamePlayer.direction();
    }

    Scene_Map.prototype.onActiveTimeEventsWindowCancel = function () {
        this.cancelActiveTimeEventsWindow();
    }

    Scene_Map.prototype.cancelActiveTimeEventsWindow = function () {
        $gamePlayer.resetStopMovementForActiveTimeEvents();
        $gameSystem.enableMenu();

        this._activeTimeEventsWindow.deactivate();
        this._activeTimeEventsWindow.deselect();
        this._activeTimeEventsWindow.close();
        this._activeTimeEventsPromptWindow.open();
    }

    Scene_Map.prototype.activeTimeEventsWindowRect = function () {
        const ww = Graphics.boxWidth * 0.5;
        const wh = this.calcWindowHeight(1, false);
        const wx = Graphics.boxWidth - ww;
        const wy = this.buttonAreaBottom();
        return new Rectangle(wx, wy, ww, wh);
    };

    const Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function () {
        Scene_Map_update.call(this);

        if (!this._lastActiveTimeEventListLength) {
            this._lastActiveTimeEventListLength = -1;
        }

        if (!$gamePlayer.canMove()) {
            this._activeTimeEventsPromptWindow.close();
            this._lastActiveTimeEventListLength = -1;
            return;
        }

        // Check if the active time events list length has changed,
        // If so, show/hide the prompt
        // Update the event list window
        if (!ActiveTimeEvents.inAnEvent && ActiveTimeEvents.data.list.length != this._lastActiveTimeEventListLength) {
            this._lastActiveTimeEventListLength = ActiveTimeEvents.data.list.length;
            this._activeTimeEventsWindow.height = this.calcWindowHeight(this._lastActiveTimeEventListLength, true);
            this._activeTimeEventsWindow.refresh();

            if (this._lastActiveTimeEventListLength === 0) {
                this._activeTimeEventsPromptWindow.close();
            } else {
                this._activeTimeEventsPromptWindow.open();
            }
        }

        // Check for key input
        if (
            $gamePlayer.canMove() &&
            !ActiveTimeEvents.inAnEvent &&
            Input.isTriggered('open_active_time_events_menu_key')
        ) {
            // Check if the event list has any events or not
            if (this._lastActiveTimeEventListLength === 0) return;

            if (this._activeTimeEventsWindow.openness > 0) {
                // Hide the event window
                SoundManager.playCancel();
                this.cancelActiveTimeEventsWindow();
            } else {
                // Show the event window
                $gamePlayer.stopMovementForActiveTimeEvents();
                $gameSystem.disableMenu();

                this._activeTimeEventsPromptWindow.close();
                this._activeTimeEventsWindow.open();
                this._activeTimeEventsWindow.activate();
                this._activeTimeEventsWindow.select(0);
            }
        }

        // Check if IN an event
        if (ActiveTimeEvents.inAnEvent && this._activeTimeEventsPromptWindow.openness > 0) {
            this._activeTimeEventsPromptWindow.close();
        }


    };

    //------------------------------------------------
    // Game_Player
    // 

    const Game_Player_canMove = Game_Player.prototype.canMove;
    Game_Player.prototype.canMove = function () {
        if (this._stopForActiveTimeEventsWindow) {
            return false;
        }

        return Game_Player_canMove.call(this);
    };

    Game_Player.prototype.stopMovementForActiveTimeEvents = function () {
        this._stopForActiveTimeEventsWindow = true;
    }

    Game_Player.prototype.resetStopMovementForActiveTimeEvents = function () {
        this._stopForActiveTimeEventsWindow = false;
    }

    //------------------------------------------------
    // DataManager
    // 

    const DataManager_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function () {
        const contents = DataManager_makeSaveContents.call(this);
        contents.activeTimeEventsData = ActiveTimeEvents.data;
        return contents;
    };

    const DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function (contents) {
        DataManager_extractSaveContents.call(this, contents);
        ActiveTimeEvents.data = contents.activeTimeEventsData;
    };

})();