//=============================================================================
// RPG Maker MZ - Variable Window
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Creates a simple window to display a variable value (and optional icon)
 * @author Lloric
 * 
 * @param variableId
 * @text Variable ID
 * @desc The ID of the variable to display in the window.
 * @type number
 * @default 0
 * 
 * @param showIcon
 * @text Show Icon?
 * @desc Should there be an icon in the window?
 * @type boolean
 * @default true
 * 
 * @param iconIndex
 * @text Icon Index
 * @desc The ID of the icon to display in the window.
 * @type number
 * @default 0
 * 
 *  
 */

(() => {
    const PLUGIN_NAME = "VariableWindow";
    const PARAMETERS = PluginManager.parameters(PLUGIN_NAME);

    const VARIABLE_ID = Number(PARAMETERS.variableId || 0);
    const SHOW_ICON = PARAMETERS.showIcon === "true";
    const ICON_INDEX = Number(PARAMETERS.iconIndex || 0);

    var VariableWindow = VariableWindow || {};
    window.VariableWindow = VariableWindow;

    VariableWindow.show = function () {
        const window = SceneManager._scene._variableDisplayWindow;
        window.refresh();
        window.show();
    }

    VariableWindow.hide = function () {
        const window = SceneManager._scene._variableDisplayWindow;
        window.hide();
    }

    VariableWindow.refresh = function () {
        const window = SceneManager._scene._variableDisplayWindow;
        window.refresh();
    }

    //-----------------------------------------------------------------------------
    // Window_VariableDisplay
    //
    // The window for displaying a chosen variable

    function Window_VariableDisplay() {
        this.initialize(...arguments);
    }

    Window_VariableDisplay.prototype = Object.create(Window_Base.prototype);
    Window_VariableDisplay.prototype.constructor = Window_VariableDisplay;

    Window_VariableDisplay.prototype.initialize = function (rect) {
        Window_Base.prototype.initialize.call(this, rect);

        this.refresh();
    };

    Window_VariableDisplay.prototype.refresh = function () {
        this.contents.clear();
        const variableValue = $gameVariables.value(VARIABLE_ID);
        this.drawText(`${variableValue}`, 0, 0, this.itemWidth(), "right");

        if (SHOW_ICON) {
            this.drawIcon(ICON_INDEX, 0, 0);
        }
    }

    //---------------------------------------------------------
    // Scene_Message
    // 

    const Llo_VW_Scene_Message_createAllWindows = Scene_Message.prototype.createAllWindows;
    Scene_Message.prototype.createAllWindows = function () {
        Llo_VW_Scene_Message_createAllWindows.call(this);
        this.createVariableDisplayWindow();
    };

    Scene_Message.prototype.createVariableDisplayWindow = function () {
        const rect = this.variableDisplayWindowRect();
        this._variableDisplayWindow = new Window_VariableDisplay(rect);
        this._variableDisplayWindow.hide();
        this.addWindow(this._variableDisplayWindow);
    }

    Scene_Message.prototype.variableDisplayWindowRect = function () {
        const ww = this.mainCommandWidth();
        const wh = this.calcWindowHeight(1, false);
        const wx = Graphics.boxWidth - ww;
        const wy = wh;
        return new Rectangle(wx, wy, ww, wh);
    };

})();