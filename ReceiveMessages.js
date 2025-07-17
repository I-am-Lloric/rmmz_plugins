//=============================================================================
// RPG Maker MZ - Receive Messages
// Version 1.1
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Receive text messages that you can view within a custom scene.
 * @author Lloric
 *
 * 
 * @param messageYPosition
 * @text Message Y Position
 * @desc Where to begin drawing the message text.
 * @type number
 * 
 * @param messageXPosition
 * @text Message X Position
 * @desc Where to begin drawing the message text.
 * @type number
 * 
 * @param subjectYPosition
 * @text Subject Y Position
 * @desc Where to begin drawing the subject text.
 * @type number
 * 
 * @param subjectXPosition
 * @text Subject X Position
 * @desc Where to begin drawing the subject text.
 * @type number
 * 
 * @param faceYPosition
 * @text Face Y Position
 * @desc Where to begin drawing the face.
 * @type number
 * 
 * @param faceXPosition
 * @text Face X Position
 * @desc Where to begin drawing the face.
 * @type number
 * 
 * @param senderYPosition
 * @text Sender Y Position
 * @desc Where to begin drawing the sender name.
 * @type number
 * 
 * @param senderXPosition
 * @text Sender X Position
 * @desc Where to begin drawing the sender name.
 * @type number
 * 
 * @command AddMessage
 * @text Add Message
 * @desc 
 * 
 * 
 * @arg faceName
 * @text Face Image Name
 * @type text
 * @desc Enter the filename (without extension) of the face image.
 * 
 * @arg faceIndex
 * @text Face Image Index
 * @type number
 * @desc Enter the index for the face image.
 * 
 * @arg messageSubject
 * @text Message Subject
 * @type text
 * @desc Enter the subject of the message.
 * 
 * @arg messageText
 * @text Message Text
 * @type text
 * @desc Enter the text of the message.
 * 
 * @arg senderName
 * @text Message Sender's Name
 * @type text
 * @desc Enter the name of the origin of the message.
 * 
 * @arg messageId
 * @text Message ID
 * @desc A way of identifying a message.
 * @type text
 * 
 * @help ReceiveMessages.js
 *
 *
 *
 */
