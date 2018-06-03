var deckNames;
var currentFields;
var currentNoteType;
var savedFormFields = savedFormFields || [];
var appendModeSettings;
var noteSent = 0;
var debugStatus;
chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason == "install") {
        isInstalledNow();
    } else if (details.reason == "update") {
        //for future
    }
});
//TODO: Both are null

function isInstalledNow() {
    var win = window.open("popup.html", "extension_popup", "width=300,height=400,status=no,scrollbars=yes,resizable=no");

    setTimeout(function () {
        win.close();
    }, 2000);

    saveChanges("appendModeSettings", "1");
    saveChanges("debugStatus", "0");
    debugStatus = 1;
    chrome.runtime.openOptionsPage(function (details) {
        debugLog("opened options.page");

    });
}

chrome.extension.onConnect.addListener(function (port) {
    // debugLog("popup connected");
    port.onMessage.addListener(function (msg) {
        debugLog("message recieved" + msg);
        if (msg == "reloadContextMenu") {

            updateContextMenu();
        } else if (msg == "resetForms") {

            savedFormFields = [];
            debugLog(savedFormFields);
        }


    });
});


function restore_options() {
    getChanges("debugStatus");
    getChanges("currentDeck");
    getChanges("deckNames");
    getChanges("currentNoteType");
    getChanges("currentFields");
    getChanges("appendModeSettings");

}

$(document).ready(function () {

    // ..
    restore_options();
    // ..

});

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
                    savedFormFields[currentFieldName] = savedFormFields[currentFieldName] + "<br>" + clickedData.selectionText;

                }
                else

                {
                    savedFormFields[currentFieldName] = clickedData.selectionText;

                	
                }
            } else {

            			alert(currentFieldName);
                savedFormFields[currentFieldName] = clickedData.selectionText;

            }



        }


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
        //workaround for using listner 1 time
        noteSent = 1;
        saveChanges("savedFormFields", savedFormFields);
        if (typeof savedFormFields != "undefined") {
            var win = window.open("popup.html", "extension_popup", "width=300,height=400,status=no,scrollbars=yes,resizable=no");
            setTimeout(function () {

                win.close();
            }, 1200);

            chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
                if (message.data == "pageReadyForMessage") {

                    if (noteSent === 1) {
                        chrome.runtime.sendMessage({
                            data: "subMitData"
                        }, function (response) {});


                    } else {

                        chrome.runtime.onMessage.removeListener(arguments.callee);
                        // debugLog("listner removed");
                    }
                    noteSent = 0;
                }

            });
        } else {
            debugLog("cant read fields");
        }
    }



});


function updateContextMenu() {
    chrome.contextMenus.removeAll(function () {

        createContextMenu();

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
    $.each(deckNames.sort(), function (index, value) {
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
        debugLog("called");
    });
}



chrome.storage.onChanged.addListener(function (changes, namespace) {
    for (var key in changes) {
        var storageChange = changes[key];
        debugLog("key:" + key + " new value:" + storageChange.newValue);
        if ("deckNames" == key) {
            deckNames = storageChange.newValue;

        }
        if ("currentFields" == key) {
            //clear saved forms..
            savedFormFields = [];
            chrome.contextMenus.removeAll(function () {
                currentFields = storageChange.newValue;
                debugLog("I am creating menu");
                createContextMenu();
            });

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

            }


        }

        if ("appendModeSettings" == key) {

            appendModeSettings = storageChange.newValue;
        }


        if ("connectionStatus" == key) {
            if (storageChange.newValue == "false") {
                chrome.contextMenus.removeAll(function () {

                    debugLog("connection Lost, removing menus");

                });
            }

        }


    }


});

function saveChanges(key, value) {

    if (!value) {
        message('Error: No value specified');
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
        if (typeof debugStatus === typeof undefined || debugStatus == 0) return;

        // call handler extension which provides stack trace
        debugLog().write(Array.prototype.slice.call(arguments, 0)); // turn into proper array
    }; //--  fn  returned

})(); //--- _debugLog