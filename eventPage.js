// eventPage.js - Manifest V3
/*jshint esversion: 6 */

var currentFields;
var currentNoteType;
var savedFormFields = savedFormFields || [];
var currentDeck;
var deckNamesSaved;
var manifest = chrome.runtime.getManifest();
var onceTimeForceSync;
var currentTags;
var connectionStatus;
var modelNamesSaved;
var storedFieldsForModels = storedFieldsForModels || {};
var allSettings = {};
var allSavedNotes = [];
var stickyFields = {};
var favourites = {};
var stickyTags = '';

// Cache object to replace window[...] usage for global storage
var globalCache = {};

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === "wakeup") {
        sendResponse({ status: "awake" });
    } else if (message.action === "importedNotes") {
        if (isValidValue(message.data)) {
            try {
                let importedNotes = JSON.parse(message.data);
                if (importedNotes.length > 0) {
                    let duplicateCounter = 0;
                    let importNotesCounter = 0;
                    if (!isValidValue(allSavedNotes)) {
                        allSavedNotes = [];
                    }

                    for (let item of importedNotes) {
                        if (allSavedNotes.indexOf(item) === -1) {
                            allSavedNotes.push(item);
                            importNotesCounter++;
                        } else {
                            duplicateCounter++;
                        }
                    }

                    let duplicateNotesMsg = duplicateCounter > 0 ? "duplicates found: " + duplicateCounter : "";
                    let importNotesMsg = importNotesCounter > 0 ? "Notes imported: " + importNotesCounter : " No new notes were imported  :";

                    notifyUser(importNotesMsg + duplicateNotesMsg, "notifyalert");
                    saveChanges("allSavedNotes", allSavedNotes);
                } else {
                    notifyUser("Cant parse the file", "notifyalert");
                }
            } catch (errors) {
                notifyUser(errors.toString(), "notifyalert");
            }
        }
    }
    // Handle getBackgroundPage requests from popup
    else if (message.action === 'getGlobalVariable' || message.type === 'getGlobalVariable') {
        // Helper to get global variables
        let value = undefined;
        switch (message.key) {
            case 'currentFields': value = currentFields; break;
            case 'currentNoteType': value = currentNoteType; break;
            case 'savedFormFields': value = savedFormFields; break;
            case 'currentDeck': value = currentDeck; break;
            case 'deckNamesSaved': value = deckNamesSaved; break;
            case 'modelNamesSaved': value = modelNamesSaved; break;
            case 'storedFieldsForModels': value = storedFieldsForModels; break;
            case 'allSettings': value = allSettings; break;
            case 'allSavedNotes': value = allSavedNotes; break;
            case 'stickyFields': value = stickyFields; break;
            case 'favourites': value = favourites; break;
            case 'stickyTags': value = stickyTags; break;
            case 'connectionStatus': value = connectionStatus; break;
            default: value = globalCache[message.key];
        }
        sendResponse({ value: value });
    } else if (message.action === 'executeFunction' || message.type === 'executeFunction') {
        // Helper to execute functions from popup
        if (message.functionName === 'ankiConnectRequest') {
            ankiConnectRequest(message.args[0], message.args[1], message.args[2])
                .then(result => sendResponse({ result: result }))
                .catch(error => sendResponse({ error: error }));
            return true; // Keep channel open for async response
        } else if (message.functionName === 'saveChanges') {
            saveChanges(message.args[0], message.args[1], message.args[2]);
            sendResponse({ status: 'ok' });
        } else if (message.functionName === 'submitToAnki') {
            submitToAnki();
            sendResponse({ status: 'ok' });
        } else if (message.functionName === 'updateContextMenu') {
            updateContextMenu();
            sendResponse({ status: 'ok' });
        } else if (message.functionName === 'refreshData') {
            // Logic to refresh data if needed
            sendResponse({ status: 'ok' });
        }
    }
});

chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === "install") {
        isInstalledNow();
    } else if (details.reason === "update") {
        isUpdatedNow(0);
    }
});

/* The function that finds and returns the selected text */
var funcToInject = function () {
    var selection = window.getSelection();
    return (selection.rangeCount > 0) ? selection.toString() : '';
};

