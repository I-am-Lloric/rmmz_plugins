//=============================================================================
// RPG Maker MZ - Item Target
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [v1.0] A plugin which stores the target of an item in a variable
 * @author Lloric
 *
 * @help ItemTarget.js
 *
 * @param variableId
 * @text Variable ID
 * @desc The Variable ID to store the target
 * @default 1
 *
 */

(() => {
    const PLUGIN_NAME = document.currentScript.src.match(/([^\/]+)\.js$/)[1];
    const params = PluginManager.parameters(PLUGIN_NAME);

    const variableId = Number(params.variableId || 1);

    const Llo_ItTa_Game_Action_apply = Game_Action.prototype.apply;
    Game_Action.prototype.apply = function (target) {
        if (DataManager.isItem(this.item())) {
            if (target && target.isActor()) {
                $gameVariables.setValue(variableId, target.actorId());
            }
            if (target && target.isEnemy()) {
                $gameVariables.setValue(variableId, target.index());
            }
        }

        Llo_ItTa_Game_Action_apply.call(this, target);
    };

})();
