//=============================================================================
// RPG Maker MZ - Ledge Jumping
//=============================================================================

/*~struct~ledgeDefinition:
 * @param ledgeRegionId
 * @text Ledge Region ID
 * @desc 
 * @type number
 * @default 1
 *
 * @param ledgeJumpThreshold
 * @text Ledge Jump Theshold
 * @desc The time the player must walk towards the ledge for, before they will jump.
 * @type number
 * @default 30
 * 
 * @param ledgeJumpDistance
 * @text Ledge Jump Distance
 * @desc 
 * @type number
 * @default 3
 * 
 * @param jumpSoundEffect
 * @text Sound Effect
 * @desc Select a sound effect to play.
 * @type file
 * @dir audio/se
 */

/*:
 * @target MZ
 * @plugindesc Mark regions on the map that can be jumped over if the player 
 * holds the direction key facing towards the ledge.
 * @author Lloric
 * 
 * @param ledgeDefinitions
 * @text Ledge Definitions
 * @desc An array of data for each type of ledge.
 * @type struct<ledgeDefinition>[]
 * 
 * @help LedgeJumping.js
 * 
 * 
 */

(() => {
    const PLUGIN_NAME = "LedgeJumping";
    const PARAMETERS = PluginManager.parameters(PLUGIN_NAME);

    const LEDGE_DEFINITIONS = JSON.parse(PARAMETERS.ledgeDefinitions || '[]');
    const LEDGE_DEFINITION_ARRAY = LEDGE_DEFINITIONS.map(definition => JSON.parse(definition));

    var LedgeJumping = LedgeJumping || {};
    LedgeJumping.isRegionALedge = function (regionId) {
        const ledgeDefinitions = LEDGE_DEFINITION_ARRAY.filter(ld => ld.ledgeRegionId === regionId);
        console.log(ledgeDefinitions);
        return ledgeDefinitions.length > 0;
    }

    LedgeJumping.getLedgeDefinition = function (regionId) {
        const ledgeDefinitions = LEDGE_DEFINITION_ARRAY.filter(ld => ld.ledgeRegionId === regionId);
        if (ledgeDefinitions.length <= 0) {
            return null;
        }
        return ledgeDefinitions[0];
    }

    LedgeJumping.getJumpDistance = function (regionId) {
        const ledgeDefinition = LedgeJumping.getLedgeDefinition();
        if (!ledgeDefinition) return 0;
        return ledgeDefinition.ledgeJumpDistance;
    }

    LedgeJumping.getJumpThreshold = function (regionId) {
        const ledgeDefinition = LedgeJumping.getLedgeDefinition();
        if (!ledgeDefinition) return 99999999;
        return ledgeDefinition.ledgeJumpThreshold;
    }

    const Game_Player_initMembers = Game_Player.prototype.initMembers;
    Game_Player.prototype.initMembers = function () {
        Game_Player_initMembers.call(this);

        this.initLedgeDefinitions();
        this.resetLedgeJumping();
    };

    Game_Player.prototype.initLedgeDefinitions = function () {
        for (let i = 0; i < LEDGE_DEFINITION_ARRAY.length; i++) {
            const ledgeDefinition = LEDGE_DEFINITION_ARRAY[i];
            ledgeDefinition.ledgeJumpDistance = Number(ledgeDefinition.ledgeJumpDistance);
            ledgeDefinition.ledgeJumpThreshold = Number(ledgeDefinition.ledgeJumpThreshold);
            ledgeDefinition.ledgeRegionId = Number(ledgeDefinition.ledgeRegionId);
        }
        console.log(LEDGE_DEFINITION_ARRAY);
    }

    const Game_Player_moveByInput = Game_Player.prototype.moveByInput;
    Game_Player.prototype.moveByInput = function () {

        let direction = this.getInputDirection();
        if (direction === 0 && this._ledgeJumpCounter > 0) {
            this.resetLedgeJumping();
        }

        Game_Player_moveByInput.call(this);
    };

    const Game_Player_executeMove = Game_Player.prototype.executeMove;
    Game_Player.prototype.executeMove = function (direction) {
        let x = 0;
        let y = 0;

        if (direction === 2) {
            y += 1;
        }
        if (direction === 4) {
            x += -1;
        }
        if (direction === 6) {
            x += 1;
        }
        if (direction === 8) {
            y -= 1;
        }

        const regionId = $gameMap.regionId(this._x + x, this._y + y);
        const ledgeDefinition = LedgeJumping.getLedgeDefinition(regionId);

        if (!ledgeDefinition) {
            Game_Player_executeMove.call(this, direction);
            return;
        }

        if (this._lastTouchedRegionId === regionId) {
            // TODO: Use fps to calculate how much to increase by here!!!
            this._ledgeJumpCounter += 1;
        }

        if (this._lastTouchedRegionId !== regionId) {
            this._lastTouchedRegionId = regionId;
        }

        const ledgeJumpThreshold = ledgeDefinition.ledgeJumpThreshold;
        if (ledgeDefinition && this._ledgeJumpCounter >= ledgeJumpThreshold) {
            this.resetLedgeJumping();

            // Make the character jump over the ledge
            const ledgeJumpDistance = ledgeDefinition.ledgeJumpDistance;
            let moveX = x * ledgeJumpDistance;
            let moveY = y * ledgeJumpDistance;

            const jumpSoundEffect = ledgeDefinition.jumpSoundEffect;
            AudioManager.playSe({ name: jumpSoundEffect, volume: 70, pitch: 100, pan: 0 });
            this.jump(moveX, moveY);
        }
    };

    Game_Player.prototype.resetLedgeJumping = function () {
        this._lastTouchedRegionId = -1;
        this._ledgeJumpCounter = 0;
    }

})();