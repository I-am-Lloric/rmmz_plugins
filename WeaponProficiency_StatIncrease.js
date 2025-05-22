//=============================================================================
// RPG Maker MZ - Weapon Proficiency - Stat Increase
//=============================================================================

/*~struct~ProficiencyStatIncrease:
 * @param parameterId
 * @text Parameter ID
 * @type number
 * @desc The parameter ID (e.g., 1 for MaxHP, 2 for MaxMP)
 * @default 0

 * @param value
 * @text Value
 * @type number
 * @desc How much the stat increases by
 * @default 0
*/

/*~struct~WeaponTypeStatIncrease:
 * @param wtypeId
 * @text Weapon Type ID
 * @type number
 * @desc The weapon type ID from the database
 * @default 0

 * @param statIncreaseArray
 * @text Stat Increase Array
 * @type struct<ProficiencyStatIncrease>[]
 * @desc List of parameter-value pairs for this weapon type
*/

/*:
 * @target MZ
 * @plugindesc Actors can gain stats when their proficiency level increases
 * @author Lloric
 * @order after WeaponProficiency
 * 
 * 
 * @param weaponTypeStatIncreaseArray
 * @text Weapon Type Stat Increase Array
 * @type struct<WeaponTypeStatIncrease>[]
 * @desc A list of stat increases by weapon type
 * 
 * @param loseStatsOnLevelReduction
 * @text Lose Stats On Level Reduction
 * @desc Should actors lose stats when their weapon proficiency is lowered?
 * @type boolean
 * @default false
 * 
 * @help
 * 
 * 
 */

(() => {
    'use strict';

    var WeaponProficiency_StatIncrease = WeaponProficiency_StatIncrease || {};
    WeaponProficiency_StatIncrease.weaponTypeStatIncreases = {};

    WeaponProficiency_StatIncrease.addWeaponTypeStatIncrease = function (wtypeId, parameterId, value) {
        const keys = Object.keys(WeaponProficiency_StatIncrease.weaponTypeStatIncreases);
        if (!keys.includes(`${wtypeId}`)) {
            WeaponProficiency_StatIncrease.weaponTypeStatIncreases[wtypeId] = [];
        }
        WeaponProficiency_StatIncrease.weaponTypeStatIncreases[wtypeId].push([parameterId, value]);
    }

    const pluginName = "WeaponProficiency_StatIncrease";
    const parameters = PluginManager.parameters(pluginName);
    const shouldLoseStats = parameters.loseStatsOnLevelReduction === "true";

    const weaponTypeStatIncreaseArray = JSON.parse(parameters.weaponTypeStatIncreaseArray || "[]");
    weaponTypeStatIncreaseArray.forEach(weaponTypeStatIncrease => {
        weaponTypeStatIncrease = JSON.parse(weaponTypeStatIncrease);
        const wtypeId = Number(weaponTypeStatIncrease.wtypeId);
        weaponTypeStatIncrease.statIncreaseArray = JSON.parse(weaponTypeStatIncrease.statIncreaseArray);
        weaponTypeStatIncrease.statIncreaseArray.forEach(statIncrease => {
            const statIncreaseArray = JSON.parse(statIncrease);
            const parameterId = Number(statIncreaseArray.parameterId);
            const value = Number(statIncreaseArray.value);

            WeaponProficiency_StatIncrease.addWeaponTypeStatIncrease(wtypeId, parameterId, value);
        });
    });

    //-----------------------------
    // Game_Actor
    //

    const Llo_WeaPro_SI_Game_Actor_setWeaponProficiency = Game_Actor.prototype.setWeaponProficiency;
    Game_Actor.prototype.setWeaponProficiency = function (wtypeId, proficiencyLevel) {
        const previousLevel = this.getWeaponProficiencyLevel(wtypeId);

        Llo_WeaPro_SI_Game_Actor_setWeaponProficiency.call(this, wtypeId, proficiencyLevel);

        const currentLevel = this.getWeaponProficiencyLevel(wtypeId);
        if (previousLevel > currentLevel && shouldLoseStats) {
            // Lost proficiency, lose stats
            this.gainWeaponProficiencyStats(wtypeId, currentLevel - previousLevel);
        }
        if (currentLevel > previousLevel) {
            // Gain stats
            this.gainWeaponProficiencyStats(wtypeId, currentLevel - previousLevel);
        }
    }

    const Llo_WeaPro_SI_Game_Actor_incrementWeaponProficiency = Game_Actor.prototype.incrementWeaponProficiency;
    Game_Actor.prototype.incrementWeaponProficiency = function (wtypeId) {
        const previousLevel = this.getWeaponProficiencyLevel(wtypeId);

        Llo_WeaPro_SI_Game_Actor_incrementWeaponProficiency.call(this, wtypeId);

        const currentLevel = this.getWeaponProficiencyLevel(wtypeId);
        if (currentLevel > previousLevel) {
            // Gain stats
            this.gainWeaponProficiencyStats(wtypeId, currentLevel - previousLevel);
        }
    }

    Game_Actor.prototype.gainWeaponProficiencyStats = function (wtypeId, levelDelta) {
        const statIncreases = WeaponProficiency_StatIncrease.weaponTypeStatIncreases[wtypeId];
        if (!statIncreases) return;

        for (let i = 0; i < statIncreases.length; i++) {
            const statValuePair = statIncreases[i];
            const parameterId = statValuePair[0];
            const value = statValuePair[1];
            this.addParam(parameterId, value * levelDelta);
        }
    }

})();