chrome.commands.onCommand.addListener(async function (cmd) {
    if (cmd !== "submit-data-to-popup") {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;

        /* Inject the code into all frames of the active tab */
        chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            func: funcToInject
        }, function (results) {
            if (chrome.runtime.lastError) {
                /* show error */
                createNotification('ERROR:\n' + chrome.runtime.lastError.message);
            } else if (results && results.length > 0) {
                // results is array of {frameId, result}
                let selectedTextPerFrame = results.map(r => r.result);

                /* The results are as expected */
                if (selectedTextPerFrame[0]) {
                    try {
                        var fieldToAdd;
                        var displayText;
                        var currentText = selectedTextPerFrame[0];

                        if (cmd === "add-to-first-field") {
                            fieldToAdd = 0;
                        } else if (cmd === "add-to-second-field") {
                            fieldToAdd = 1;
                        } else if (cmd === "add-to-third-field") {
                            fieldToAdd = 2;
                        }
                        if (currentText.length < 30) {
                            displayText = currentText;
                        } else {
                            displayText = currentText.slice(0, 30) + "...";
                        }

                        var currentFieldName = currentFields[fieldToAdd];

                        if (isValidValue(currentFieldName)) {
                            if (allSettings.appendModeSettings == 1) {
                                if (isValidValue(savedFormFields[fieldToAdd])) {
                                    savedFormFields[fieldToAdd] = savedFormFields[fieldToAdd] + "<br>" + currentText;
                                    createNotification("Appended: " + displayText + " to field: " + currentFieldName);
                                } else {
                                    savedFormFields[fieldToAdd] = currentText;
                                    createNotification("Added: " + displayText + " to field: " + currentFieldName);
                                }
                            } else {
                                savedFormFields[fieldToAdd] = currentText;
                                createNotification("Added: " + displayText + " to field: " + currentFieldName);
                            }
                            chrome.runtime.sendMessage({
                                msg: "addedFields",
                                data: savedFormFields
                            });
                            saveChanges("savedFormFields", savedFormFields, "local");
                        } else {
                            createNotification("Sorry, No Field number " + (fieldToAdd + 1) + " for Model:" + currentNoteType);
                        }
                    } catch (e) {
                        debugLog(e);
                        createNotification("Error: please open Anki, then extension pop to sync.");
                    }
                } else {
                    debugLog("null added");
                }
            }
        });
    } else if (cmd === "submit-data-to-popup") {
        submitToAnki();
    }
});

function ankiConnectRequest(action, version, params = {}) {
    return new Promise((resolve, reject) => {
        if (((typeof globalCache[action + "Saved"] != "undefined") && (allSettings.syncFrequency === "Manual" || onceTimeForceSync === 0)) && ((action != "sync") || (action != "addNote"))) {
            resolve(globalCache[action + "Saved"]);
        } else {
            fetch('http://127.0.0.1:8765', {
                method: 'POST',
                body: JSON.stringify({ action, version, params })
            })
                .then(response => response.json())
                .then(response => {
                    if (response.error) {
                        throw response.error;
                    } else {
                        if (response.hasOwnProperty('result')) {
                            if (response.result) {
                                if (action !== "addNote" && action !== "sync" && action !== "version") {
                                    saveChanges(action + "Saved", response.result);
                                }
                                resolve(response.result);
                            } else {
                                // Some actions might return null result but be successful, handle carefully
                                if (action !== "addNote" && action !== "sync" && action !== "version") {
                                    saveChanges(action + "Saved", response.result);
                                }
                                resolve(response.result);
                            }
                        } else {
                            reject('failed to get results from AnkiConnect');
                        }
                    }
                })
                .catch(e => {
                    console.error("AnkiConnect Fetch Error:", e);
                    reject('failed to connect to AnkiConnect: ' + e.toString());
                });
        }
    });
}

function notifyUser(notifyContent, notificationType) {
    var notifyString = JSON.stringify(notifyContent);

    if (notificationType === "notifyalert" || notificationType === "notifyAlert") {
        try {
            createNotification(notifyString);
        } catch (err) {
            console.log(notifyString);
        }
    } else if (notificationType === "alert") {
        console.log(notifyString);
    } else if (notificationType === "notify") {
        createNotification(notifyString);
    }
}

