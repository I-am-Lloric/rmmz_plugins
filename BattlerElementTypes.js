//=============================================================================
// RPG Maker MZ - Battler Element Types
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Actors and Enemies are assigned elemental types. They deal more damage and take less damage from those elements.
 * @author Lloric
 *
 * @help BattlerElementTypes.js
 * 
 * @param DamageMultiplier
 * @text Damage Multiplier
 * @type number
 * @desc Multiply damage by this % when the user and the skill elements match
 * @default 2
 * 
 * @param DefenseMultiplier
 * @text Defense Multiplier
 * @type number
 * @desc Multiply damage by this % when the target and the skill elements match
 * @default 0.5
 *
 */
(function () {

    const pluginName = "BattlerElementTypes";
    const parameters = PluginManager.parameters(pluginName);

    const damageMultiplier = Number(parameters["DamageMultiplier"]);
    const defenseMultiplier = Number(parameters["DefenseMultiplier"]);

    const Game_Action_prototype_makeDamageValue = Game_Action.prototype.makeDamageValue;
    Game_Action.prototype.makeDamageValue = function (target, critical) {
        let value = Game_Action_prototype_makeDamageValue.call(this, target, critical);

        // Custom calculations
        value = this.applyUserElementType(value);
        value = this.applyTargetElementType(value, target);

        value = Math.round(value);
        return value;
    };

    Game_Action.prototype.applyUserElementType = function (value) {
        if (!this.isSkill()) return value;

        const userData = this.getActorOrEnemyData(this.subject());
        if (!userData) return value;

        const userElement = Number(userData.meta.element);
        if (!userElement) return value;

        const skillElement = this.getSkillElement(this.item());
        if (skillElement === -1) return value;

        if (userElement === skillElement) {
            value *= damageMultiplier;
        }

        return value;
    }

    Game_Action.prototype.getSkillElement = function (skill) {
        return skill.damage.elementId;
    }

    Game_Action.prototype.applyTargetElementType = function (value, target) {
        if (!this.isSkill()) return value;

        const targetData = this.getActorOrEnemyData(target);
        if (!targetData) return value;

        const targetElement = Number(targetData.meta.element);
        if (!targetElement) return value;

        const skillElement = this.getSkillElement(this.item());
        if (skillElement === -1) return value;

        if (targetElement === skillElement) {
            value *= defenseMultiplier;
        }

        return value;
    }

    Game_Action.prototype.getActorOrEnemyData = function (source) {
        const actorId = source._actorId;
        let userData = $dataActors[actorId];

        if (!userData) {
            const enemyId = source._enemyId;
            userData = $dataEnemies[enemyId];
        }

        return userData;
    }

})();