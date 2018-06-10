var currentFields;
var currentNoteType;
var savedFormFields = savedFormFields || [];
var appendModeSettings;
var debugStatus;
var currentDeck;
var deckNamesSaved;
var syncFrequency;
var manifest = chrome.runtime.getManifest();
var onceTimeForceSync;
var currentTags;
var connectionStatus;
var modelNamesSaved;
var storedFieldsForModels = storedFieldsForModels || {};
var editor;
var allSettings = {};


chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action == "wakeup") {

    }
});

chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason == "install") {
        isInstalledNow();
    } else if (details.reason == "update") {

        isUpdatedNow();
    }
});

/* The function that finds and returns the selected text */
var funcToInject = function () {
    var selection = window.getSelection();
    return (selection.rangeCount > 0) ? selection.toString() : '';
};

/* This line converts the above function to string
 * (and makes sure it will be called instantly) */
var jsCodeStr = ';(' + funcToInject + ')();';

chrome.commands.onCommand.addListener(function (cmd) {
    if (cmd != "submit-data-to-popup") {
        /* Inject the code into all frames of the active tab */
        chrome.tabs.executeScript({
            code: jsCodeStr,
            allFrames: true //  <-- inject into all frames, as the selection
            //      might be in an iframe, not the main page
        }, function (selectedTextPerFrame) {
            if (chrome.runtime.lastError) {
                /* show error */
                createNotification('ERROR:\n' + chrome.runtime.lastError.message);
            } else if ((selectedTextPerFrame.length > 0) && (typeof (selectedTextPerFrame[0]) === 'string')) {
                /* The results are as expected */
                if (selectedTextPerFrame[0]) {
                    try {

                        var fieldToAdd;
                        var currentText = selectedTextPerFrame[0];

                        if (cmd == "add-to-first-field") {
                            fieldToAdd = 0;

                        } else if (cmd == "add-to-second-field") {
                            fieldToAdd = 1;

                        } else if (cmd == "add-to-third-field") {
                            fieldToAdd = 2;

                        }
                        if (currentText.length < 30) {
                            displayText = currentText;
                        } else {
                            displayText = currentText.slice(0, 30) + "...";

                        }

                        var currentFieldName = currentFields[fieldToAdd];

                        if (typeof currentFieldName != "undefined") {


                            if (appendModeSettings == 1) {
                                if (savedFormFields.hasOwnProperty(currentFieldName)) {
                                    savedFormFields[currentFieldName] = savedFormFields[currentFieldName] + "<p></p>" + currentText;
                                    createNotification("Appended: " + displayText + " to field: " + currentFieldName);

                                } else

                                {
                                    savedFormFields[currentFieldName] = currentText;
                                    createNotification("Added: " + displayText + " to field: " + currentFieldName);


                                }
                            } else {

                                savedFormFields[currentFieldName] = currentText;
                                createNotification("Added: " + displayText + " to field: " + currentFieldName);

                            }
                        } else {
                            createNotification("Sorry, No Field number " + (fieldToAdd + 1) + " for Model:" + currentNoteType);


                        }
                    } catch (e) {
                        debugLog(e);
                        createNotification("Error: please open Anki, then extension pop to sync.");
                    }

                } else {


                    debugLog("null");
                }



            }
        });
    } else if (cmd == "submit-data-to-popup") {
        submitToAnki();

    }
});


function ankiConnectRequest(action, version, params = {}) {
    return new Promise((resolve, reject) => {
        if (((typeof window[action + "Saved"] != "undefined") && (syncFrequency == "Manual" || onceTimeForceSync === 0)) && ((action != "sync") || (action != "addNote"))) {
            resolve(window[action + "Saved"]);

        } else {
            const xhr = new XMLHttpRequest();
            xhr.addEventListener('error', () => reject('failed to connect to AnkiConnect'));
            xhr.addEventListener('load', () => {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.error) {
                        throw response.error;
                    } else {
                        if (response.hasOwnProperty('result')) {


                            if (response.result) {
                                resolve(response.result);
                                saveChanges(action + "Saved", response.result);

                            } else {
                                throw response.error;
                            }


                        } else {
                            reject('failed to get results from AnkiConnect');
                        }
                    }
                } catch (e) {
                    reject(e);
                }
            });

            xhr.open('POST', 'http://127.0.0.1:8765');
            var sendData = JSON.stringify({
                action,
                version,
                params
            });

            xhr.send(sendData);
            // debugLog(sendData);
        }
    });
}