function createNotification(notificationTitle) {
    var manifestName;
    var manifestVersion;

    if (!isValidValue(manifestName)) {
        manifestName = "Anki Quick Adder";
    } else {
        manifestName = manifest.name;
    }
    if (!isValidValue(manifestVersion)) {
        manifestVersion = manifest.version;
    } else {
        manifestVersion = "1.00";
    }
    chrome.notifications.create(
        'ankiQuickAdder', {
        type: 'basic',
        iconUrl: 'icon-64.png',
        title: manifestName + ' ' + manifestVersion,
        message: notificationTitle
    },
        function () {
        }
    );
}

function findRegex(findWhat, errorz) {
    let attributes = "gi";
    let txtToFind = new RegExp(findWhat, attributes);

    if (!findWhat) {
        return false;
    } else if (typeof errorz === "undefined" || errorz === null) {
        return false;
    } else {
        if (errorz.match) {
            if (errorz.match(txtToFind)) {
                return true;
            }
        } else {
            return false;
        }
    }
}

function restore_defaults() {
    if (typeof allSettings == "undefined") {
        allSettings = {};
    }
    currentNoteType = null;
    currentFields = null;
    currentDeck = null;
    allSettings.debugStatus = 0;
    allSettings.syncFrequency = "Manual";
    allSettings.forcePlainText = true;
    allSettings.cleanPastedHTML = true;
    allSettings.saveNotes = true;
    allSettings.stickyFields = true;
    allSettings.favouriteDeckMenu = 0;
    allSettings.favouriteModelMenu = 0;
    allSettings.removeDuplicateNotes = false;

    saveChanges("allSettings", allSettings);
}

function isUpdatedNow(openUrl = 0) {
    createContextMenu();
    // if (openUrl === 1) {
    //     chrome.tabs.create({
    //         url: "https://codehealthy.com/chrome-anki-quick-adder/#latest-update"
    //     }, function (tab) {
    //         debugLog("update tab launched");
    //     });
    // }
}

function isInstalledNow() {
    restore_defaults();
    // window.open not available
    chrome.tabs.create({
        url: "popup.html"
    });

    chrome.tabs.create({
        url: "https://github.com/1nsp1r3rnzt/chrome-anki-quick-adder?tab=readme-ov-file#installation"
    }, function (tab) {
        debugLog("install tab launched");
    });
}

chrome.runtime.onConnect.addListener(function (port) {
    port.onMessage.addListener(function (msg) {
        debugLog("message recieved" + msg);
        if (msg === "reloadContextMenu") {
            restore_options();
            updateContextMenu();
        }
    });
});


function restore_options() {
    getChanges("connectionStatus");
    getChanges("favourites");
    getChanges("deckNamesSaved");
    getChanges("currentDeck");
    getChanges("currentNoteType");
    getChanges("currentFields");
    getChanges("savedFormFields", "local");
    getChanges("storedFieldsForModels");
    getChanges("modelNamesSaved");
    getChanges("getTagsSaved");
    getChanges("allSettings"); //default
    getChanges("allSavedNotes");
    getChanges("stickyFields");
    getChanges("stickyTags", "local")
}


