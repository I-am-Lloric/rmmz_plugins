//=============================================================================
// RPG Maker MZ - Gathering Resources Respawn
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Resources can be set to respawn after a number of seconds.
 * @author Lloric
 *
 * @help 
 * First, add the <secondsUntilRespawn:x> tag to your items.
 * Then create an event on a map.
 * Add whatever event commands you wish to the event.
 * Call the plugin command SetRespawn.
 * That is all. The plugin will handle hiding and showing the event.
 * 
 * Item/Weapon/Armor Notetags
 * <secondsUntilRespawn:x>
 * Tells the plugin how long it should take before the resource respawns
 * x = how many seconds until respawn
 * 
 * @command SetRespawn
 * @text Set Respawn
 * @desc Trigger an item to begin a respawn countdown.
 *
 * @arg itemDataClass
 * @text Item Data Class
 * @desc The data class of the item that is respawning.
 * @type select
 * @option Item
 * @value item
 * @option Weapon
 * @value weapon
 * @option Armor
 * @value armor
 * @default item
 * 
 * @arg itemId
 * @text Item ID
 * @desc The item ID.
 * @default 0
 * 
 */

(() => {
    const pluginName = "GatheringResourcesRespawn";

    var GatheringResourcesRespawn = GatheringResourcesRespawn || {};
    GatheringResourcesRespawn.data = GatheringResourcesRespawn.data || {};

    // Returns the time if there is a key of nodeId
    GatheringResourcesRespawn.getRespawnData = function (nodeId) {
        const respawningNodes = Object.keys(GatheringResourcesRespawn.data);
        if (respawningNodes.includes(nodeId)) {
            return GatheringResourcesRespawn.data[nodeId];
        }
        return -1;
    }

    // Returns true/false if there is a key of nodeId
    GatheringResourcesRespawn.hasRespawnData = function (nodeId) {
        const respawningNodes = Object.keys(GatheringResourcesRespawn.data);
        return respawningNodes.includes(nodeId);
    }

    GatheringResourcesRespawn.setRespawn = function (mapId, eventId, secondsUntilRespawn) {
        const nodeId = GatheringResourcesRespawn.createNodeId(mapId, eventId);
        GatheringResourcesRespawn.data[nodeId] = Game_System.prototype.playtime() + secondsUntilRespawn;
    }

    GatheringResourcesRespawn.deleteRespawnData = function (nodeId) {
        delete GatheringResourcesRespawn.data[nodeId];
    }

    GatheringResourcesRespawn.checkForRespawns = function () {
        const respawningNodes = Object.keys(GatheringResourcesRespawn.data);
        for (let i = 0; i < respawningNodes.length; i++) {
            const respawningNodeKey = respawningNodes[i];

            const currentTime = Game_System.prototype.playtime();
            const respawnTime = GatheringResourcesRespawn.getRespawnData(respawningNodeKey);

            if (currentTime >= respawnTime) {
                GatheringResourcesRespawn.deleteRespawnData(respawningNodeKey);
            }
        }
    }

    GatheringResourcesRespawn.createNodeId = function (mapId, eventId) {
        return `${mapId}_${eventId}`;
    }


    PluginManager.registerCommand(pluginName, "SetRespawn", function (args) {
        const itemDataClass = args.itemDataClass || "item";
        const itemId = Number(args.itemId || 0);

        let item = null;
        if (itemDataClass === "item") {
            item = $dataItems[itemId];
        }
        if (itemDataClass === "weapon") {
            item = $dataWeapons[itemId];
        }
        if (itemDataClass === "armor") {
            item = $dataArmors[itemId];
        }

        if (!item) return;
        const secondsUntilRespawn = Number(item.meta.secondsUntilRespawn);
        if (!secondsUntilRespawn) return;

        const mapId = this._mapId;
        const eventId = this._eventId;
        GatheringResourcesRespawn.setRespawn(mapId, eventId, secondsUntilRespawn);

    });

    const Llo_GRR_Scene_Map_initialize = Scene_Map.prototype.initialize;
    Scene_Map.prototype.initialize = function () {
        Llo_GRR_Scene_Map_initialize.call(this);

        this._gatheringResourcesRespawnCounter = 0;
    };

    const Llo_GRR_Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function () {
        Llo_GRR_Scene_Map_update.call(this);

        const fps = Graphics._fpsCounter.fps;
        const tick = 60 / fps;
        this._gatheringResourcesRespawnCounter += tick;

        if (this._gatheringResourcesRespawnCounter >= 60) {
            this._gatheringResourcesRespawnCounter -= 60;

            GatheringResourcesRespawn.checkForRespawns();
        }

    };

    Game_Map.prototype.update = function (sceneActive) {
        this.refreshIfNeeded();
        if (sceneActive) {
            this.updateInterpreter();
        }
        this.updateScroll();
        this.updateEvents();
        this.updateVehicles();
        this.updateParallax();

        for (let i = 0; i < this._events.length; i++) {
            const event = this._events[i];
            if (!event) continue;

            const mapId = event._mapId;
            const eventId = event._eventId;
            const nodeId = GatheringResourcesRespawn.createNodeId(mapId, eventId);

            const isEventRespawning = GatheringResourcesRespawn.hasRespawnData(nodeId);
            if (isEventRespawning && event._erased === false) {
                // the event should be hidden
                event._erased = true;
                event.refresh();
            }
            if (!isEventRespawning && event._erased === true) {
                // the event should not be hidden
                event._erased = false;
                event.refresh();
            }

        }
    };

})();