//=============================================================================
// RPG Maker MZ - Too Much Gold
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Alter the maximum gold and display a message when it passes a limit.
 * @author Lloric
 * 
 * @param maxGold
 * @text Max Gold
 * @desc Set the maximum gold the party can carry.
 * @type number
 * @default 999999999
 * 
 * @param tooMuchGoldThreshold
 * @text Too Much Gold Theshold
 * @desc How much gold the party can carry before displaying the 'too much gold' text.
 * @type number
 * @default 99999999
 * 
 * @param tooMuchGoldText
 * @text Too Much Gold Text
 * @desc The text to display when the party has 'too much gold'.
 * @type text
 * @default Too Much Gold!
 * 
 */

(function () {
    const PLUGIN_NAME = "TooMuchGold";
    const PARAMETERS = PluginManager.parameters(PLUGIN_NAME);

    const MAX_GOLD = Number(PARAMETERS.maxGold || 999);
    const TOO_MUCH_GOLD_THRESHOLD = Number(PARAMETERS.tooMuchGoldThreshold || 99);
    const TOO_MUCH_GOLD_TEXT = PARAMETERS.tooMuchGoldText || "Too Much Gold!";

    Game_Party.prototype.maxGold = function () {
        return MAX_GOLD;
    };


    const Window_Gold_refresh = Window_Gold.prototype.refresh;
    Window_Gold.prototype.refresh = function () {
        const rect = this.itemLineRect(0);
        const x = rect.x;
        const y = rect.y;
        const width = rect.width;
        this.contents.clear();

        if (this.value() > TOO_MUCH_GOLD_THRESHOLD) {
            this.drawText(TOO_MUCH_GOLD_TEXT, x, y, width, "center");
        } else {
            Window_Gold_refresh.call(this);
        }
    };

})();