chrome.contextMenus.onClicked.addListener(function (clickedData) {
    var currentItem = clickedData.menuItemId;

    if (clickedData.selectionText) {
        //add to back
        if (currentItem.indexOf("secretFieldKey12z-") >= 0) {
            var currentFieldName = currentItem.replace(/secretFieldKey12z-/gi, "");
            debugLog(savedFormFields);
            var fieldNumber = currentFields.indexOf(currentFieldName);
            if (allSettings.appendModeSettings == 1) {
                if (isValidValue(savedFormFields[fieldNumber])) {
                    savedFormFields[fieldNumber] = savedFormFields[fieldNumber] + "<br>" + clickedData.selectionText;
                } else {
                    savedFormFields[fieldNumber] = clickedData.selectionText;
                }
            } else {
                savedFormFields[fieldNumber] = clickedData.selectionText;
            }
        }
        saveChanges("savedFormFields", savedFormFields, "local");
    }

    if (currentItem === "ankiRecoverMenu" || currentItem === "ankiRecoverSubMenu") {
        updateContextMenu();
    }
    if (currentItem.indexOf("ClearAllItems") >= 0) {
        clearStickySettings("all");
    }
    if (currentItem.indexOf("clearFieldKey12z-") >= 0) {
        let fieldToClear = currentItem.replace(/clearFieldKey12z-/gi, "");
        var indexFieldToClear = currentFields.indexOf(fieldToClear);
        savedFormFields[indexFieldToClear] = "";
        saveChanges("savedFormFields", savedFormFields, "local");
    }
    //workaround for updating deck through context menu.

    if (currentItem.indexOf("secretDeckKey12z") >= 0) {
        var currentdeckName = currentItem.replace(/secretDeckKey12z-/gi, "");
        saveChanges("currentDeck", currentdeckName);
    }

    if (currentItem.indexOf("secretModelKey12z") >= 0) {
        var currentModelName = currentItem.replace(/secretModelKey12z-/gi, "");

        saveChanges("currentNoteType", currentModelName);
        currentNoteType = currentModelName;

        if (storedFieldsForModels.hasOwnProperty(currentModelName)) {
            saveChanges("currentFields", storedFieldsForModels[currentModelName]);
        } else {

        }
    }
    //        workaround for submitting through chrome menu
    if (currentItem === "ankiSubmit") {
        submitToAnki();
    }
});


function isValidValue(value) {
    if (value === null || typeof value === "undefined") {
        return false;
    } else {
        return true;
    }
}


function getTagsArray(tagsString) {
    if (typeof tagsString === "string") {
        tagsString = tagsString.replace(/\,+\s+$|\,+$/, '');
        return tagsString.split(",");
    }
}

function getCurrentTags() {
    let currentTags = [];
    if (isValidValue(stickyTags)) {
        currentTags = stickyTags.replace(/;/g, ",");
        currentTags = getTagsArray(currentTags);
    }
    return currentTags;
}

function submitToAnki() {
    // saveChanges("savedFormFields", savedFormFields, "local");
    let params = null;
    if (isValidValue(currentFields)) {

        let currentTags = getCurrentTags();
        console.log(currentTags);
        var counter = 0;
        var arrayToSend = {};
        var sendValue;

        // Replaced $.each
        currentFields.forEach(function (value, index) {
            try {
                var textfieldValue = savedFormFields[index];
                if (isTextFieldValid(textfieldValue)) {
                    sendValue = textfieldValue;
                    counter++;
                } else {
                    sendValue = "";
                }
            } catch (error) {
                sendValue = "";
                notifyUser("Please edit your card. Can't parse ID" + value, "notifyalert");
            }
            arrayToSend[value] = sendValue;
        });

        params = {
            "note": {
                "deckName": currentDeck,
                "modelName": currentNoteType,
                "fields": arrayToSend,
                "tags": currentTags
            }
        };
        if (counter === 0) {
            if (connectionStatus === false) {
                notifyUser("Can't connect to Anki. Please check it", "notifyAlert");
            } else {
                notifyUser("All fields are empty", "notifyAlert");
            }
        } else if (allSettings.saveNotes === "trueLocal") {
            let valueToStore = JSON.stringify(params);
            saveNotesLocally(valueToStore);
        } else {
            ankiConnectRequest("addNote", 6, params)
                .then(function (fulfilled) {
                    notifyUser("Note is added to Anki succesfully.", "notifyalert");
                    chrome.runtime.sendMessage({
                        msg: "noteAdded",
                        data: ""
                    });
                    clearStickySettings();
                    clearStickyTags();
                })
                .catch(function (error) {
                    {
                        //notification for error
                        var currentError = JSON.stringify(error);
                        if (findRegex("Note is duplicate", currentError)) {
                            if (allSettings.stickyFields === true) {
                                notifyUser("Duplicate Note. Please change main field or disable sticky fields or use clear all in Menu", "notifyalert");
                            } else {
                                notifyUser("This is a duplicate Note. Please change main field.", "notifyalert");
                            }
                        } else if (findRegex("Collection was not found", currentError)) {
                            notifyUser("Collection was not found", "notifyalert");
                        } else if (findRegex("Note was empty", currentError)) {
                            notifyUser("Note or front field was empty", "notifyalert");
                        } else if (findRegex("Model was not found", currentError)) {
                            notifyUser("Model was not found.Please create model:" + currentNoteType, "notifyalert");
                        } else if (findRegex("Deck was not found", currentError)) {
                            notifyUser("Deck was not found.Please create Deck:" + currentDeck, "notifyalert");
                        } else if (findRegex("failed to connect to AnkiConnect", currentError)) {
                            //defaults save Notes
                            if (!isValidValue(allSettings.saveNotes)) {
                                allSettings.saveNotes = true;
                                saveChanges("allSettings", allSettings);
                            }

                            if (allSettings.saveNotes === true) {
                                let valueToStore = JSON.stringify(params);
                                saveNotesLocally(valueToStore);
                            } else {
                                notifyUser("No connection.Turn on settings-> saveNotes to save in LocalStorage ", "notifyalert");
                            }
                        } else {
                            notifyUser("Error: " + error, "notifyalert");
                        }
                    }
                });
        }
    }
}