function notifyUser(notifyContent, notificationType) {
    var notifyString = JSON.stringify(notifyContent);

    if (notificationType == "notifyalert" || notificationType == "notifyAlert") {


        try {
            createNotification(notifyString);

        } catch (err) {
            alert(notifyString);

        }

    } else if (notificationType == "alert") {
        alert(notifyString);
    } else if (notificationType == "notify") {

        createNotification(notifyString);


    } else {
        return;
    }

}

function createNotification(notificationTitle) {
    var manifestName;

    var manifestVersion;

    if (typeof manifestName == "undefined") {
        manifestName = "Anki Quick Adder";

    } else {
        manifestName = manifest.name;


    }
    if (typeof manifestVersion == "undefined") {
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
    var txtToFind = new RegExp(findWhat, attributes);

    if (!findWhat) {
        return false;
    } else if (errorz === null) {
        return false;

    } else {

        if ((errorz.match(txtToFind))) {
            return true;
        } else {
            return false;


        }
    }

}

document.addEventListener('DOMContentLoaded', restore_options);



//updated
function isUpdatedNow(){
    saveChanges("syncFrequency", "Manual");

    chrome.tabs.create({
        url: "https://codehealthy.com/chrome-anki-quick-adder/#latest-update"
    }, function (tab) {
        debugLog("update tab launched");
    });

}
//installed defaults
function isInstalledNow() {
    saveChanges("appendModeSettings", "1");
    saveChanges("debugStatus", "0");
    saveChanges("syncFrequency", "Manual");
    var allSettings = {};
    allSettings.forcePlainText = "true";
    allSettings.cleanPastedHTML = "true";
    saveChanges("allSettings", allSettings);

    debugStatus = 1;
    var win = window.open("popup.html", "extension_popup", "width=300,height=400,status=no,scrollbars=yes,resizable=no");

    setTimeout(function () {
        win.close();
    }, 2000);


    chrome.tabs.create({
        url: "https://codehealthy.com/chrome-anki-quick-adder/#getting-started"
    }, function (tab) {
        debugLog("update tab launched");
    });
}

chrome.extension.onConnect.addListener(function (port) {
    // debugLog("popup connected");
    port.onMessage.addListener(function (msg) {
        debugLog("message recieved" + msg);
        if (msg == "reloadContextMenu") {
            restore_options();
            updateContextMenu();
        } else if (msg == "resetForms") {

            savedFormFields = [];
            debugLog(savedFormFields);
        }


    });
});


function restore_options() {
    getChanges("connectionStatus");
    getChanges("favourites");
    getChanges("deckNamesSaved");
    getChanges("syncFrequency"); //default
    getChanges("debugStatus"); //default
    getChanges("currentDeck");
    getChanges("currentNoteType");
    getChanges("currentFields");
    getChanges("storedFieldsForModels");
    getChanges("appendModeSettings"); //default
    getChanges("modelNamesSaved");
    getChanges("getTagsSaved");
    getChanges("allSettings");

}

function fieldsSync() {

    return savedFormFields;
}

chrome.contextMenus.onClicked.addListener(function (clickedData) {
    var currentItem = clickedData.menuItemId;

    if (clickedData.selectionText) {

        //add to back
        if (currentItem.indexOf("secretFieldKey12z-") >= 0) {
            var currentFieldName = currentItem.replace(/secretFieldKey12z-/gi, "");

            debugLog(savedFormFields);

            if (appendModeSettings == 1) {
                if (savedFormFields.hasOwnProperty(currentFieldName)) {
                    savedFormFields[currentFieldName] = savedFormFields[currentFieldName] + "<p></p>" + clickedData.selectionText;

                } else

                {
                    savedFormFields[currentFieldName] = clickedData.selectionText;


                }
            } else {

                savedFormFields[currentFieldName] = clickedData.selectionText;

            }



        }


    }

    if (currentItem == "ankiRecoverMenu" || currentItem == "ankiRecoverMenuSub") {
        updateContextMenu();

    }

    if (currentItem.indexOf("clearFieldKey12z-") >= 0 || currentItem == "ClearAllItems") {
        var fieldToClear = currentItem.replace(/clearFieldKey12z-/gi, "");
        Object.keys(savedFormFields).forEach(function (key) {
            if (currentItem == "ClearAllItems") {
                delete savedFormFields[key];
                debugLog("clearing" + key);

            } else {

                if (key == fieldToClear) {

                    delete savedFormFields[key];
                    debugLog("cleared the" + key);
                    return;
                }
            }
        });

    }
    //workaround for updating deck through context menu.

    if (currentItem.indexOf("secretDeckKey12z") >= 0) {
        var currentdeckName = currentItem.replace(/secretDeckKey12z-/gi, "");
        saveChanges("currentDeck", currentdeckName);

    }
    //        workaround for submitting through chrome menu
    if (currentItem == "ankiSubmit") {
        submitToAnki();
    }



});


function submitToAnki() {
    saveChanges("savedFormFields", savedFormFields);
    if (typeof currentFields != "undefined") {
        currentTags = "";
        var counter = 0;
        var arrayToSend = {};
        var sendValue;
        $.each(currentFields, function (index, value) {

            try {
                textfieldValue = savedFormFields[value];
                if (typeof textfieldValue != "undefined" || textfieldValue != "<p><br></p>") {
                    sendValue = textfieldValue;
                    counter++;
                } else {

                    sendValue = "";
                }
            } catch (error) {
                sendValue = "";
                notifyUser("Please edit your card. Can't parse ID" + value);
            }


            arrayToSend[value] = sendValue;

        });
        debugLog(arrayToSend);

        if (counter === 0) {

            if (connectionStatus == "false") {
                notifyUser("Can't connect to Anki. Please check it", "notifyAlert");


            } else {
                notifyUser("All fields are empty", "notifyAlert");

            }


        } else {
            var params = {
                "note": {
                    "deckName": currentDeck,
                    "modelName": currentNoteType,
                    "fields": arrayToSend,
                    "tags": [currentTags]
                }
            };
            ankiConnectRequest("addNote", 6, params)
                .then(function (fulfilled) {

                    savedFormFields = [];
                    saveChanges("savedFormFields", savedFormFields);
                    notifyUser("Note is added succesfully.", "notifyalert");


                })
                .catch(function (error) {

                    {
                        //notification for error
                        var currentError = JSON.stringify(error);
                        if (findRegex("Note is duplicate", currentError)) {
                            notifyUser("This is a duplicate Note. Please change main field and try again", "notifyalert");

                        } else if (findRegex("Collection was not found", currentError)) {
                            notifyUser("Collection was not found", "notifyalert");

                        } else if (findRegex("Note was empty", currentError)) {
                            notifyUser("Note or front field was empty", "notifyalert");

                        } else if (findRegex("Model was not found", currentError)) {
                            notifyUser("Model was not found.Please create model:" + currentNoteType, "notifyalert");

                        } else if (findRegex("Deck was not found", currentError)) {
                            notifyUser("Deck was not found.Please create Deck:" + currentDeck, "notifyalert");

                        } else {
                            notifyUser("Error: " + error, "notifyalert");
                        }
                    }
                });
        }

    }
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
    var menuItem = {
        "id": "ankiAddWord",
        "title": "Add to Anki",
        "contexts": ["selection", "all"]
    };

    chrome.contextMenus.create(menuItem);

    //card input Fields :child->Main Menu
    $.each(currentFields, function (index, value) {
        var childItem = {
            "parentId": "ankiAddWord",
            "id": "secretFieldKey12z-" + value,
            "title": "Add to " + value,
            "contexts": ["selection"]
        };
        chrome.contextMenus.create(childItem);

    });
    //separator - child->Main Menu
    var separatorz = {
        "id": "ankiSeparate",
        "type": "separator",
        "parentId": "ankiAddWord",
        "contexts": ["selection"]


    };
    chrome.contextMenus.create(separatorz);

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


    $.each(currentFields, function (index, value) {
        var clearItem = {
            "parentId": "ClearMenu",
            "id": "clearFieldKey12z-" + value,
            "title": "Clear " + value,
            "contexts": ["selection", "all"]
        };
        chrome.contextMenus.create(clearItem);

    });
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
    var displayDeck = currentDeck.replace(/:/gi, ">");
    var currentDeckMenu = {
        "parentId": "ankiAddWord",
        "id": "ankiCurrentDeck",
        "title": "Deck: " + displayDeck,
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
    $.each(deckNamesSaved.sort(), function (index, value) {
        var textFieldValue;
        // var displayDeck = value.replace(/:/gi, ">");
        if (value.indexOf("::") !== -1) {
            var stringLength = value.substring(0, value.lastIndexOf("::") + 2).length;
            var last = value.substring(value.lastIndexOf("::") + 2, value.length);
            var spaceLength = stringLength - 10 > 5 ? stringLength - 10 : "5";

            textFieldValue = "\xA0".repeat(spaceLength) + last;
        } else {
            textFieldValue = value;
        }

        var childItem = {
            "parentId": "ankiCurrentDeck",
            "id": "secretDeckKey12z-" + value,
            "title": textFieldValue,
            "contexts": ["selection", "all"]
        };
        chrome.contextMenus.create(childItem);

    });
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

    for (var key in changes) {
        var storageChange = changes[key];
        debugLog("key:" + key + " new value:" + storageChange.newValue);
        if ("deckNamesSaved" == key) {
            deckNamesSaved = storageChange.newValue;

        }

        if ("modelNamesSaved" == key) {
            modelNamesSaved = storageChange.newValue;

        }

        if ("getTagsSaved" == key) {
            getTagsSaved = storageChange.newValue;

        }
        if ("currentFields" == key) {
            //clear saved forms..
            savedFormFields = [];
            currentFields = storageChange.newValue;
            updateContextMenu();

        }


        if ("currentNoteType" == key) {

            currentNoteType = storageChange.newValue;
        }
        if ("debugStatus" == key) {

            debugStatus = storageChange.newValue;
        }


        if ("currentDeck" == key) {

            currentDeck = storageChange.newValue;
            debugLog("current Fields are" + currentFields);
            if (typeof currentFields != "undefined") {

                var deckNameFiltered = (storageChange.newValue).replace(/:/gi, ">");


                var currentDeckMenu = {
                    "parentId": "ankiAddWord",
                    "title": "Deck:" + deckNameFiltered,
                    "contexts": ["selection", "all"]
                };

                chrome.contextMenus.update("ankiCurrentDeck", currentDeckMenu);

            } else {

                debugLog("fields are unspecified.");
            }


        }

        if ("syncFrequency" == key) {

            syncFrequency = storageChange.newValue;
        }


        if ("appendModeSettings" == key) {

            appendModeSettings = storageChange.newValue;
        }


        if ("connectionStatus" == key) {
            if (storageChange.newValue == "false") {
                createRecoverMenu();

            } else if (storageChange.newValue == "true" && storageChange.oldValue == "false") {

                chrome.contextMenus.removeAll(function () {

                    debugLog("Creating all menu");
                    createContextMenu();
                });
            }

        }


    }


});

function saveChanges(key, value) {

    if (!value) {
        debugLog('Error: No value specified');
        return;
    }

    // Save it using the Chrome extension storage API.
    chrome.storage.sync.set({
        [key]: value
    }, function () {
        //TODO: show to use for saved settings..
        debugLog('Settings saved for ' + key);
    });
}


function getChanges(key) {
    var valueReturn = [];

    chrome.storage.sync.get([key], function (result) {
        // debugLog('Value currently is ' + result[key]');
        valueReturn = result[key];
        if (typeof valueReturn != "undefined") {
            setValue(key, valueReturn);
        }

    });
    // chrome.storage.sync.get(null, function (data) { console.info(data) });
}

function setValue(key, valueReturn) {
    window[key] = valueReturn;
    debugLog(key + valueReturn);

}
debugLog = (function (undefined) {
    var debugLog = Error; // does this do anything?  proper inheritance...?
    debugLog.prototype.write = function (args) {

        /// * https://stackoverflow.com/a/3806596/1037948
        var suffix = {
            "@": (this.lineNumber ?
                    this.fileName + ':' + this.lineNumber + ":1" // add arbitrary column value for chrome linking
                    :
                    extractLineNumberFromStack(this.stack)
            )
        };

        args = args.concat([suffix]);
        // via @paulirish console wrapper
        if (console && console.log) {
            if (console.log.apply) {
                console.log.apply(console, args);
            } else {
                console.log(args);
            } // nicer display in some browsers
        }
    };
    var extractLineNumberFromStack = function (stack) {

        if (!stack) return '?'; // fix undefined issue reported by @sigod

        // correct line number according to how Log().write implemented
        var line = stack.split('\n')[2];
        // fix for various display text
        line = (line.indexOf(' (') >= 0 ?
                line.split(' (')[1].substring(0, line.length - 1) :
                line.split('at ')[1]
        );
        return line;
    };

    return function (params) {

        // only if explicitly true somewhere
        if (typeof debugStatus === typeof undefined || debugStatus === 0) return;

        // call handler extension which provides stack trace
        debugLog().write(Array.prototype.slice.call(arguments, 0)); // turn into proper array
    }; //--  fn  returned

})(); //--- _debugLog