(() => {
    const PLUGIN_NAME = "ReceiveMessages";
    const PARAMETERS = PluginManager.parameters(PLUGIN_NAME);

    const MESSAGE_POSITION_X = Number(PARAMETERS.messageXPosition || 0);
    const MESSAGE_POSITION_Y = Number(PARAMETERS.messageYPosition || 0);
    const SUBJECT_POSITION_X = Number(PARAMETERS.subjectXPosition || 0);
    const SUBJECT_POSITION_Y = Number(PARAMETERS.subjectYPosition || 0);
    const FACE_POSITION_X = Number(PARAMETERS.faceXPosition || 0);
    const FACE_POSITION_Y = Number(PARAMETERS.faceYPosition || 0);
    const SENDER_POSITION_X = Number(PARAMETERS.senderXPosition || 0);
    const SENDER_POSITION_Y = Number(PARAMETERS.senderYPosition || 0);

    PluginManager.registerCommand(PLUGIN_NAME, "AddMessage", args => {
        const faceName = args.faceName || "";
        const faceIndex = Number(args.faceIndex || 0);
        const messageText = args.messageText || "";
        const messageSubject = args.messageSubject || "";
        const senderName = args.senderName || "";
        const messageId = args.messageId || "";

        ReceiveMessages.addMessage(messageSubject, messageText, senderName, faceName, faceIndex, messageId);
    });

    var ReceiveMessages = ReceiveMessages || {};
    window.ReceiveMessages = ReceiveMessages;

    ReceiveMessages.messages = ReceiveMessages.messages = [];

    ReceiveMessages.addMessage = function (messageSubject, messageText, senderName, faceName, faceIndex, messageId) {
        ReceiveMessages.messages.push({
            messageSubject,
            faceName,
            faceIndex,
            messageText,
            senderName,
            unread: true,
            messageId
        });
    }

    ReceiveMessages.markAsRead = function (index) {
        const messageData = ReceiveMessages.messages[index];
        if (!messageData) return;

        messageData.unread = false;
    }

    ReceiveMessages.hasReceivedMessage = function (messageId) {
        const messages = ReceiveMessages.messages.filter(m => m.messageId === messageId);
        return messages.length > 0;
    }

    ReceiveMessages.hasReadMessage = function (messageId) {
        const hasRecieved = ReceiveMessages.hasReceivedMessage(messageId);
        if (!hasRecieved) return false;

        const messages = ReceiveMessages.messages.filter(m => m.messageId === messageId);
        return messages[0].unread === false;
    }

    //-----------------------------------------------------------------------------
    // Scene_ReceiveMessages
    //
    // The scene class of the item screen.

    function Scene_ReceiveMessages() {
        this.initialize(...arguments);
    }
    window.Scene_ReceiveMessages = Scene_ReceiveMessages;

    Scene_ReceiveMessages.prototype = Object.create(Scene_ItemBase.prototype);
    Scene_ReceiveMessages.prototype.constructor = Scene_ReceiveMessages;

    Scene_ReceiveMessages.prototype.initialize = function () {
        Scene_ItemBase.prototype.initialize.call(this);
    };

    Scene_ReceiveMessages.prototype.create = function () {
        Scene_ItemBase.prototype.create.call(this);
        this.createListWindow();
        this.createDisplayWindow();
    };

    Scene_ReceiveMessages.prototype.createListWindow = function () {
        const rect = this.listWindowRect();
        this._listWindow = new Window_MessageList(rect);
        this._listWindow.setHandler("ok", this.onListOk.bind(this));
        this._listWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(this._listWindow);

        this._listWindow.activate();
        this._listWindow.select(0);
    };

    Scene_ReceiveMessages.prototype.createDisplayWindow = function () {
        const rect = this.listWindowRect();
        this._displayWindow = new Window_ReceiveMessageDisplay(rect);
        this._displayWindow.setHandler("cancel", this.onDisplayCancel.bind(this));
        this.addWindow(this._displayWindow);

        this._displayWindow.hide();
    };

    Scene_ReceiveMessages.prototype.listWindowRect = function () {
        const wx = 0;
        const wy = this.mainAreaTop();
        const ww = Graphics.boxWidth;
        const wh = Graphics.boxHeight - wy;
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_ReceiveMessages.prototype.onListOk = function () {
        const listWindowIndex = this._listWindow.index();
        this._displayWindow.setMessageIndex(listWindowIndex);
        ReceiveMessages.markAsRead(listWindowIndex);

        setTimeout(() => {
            this._displayWindow.refresh();
            this._displayWindow.show();
            this._displayWindow.activate();
        }, 50);
    };

    Scene_ReceiveMessages.prototype.onDisplayCancel = function () {
        this._displayWindow.hide();
        this._listWindow.refresh();
        this._listWindow.activate();
    };


    //-----------------------------------------------------------------------------
    // Window_MessageList
    //
    // The window for selecting an item on the item screen.

    function Window_MessageList() {
        this.initialize(...arguments);
    }

    Window_MessageList.prototype = Object.create(Window_ItemList.prototype);
    Window_MessageList.prototype.constructor = Window_MessageList;

    Window_MessageList.prototype.initialize = function (rect) {
        Window_ItemList.prototype.initialize.call(this, rect);
        this.refresh();
    };

    Window_MessageList.prototype.maxCols = function () {
        return 1;
    };

    Window_MessageList.prototype.makeItemList = function () {
        this._data = ReceiveMessages.messages;
        if (this.includes(null)) {
            this._data.push(null);
        }
    };

    Window_MessageList.prototype.drawItem = function (index) {
        const item = this.itemAt(index);
        if (!item) return;

        const rect = this.itemLineRect(index);
        this.changePaintOpacity(item.unread);

        this.drawText(`${index + 1}. ${item.messageSubject}`, rect.x, rect.y, rect.width);
        this.drawText(`[${item.senderName}]`, rect.x, rect.y, rect.width, "right");

        this.changePaintOpacity(1);
    };

    Window_MessageList.prototype.isEnabled = function (item) {
        return item;
    };



    //-----------------------------------------------------------------------------
    // Window_ReceiveMessageDisplay
    //
    // The window class with scroll functions.

    function Window_ReceiveMessageDisplay() {
        this.initialize(...arguments);
    }

    Window_ReceiveMessageDisplay.prototype = Object.create(Window_Selectable.prototype);
    Window_ReceiveMessageDisplay.prototype.constructor = Window_ReceiveMessageDisplay;

    Window_ReceiveMessageDisplay.prototype.initialize = function (rect) {
        Window_Selectable.prototype.initialize.call(this, rect);

        this._messageIndex = -1;
    };

    Window_ReceiveMessageDisplay.prototype.setMessageIndex = function (index) {
        this._messageIndex = index;

        const messageData = this.getMessageData();
        if (!messageData) return;

        ImageManager.loadFace(messageData.faceName);
    }

    Window_ReceiveMessageDisplay.prototype.getMessageData = function () {
        return ReceiveMessages.messages[this._messageIndex];
    }

    Window_ReceiveMessageDisplay.prototype.refresh = function () {
        Window_Selectable.prototype.refresh.call(this);
        this.contents.clear();

        const messageData = this.getMessageData();
        if (!messageData) return;

        this.drawSenderName(messageData.senderName);
        this.drawMessageSubject(messageData.messageSubject);
        this.drawMessageText(messageData.messageText);
        this.drawMessageFace(messageData.faceName, messageData.faceIndex);
    }

    Window_ReceiveMessageDisplay.prototype.drawSenderName = function (senderName) {
        const contentsWidth = this.contents.width - this.padding * 2;
        this.drawTextEx(senderName, this.padding + SENDER_POSITION_X, SENDER_POSITION_Y + this.padding, contentsWidth);
    }


    Window_ReceiveMessageDisplay.prototype.drawMessageFace = function (messageFace, messageFaceIndex) {
        const width = ImageManager.standardFaceWidth;
        const height = ImageManager.standardFaceHeight;
        this.drawFace(messageFace, messageFaceIndex, this.padding + FACE_POSITION_X, this.padding + FACE_POSITION_Y, width, height);
    }

    Window_ReceiveMessageDisplay.prototype.drawMessageSubject = function (messageSubject) {
        const contentsWidth = this.contents.width - this.padding * 2;
        this.drawTextEx(messageSubject, this.padding + SUBJECT_POSITION_X, SUBJECT_POSITION_Y + this.padding, contentsWidth);
    }

    Window_ReceiveMessageDisplay.prototype.calculateTextWidth = function () {
        const contentsWidth = this.contents.width - this.padding * 2;
        let textWidth = 0;
        let characters = "";
        do {
            characters += "0";
            textWidth = this.textWidth(characters);
        } while (textWidth <= contentsWidth);

        return textWidth;
    }

    Window_ReceiveMessageDisplay.prototype.drawMessageText = function (messageText) {
        const contentsWidth = this.contents.width - this.padding * 2;

        const textWidth = this.calculateTextWidth();
        let messageWordArray = messageText.split(" ");

        let currentString = "";
        let currentYIndex = 0;
        do {
            const tempString = currentString + " " + messageWordArray[0];
            const tempWidth = this.textWidth(tempString);
            if (tempWidth <= textWidth) {
                currentString += " " + messageWordArray[0];
                messageWordArray = messageWordArray.filter((_, index) => index !== 0);
            } else {
                this.drawTextEx(currentString, this.padding + MESSAGE_POSITION_X, MESSAGE_POSITION_Y + this.padding + currentYIndex * this.lineHeight(), contentsWidth);
                currentYIndex++;
                currentString = "";
            }
        } while (messageWordArray.length > 0);

        this.drawTextEx(currentString, this.padding + MESSAGE_POSITION_X, MESSAGE_POSITION_Y + this.padding + currentYIndex * this.lineHeight(), contentsWidth);
    }

    //------------------------------------------------
    // DataManager
    //

    const DataManager_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function () {
        const contents = DataManager_makeSaveContents.call(this);
        contents.receivedMessages = ReceiveMessages.messages;
        return contents;
    };

    const DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function (contents) {
        DataManager_extractSaveContents.call(this, contents);
        ReceiveMessages.messages = contents.receivedMessages;
    };


})();