function clearStickyTags() {
    if (allSettings.stickyTags !== true) {
        stickyTags = '';
        removeSettings("stickyTags", "local");
    }
    else {
    }
}

function saveNotesLocally(value) {
    if (allSavedNotes.indexOf(value) != "-1") {
        notifyUser("Note is already Saved in local list.", "notifyalert");
    } else {
        allSavedNotes.push(value);
        notifyUser("Note Saved to storage successfully", "notifyalert");
        saveChanges("allSavedNotes", allSavedNotes);
        clearStickySettings();
        clearStickyTags();
    }
}

function clearStickySettings(type = "single") {
    if (type === "all" || allSettings.stickyFields !== true) {
        savedFormFields = [];
    } else {
        if (!isValidValue(stickyFields)) {
            stickyFields = {};
        }
        if (!(currentNoteType in stickyFields)) {
            stickyFields[currentNoteType] = {};
        }
        if (savedFormFields.length > 0) {
            for (let i = 0; i < savedFormFields.length; i++) {
                let checkKeyvalue = stickyFields[currentNoteType][currentFields[i]];
                if (checkKeyvalue === false || typeof checkKeyvalue == "undefined") {
                    savedFormFields[i] = '';
                }
            }
        } else {
            savedFormFields = [];
        }
    }

    //default
    if (!isValidValue(allSettings.stickyFields)) {
        allSettings.stickyFields = true;
        saveChanges("allSettings", allSettings);
    }

    saveChanges("savedFormFields", savedFormFields, "local");
}

function updateContextMenu() {
    chrome.contextMenus.removeAll(function () {
        createContextMenu();
    });
}


function createRecoverMenu() {
    chrome.contextMenus.removeAll(function () {
        //Main Menu item
        var menuItem = {
            "id": "ankiRecoverMenu",
            "title": "Anki(Recover Menu)",
            "contexts": ["selection", "all"]
        };
        chrome.contextMenus.create(menuItem);
    });
}

