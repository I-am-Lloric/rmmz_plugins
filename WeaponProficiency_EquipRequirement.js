//=============================================================================
// RPG Maker MZ - Weapon Proficiency - Equip Requirement
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Actors may only equip weapons within their proficiency level
 * @author Lloric
 * @order after WeaponProficiency
 * 
 * @help
 * 
 * Weapon Notetags
 * <weaponProficiencyRequirement:x>
 * x = weapon proficiency level
 * 
 */

(() => {
    'use strict';

    const pluginName = "WeaponProficiency_EquipRequirement";
    const parameters = PluginManager.parameters(pluginName);

    var WeaponProficiency_EquipRequirement = WeaponProficiency_EquipRequirement || {};
    WeaponProficiency_EquipRequirement.getWeaponProficiencyRequirement = function (weapon) {
        return Number(weapon.meta.weaponProficiencyRequirement);
    }

    WeaponProficiency_EquipRequirement.canActorEquipWeapon = function (actor, weapon) {
        const weaponProficiencyLevelRequirement = WeaponProficiency_EquipRequirement.getWeaponProficiencyRequirement(weapon);
        if (!weaponProficiencyLevelRequirement) {
            return true;
        }

        const wtypeId = weapon.wtypeId;
        const weaponProficiencyLevel = actor.getWeaponProficiencyLevel(wtypeId);
        return weaponProficiencyLevel >= weaponProficiencyLevelRequirement;
    }

    //-----------------------------------------------
    // Window_EquipItem
    //

    const Llo_WeaPro_ER_Window_EquipItem_isEnabled = Window_EquipItem.prototype.isEnabled;
    Window_EquipItem.prototype.isEnabled = function (item) {
        // Check if the item is a weapon
        if (!DataManager.isWeapon(item)) {
            return Llo_WeaPro_ER_Window_EquipItem_isEnabled.call(this, item);
        }
        // Check if the item has a weapon proficiency requirement
        const weaponProficiencyLevelRequirement = WeaponProficiency_EquipRequirement.getWeaponProficiencyRequirement(item);
        if (!weaponProficiencyLevelRequirement) {
            return Llo_WeaPro_ER_Window_EquipItem_isEnabled.call(this, item);
        }

        return WeaponProficiency_EquipRequirement.canActorEquipWeapon(this._actor, item);
    };

    const Llo_WeaPro_ER_Window_EquipItem_includes = Window_EquipItem.prototype.includes;
    Window_EquipItem.prototype.includes = function (item) {
        if (item === null) {
            return true;
        }

        if (!DataManager.isWeapon(item)) {
            return Llo_WeaPro_ER_Window_EquipItem_includes.call(this, item);
        }

        const proficiencyRequirement = WeaponProficiency_EquipRequirement.getWeaponProficiencyRequirement(item);
        if (proficiencyRequirement) {
            return (
                this._actor &&
                item.etypeId === this.etypeId() &&
                this._actor.isEquipWtypeOk(item.wtypeId) &&
                !this._actor.isEquipTypeSealed(item.etypeId)
            );
        }

        return Llo_WeaPro_ER_Window_EquipItem_includes.call(this, item);
    };

    //-----------------------------------------------
    // Game_BattlerBase
    //

    const Llo_WeaPro_ER_Game_BattlerBase_canEquipWeapon = Game_BattlerBase.prototype.canEquipWeapon;
    Game_BattlerBase.prototype.canEquipWeapon = function (item) {
        if (!(this instanceof Game_Actor)) {
            return Llo_WeaPro_ER_Game_BattlerBase_canEquipWeapon.call(this, item);
        }

        const weaponProficiencyLevelRequirement = WeaponProficiency_EquipRequirement.getWeaponProficiencyRequirement(item);
        if (!weaponProficiencyLevelRequirement) {
            return Llo_WeaPro_ER_Game_BattlerBase_canEquipWeapon.call(this, item);
        }

        const canEquip = WeaponProficiency_EquipRequirement.canActorEquipWeapon(this, item);
        if (!canEquip) {
            return false;
        }

        return Llo_WeaPro_ER_Game_BattlerBase_canEquipWeapon.call(this, item);
    };

})();