function createContextMenu() {
    //Main Menu item
    var parentItem = {
        "id": "ankiAddWord",
        "title": "Anki Quick Adder",
        "contexts": ["selection", "all"]
    };
    chrome.contextMenus.create(parentItem);

    //submit button  :child->Main Menu

    var submitMenu = {
        "parentId": "ankiAddWord",
        "id": "ankiSubmit",
        "title": "Submit",
        "contexts": ["selection", "all"]
    };
    chrome.contextMenus.create(submitMenu);

    //clear button :child->main menu
    var ClearMenu = {
        "parentId": "ankiAddWord",
        "id": "ClearMenu",
        "title": "Clear Field ->",
        "contexts": ["selection", "all"]
    };
    chrome.contextMenus.create(ClearMenu);


    if (currentFields) {
        currentFields.forEach(function (value, index) {
            var clearItem = {
                "parentId": "ClearMenu",
                "id": "clearFieldKey12z-" + value,
                "title": "Clear " + value,
                "contexts": ["selection", "all"]
            };
            chrome.contextMenus.create(clearItem);
        });
    }
    var separatorClear = {
        "id": "ankiSeparateClear",
        "type": "separator",
        "parentId": "ClearMenu",
        "contexts": ["selection"]
    };
    chrome.contextMenus.create(separatorClear);
    var clearAllItems = {
        "parentId": "ClearMenu",
        "id": "ClearAllItems",
        "title": "Clear All",
        "contexts": ["selection", "all"]
    };
    chrome.contextMenus.create(clearAllItems);

    //update deck menu :child->Main Menu
    debugLog("value is " + currentDeck);
    var displayDeckName = (currentDeck) ? filteredDeckName(currentDeck, "mainMenu") : "None";
    var currentDeckMenu = {
        "parentId": "ankiAddWord",
        "id": "ankiCurrentDeck",
        "title": "Deck: " + displayDeckName,
        "contexts": ["selection", "all"]
    };
    chrome.contextMenus.create(currentDeckMenu);

    //separator for ankiAddWord
    var separatorz2 = {
        "id": "ankiSeparate2",
        "type": "separator",
        "parentId": "ankiAddWord",
        "contexts": ["selection"]
    };
    chrome.contextMenus.create(separatorz2);
    //Decksublist :child->ankiCurrentDeck->
    let deckToSelect;

    if (allSettings.favouriteDeckMenu == 1 && favourites && favourites.deck && favourites.deck.length > 0) {
        deckToSelect = favourites.deck;
    } else {
        deckToSelect = deckNamesSaved;
    }

    if (deckToSelect) {
        deckToSelect.sort().forEach(function (value, index) {
            var childItem = {
                "parentId": "ankiCurrentDeck",
                "id": "secretDeckKey12z-" + value,
                "title": filteredDeckName(value),
                "contexts": ["selection", "all"]
            };
            chrome.contextMenus.create(childItem);
        });
    }

    //Model menu

    var modelNameSliced;
    //update model menu :child->Main Menu
    if (currentNoteType && currentNoteType.length > 20) {
        modelNameSliced = currentNoteType.slice(0, 20) + "...";
    } else {
        modelNameSliced = currentNoteType || "None";
    }
    var currentModelMenu = {
        "parentId": "ankiAddWord",
        "id": "ankiCurrentModel",
        "title": "Model: " + modelNameSliced,
        "contexts": ["selection", "all"]
    };
    chrome.contextMenus.create(currentModelMenu);
    let modelToSelect;

    if (allSettings.favouriteModelMenu == 1 && favourites && favourites.model && favourites.model.length > 0) {
        modelToSelect = favourites.model;
    } else {
        modelToSelect = modelNamesSaved;
    }

    if (modelToSelect) {
        modelToSelect.sort().forEach(function (value, index) {
            var childItem = {
                "parentId": "ankiCurrentModel",
                "id": "secretModelKey12z-" + value,
                "title": value,
                "contexts": ["selection", "all"]
            };
            chrome.contextMenus.create(childItem);
        });
    }
    //separator for ankiAddWord
    var separatorz3 = {
        "id": "ankiSeparate3",
        "type": "separator",
        "parentId": "ankiAddWord",
        "contexts": ["selection", "all"]
    };
    chrome.contextMenus.create(separatorz3);
    //Main Menu item
    var recoverMenuItem = {
        "parentId": "ankiAddWord",
        "id": "ankiRecoverSubMenu",
        "title": "Recover or Refresh Menu",
        "contexts": ["selection", "all"]
    };
    chrome.contextMenus.create(recoverMenuItem);
    debugLog("created menu successfully");
}


chrome.storage.onChanged.addListener(function (changes, namespace) {
    for (let key in changes) {
        let storageChange = changes[key];
        debugLog("key:" + key + " new value below:");
        debugLog(storageChange.newValue);

        let settingsToSave = [
            "getTagsSaved",
            "deckNamesSaved", "modelNamesSaved",
            "savedFormFields",
            "allSavedNotes",
            "stickyFields",
            "stickyTags",
            "allSettings",
            "currentNoteType",
            "storedFieldsForModels"
        ];

        if (settingsToSave.indexOf(key) !== -1) {
            // Replaced window[key] with globalCache
            globalCache[key] = storageChange.newValue;
            // Also update the specific global variables if they exist
            if (key === "currentNoteType") currentNoteType = storageChange.newValue;
            if (key === "currentDeck") currentDeck = storageChange.newValue;
            if (key === "currentFields") currentFields = storageChange.newValue;
            if (key === "savedFormFields") savedFormFields = storageChange.newValue;
            if (key === "deckNamesSaved") deckNamesSaved = storageChange.newValue;
            if (key === "modelNamesSaved") modelNamesSaved = storageChange.newValue;
            if (key === "storedFieldsForModels") storedFieldsForModels = storageChange.newValue;
            if (key === "allSettings") allSettings = storageChange.newValue;
            if (key === "allSavedNotes") allSavedNotes = storageChange.newValue;
            if (key === "stickyFields") stickyFields = storageChange.newValue;
            if (key === "favourites") favourites = storageChange.newValue;
            if (key === "stickyTags") stickyTags = storageChange.newValue;
            if (key === "connectionStatus") connectionStatus = storageChange.newValue;
        }
        //setting with validation

        if ("currentFields" === key) {
            if (isValidValue(deckNamesSaved) && isValidValue(modelNamesSaved)) {
                currentFields = storageChange.newValue;
                updateContextMenu();
            }
        }

        if ("stickyTags" === key) {
            if (isValidValue(storageChange.newValue)) {
                stickyTags = storageChange.newValue;
            }
        }

        if ("favourites" === key) {
            if (isValidValue(storageChange.newValue)) {
                favourites = storageChange.newValue;
                if (allSettings.favouriteDeckMenu == 1 || allSettings.favouriteModelMenu == 1) {
                    chrome.contextMenus.removeAll(function () {
                        debugLog("Creating all menu");
                        createContextMenu();
                    });
                }
            }
        }

        if ("currentDeck" === key) {
            if (isValidValue(storageChange.newValue)) {
                currentDeck = storageChange.newValue;
                debugLog("current Fields are" + currentFields);
                if (isValidValue(currentFields)) {
                    updateContextMenu();
                }
            }
        }

        if ("connectionStatus" === key) {
            if (storageChange.newValue === false) {
                createRecoverMenu();
            } else if (storageChange.newValue === true && storageChange.oldValue === false) {
                chrome.contextMenus.removeAll(function () {
                    debugLog("Creating all menu");
                    createContextMenu();
                });
            }
        }
    }
});

function removeSettings(value, type = "sync") {
    if (!isValidValue(value)) {
        return false;
    } else {
        if (type === "local") {
            chrome.storage.local.remove(value, function (Items) {
                debugLog("Local settings removed" + value);
            });
        }
        else {
            chrome.storage.sync.remove(value, function (Items) {
                debugLog("settings removed" + value);
            });
        }
    }
}


function filteredDeckName(value, type = "subMenu") {
    if (value && value.indexOf("::") !== -1) {
        var stringLength = value.substring(0, value.lastIndexOf("::") + 2).length;
        var last = value.substring(value.lastIndexOf("::") + 2, value.length);
        var spaceLength = stringLength - 10 > 5 ? stringLength - 10 : "5";
        if (type == "mainMenu") {
            return last;
        }
        else {
            return "\xA0".repeat(spaceLength) + last;
        }
    } else {
        return value;
    }
}

function saveChanges(key, value, type = "sync") {
    // Check that there's some code there.
    if (!value) {
        debugLog('Error: No value specified for' + key);
        return;
    }

    if (type === "sync") {
        // Save it using the Chrome extension storage API.
        chrome.storage.sync.set({
            [key]: value
        }, function () {
            let error = chrome.runtime.lastError;
            if (error) {
                if (allSettings.debugStatus === 1) {
                    notifyUser("Can't save" + key + JSON.stringify(error), "error,text,3000");
                }
            }
            //TODO: show to use for saved settings..
            debugLog('Settings saved for' + key + " and val below");
            debugLog(value);
        });
    } else if (type === "local") {
        // Save it using the Chrome extension storage API.
        chrome.storage.local.set({
            [key]: value
        }, function () {
            var error = chrome.runtime.lastError;
            if (error) {
                if (allSettings.debugStatus === 1) {
                    notifyUser("Can't save" + key + JSON.stringify(error), "error,text,3000");
                }
            }
            //TODO: show to use for saved settings..
            debugLog('Settings saved for' + key + " and val below");
            debugLog(value);
        });
    }

    // Update global cache/variables immediately
    globalCache[key] = value;
    if (key === "currentNoteType") currentNoteType = value;
    if (key === "currentDeck") currentDeck = value;
    if (key === "currentFields") currentFields = value;
    if (key === "savedFormFields") savedFormFields = value;
    if (key === "deckNamesSaved") deckNamesSaved = value;
    if (key === "modelNamesSaved") modelNamesSaved = value;
    if (key === "storedFieldsForModels") storedFieldsForModels = value;
    if (key === "allSettings") allSettings = value;
    if (key === "allSavedNotes") allSavedNotes = value;
    if (key === "stickyFields") stickyFields = value;
    if (key === "favourites") favourites = value;
    if (key === "stickyTags") stickyTags = value;
    if (key === "connectionStatus") connectionStatus = value;
}

function isTextFieldValid(value) {
    if (value) {
        if (value === "<p><br></p>" || value === "<p></p>" || value === "<br>") {
            return false;
        } else {
            return true;
        }
    } else {
        return false;
    }
}

function getChanges(key, type = "sync") {
    var valueReturn;

    if (type == "sync") {
        chrome.storage.sync.get([key], function (result) {
            valueReturn = result[key];
            if (typeof valueReturn != "undefined") {
                setValue(key, valueReturn);
            } else {
                debugLog(key + " is undefined or" + valueReturn);
            }
        });
    } else if (type == "local") {
        chrome.storage.local.get([key], function (result) {
            valueReturn = result[key];
            if (typeof valueReturn != "undefined") {
                setValue(key, valueReturn);
            } else {
                debugLog(key + " is undefined or" + valueReturn);
            }
        });
    }
}

function setValue(key, valueReturn) {
    //cases for old settings
    let val = valueReturn;
    if (valueReturn === "true") val = true;
    else if (valueReturn === "false") val = false;
    else if (valueReturn === "0") val = 0;
    else if (valueReturn === "1") val = 1;

    // Update global cache and variables
    globalCache[key] = val;
    if (key === "currentNoteType") currentNoteType = val;
    if (key === "currentDeck") currentDeck = val;
    if (key === "currentFields") currentFields = val;
    if (key === "savedFormFields") savedFormFields = val;
    if (key === "deckNamesSaved") deckNamesSaved = val;
    if (key === "modelNamesSaved") modelNamesSaved = val;
    if (key === "storedFieldsForModels") storedFieldsForModels = val;
    if (key === "allSettings") allSettings = val;
    if (key === "allSavedNotes") allSavedNotes = val;
    if (key === "stickyFields") stickyFields = val;
    if (key === "favourites") favourites = val;
    if (key === "stickyTags") stickyTags = val;
    if (key === "connectionStatus") connectionStatus = val;

    debugLog(key + " and value below");
    debugLog(valueReturn);
    debugLog("----------");
}

var debugLog = (function (undefined) {
    var debugLog = Error;
    debugLog.prototype.write = function (args) {
        var suffix = {
            "@": (this.lineNumber ?
                this.fileName + ':' + this.lineNumber + ":1"
                :
                extractLineNumberFromStack(this.stack)
            )
        };

        args = args.concat([suffix]);
        if (console && console.log) {
            if (console.log.apply) {
                console.log.apply(console, args);
            } else {
                console.log(args);
            }
        }
    };
    var extractLineNumberFromStack = function (stack) {
        if (!stack) return '?';
        var line = stack.split('\n')[2];
        line = (line.indexOf(' (') >= 0 ?
            line.split(' (')[1].substring(0, line.length - 1) :
            line.split('at ')[1]
        );
        return line;
    };

    return function (params) {
        if (typeof allSettings.debugStatus === typeof undefined || allSettings.debugStatus === 0) return;
        debugLog().write(Array.prototype.slice.call(arguments, 0));
    };

})();

// Initialize
restore_options();