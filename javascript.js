var availableTags;
var currentDeck;
var currentFields;
var currentTags;
var currentNoteType;
var debugStatus = 0;
var savedFormFields = savedFormFields || [];
var appendModeSettings;
var manifest = chrome.runtime.getManifest();
var connectionStatus;

var port = chrome.extension.connect({
    name: "ankiadder"
});


chrome.runtime.sendMessage({
    data: "pageReadyForMessage"
}, function (response) {

});
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.data == "subMitData") {
        runAfterElementExists("#tags", function () {
            submitToAnki();
        });
    }
});

function restore_options() {
    getChanges("currentDeck");
    getChanges("currentNoteType");
    getChanges("currentFields");
    getChanges("deckNames");
    getChanges("appendModeSettings");

    try {
        var background = chrome.extension.getBackgroundPage();
        savedFormFields = background.fieldsSync();
        console.log(savedFormFields);
    } catch (e) {
        console.log(e);
        savedFormFields = [];
    }


}
document.addEventListener('DOMContentLoaded', restore_options);

function ankiConnectRequest(action, version, params = {}) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.addEventListener('error', () => reject('failed to connect to AnkiConnect'));
        xhr.addEventListener('load', () => {
            try {
                const response = JSON.parse(xhr.responseText);
                if (response.error) {
                    throw response.error;
                } else {
                    if (response.hasOwnProperty('result')) {


                        if(response.result)
                        {
                            resolve(response.result);
                            saveChanges(action, response.result);

                        }
                        else
                        {
                            throw response.error;
                        }

                        // console.log(property);

                    } else {
                        reject('failed to get results from AnkiConnect');
                    }
                }
            } catch (e) {
                reject(e);
            }
        });

        xhr.open('POST', 'http://127.0.0.1:8765');
        console.log(params);
        var sendData = JSON.stringify({
            action,
            version,
            params
        });

        xhr.send(sendData);
        // console.log(sendData);
    });
}
const deckNames = function () {
    ankiConnectRequest('deckNames', 6)
        .then(function (fulfilled) {
            var counter = 0;
            $.each(fulfilled.sort(), function (key, value) {
                //cleaning names
                if (value.indexOf("::") !== -1) {
                    var lengthParent = value.substring(0, value.lastIndexOf("::") + 2).length;
                    var spaceLength = lengthParent - 10 > 3 ? lengthParent - 10 : "5";

                    var last = value.substring(value.lastIndexOf("::") + 2, value.length);
                    //    space workaround for html
                    textFieldValue = "\xA0".repeat(spaceLength) + last;
                } else {
                    textFieldValue = value;

                }


                if (value == currentDeck) {
                        counter++;
                    $('#deckList')
                        .append($("<option></option>")
                            .attr("value", value)
                            .attr('selected', 'selected')
                            .text(textFieldValue));


                } else {
                    counter++;
                    $('#deckList')
                        .append($("<option></option>")
                            .attr("value", value)
                            .text(textFieldValue));


                }


            });
            // console.log(fulfilled);

            if (typeof currentDeck == "undefined"||counter==1) //no errors
            {

                var value = $('#deckList').find("option:first-child").val();
                $("#deckList option:eq(0)").attr("selected", "selected");
                currentDeck = value;
                saveChanges("currentDeck", value);
            }
        })
        .catch(function (error) {
            //Handle Error
            connectionStatus = "false";
            saveChanges("connectionStatus", "false");
            errorLogs.innerHTML = "<p>Connection Refused!!</p>This extension needs <a href='https://apps.ankiweb.net'>Anki</a> in background.<p>Please, run Anki.</p> Finally, please install <a href='https://ankiweb.net/shared/info/2055492159'> Anki connect plugin.</a> (if not installed).<br><p>Right click on these links to open</p>";

            console.log(error);

        });
};



var modelNames = function () {
    ankiConnectRequest('modelNames', 6)
        .then(function (fulfilled) {
            var counter =0;
            $.each(fulfilled.sort(), function (key, value) {

                if (value == currentNoteType) {
                    counter++;
                    $('#modelList')
                        .append($("<option></option>")
                            .attr("value", value)
                            .attr('selected', 'selected')
                            .text(value));

                } else {
                    counter++;

                    $('#modelList')
                        .append($("<option></option>")
                            .attr("value", value)
                            .text(value));
                }


            });
            // console.log(fulfilled);
            //Error
            if (typeof currentNoteType == "undefined"||counter==1)
            {
                // if(counter==1)
                // {
                //     selectFirstElement("#modelList");
                // }
                var value = $('#modelList').find("option:first-child").val();

                $("#modelList option:eq(0)").attr("selected", "selected");
                currentNoteType = value;
                saveChanges("currentNoteType", value);
                cardFields(value);
            } else {

                cardFields(currentNoteType);

            }

        })
        .catch(function (error) {
            //Handle Error

            console.log(error.message);

        });
};

function selectFirstElement(whatElement){


    //select first and pass it//
    $(whatElement+' option[selected="selected"]').each(
        function() {
            $(this).removeAttr('selected');
        }
    );


    // mark the first option as selected
    $(whatElement+" option:first").attr('selected','selected');
}


var getTags = function () {
    ankiConnectRequest('getTags', 6)
        .then(function (fulfilled) {
            availableTags = fulfilled;
            // console.log(availableTags);


            function split(val) {
                return val.split(/;\s*/);
            }

            function extractLast(term) {
                return split(term).pop();
            }

            $("#tags")
            // don't navigate away from the field on tab when selecting an item
                .on("keydown", function (event) {
                    if (event.keyCode === $.ui.keyCode.TAB &&
                        $(this).autocomplete("instance").menu.active) {
                        event.preventDefault();
                    }
                })
                .autocomplete({
                    minLength: 0,
                    source: function (request, response) {
                        // delegate back to autocomplete, but extract the last term
                        response($.ui.autocomplete.filter(
                            fulfilled, extractLast(request.term)));
                    },
                    focus: function () {
                        // prevent value inserted on focus
                        return false;
                    },
                    select: function (event, ui) {
                        var terms = split(this.value);
                        // remove the current input
                        terms.pop();
                        // add the selected item
                        terms.push(ui.item.value);
                        // add placeholder to get the comma-and-space at the end
                        terms.push("");
                        this.value = terms.join("; ");
                        return false;
                    }
                });

        })
        .catch(function (error) {
            // log error
            console.log(error.message);
        });
};



var cardFields = function (item) {
    var params = {
        modelName: item
    };
    // console.log(params);
    ankiConnectRequest('modelFieldNames', 6, params)
        .then(function (fulfilled) {
            currentFields = fulfilled;
            saveChanges("currentFields", fulfilled);

            $("#addCard").empty();

            $.each(fulfilled.sort(), function (key, value) {
                if (savedFormFields.hasOwnProperty(value)) {
                    fieldvalue = savedFormFields[value].replace(/<br>/gi, "\n");
                    $('#addCard').append('<label for="' + value + '-Field">' + value + '</label><textarea type="text" class="fieldsToMaintain" id="' + value + '-Field" name="' + value + '">' + fieldvalue + '</textarea><br>');

                } else {

                    $('#addCard').append('<label for="' + value + '-Field">' + value + '</label><textarea type="text" class="fieldsToMaintain" id="' + value + '-Field" name="' + value + '"></textarea><br>');

                }
            });

            var moveFields = {
                '#Question-Field': '#Answer-Field',
                '#Front-Field': '#Back-Field'
            };
            $.each(moveFields, function (key, value) {

                $(key).each(function () {

                    if ($(this).isAfter(value)) {

                        var keyOrignal = key.replace("#", "").split("-");
                        $(key).prev("label").remove();
                        $("textarea" + key).remove();

                        if (savedFormFields.hasOwnProperty(keyOrignal[0])) {
                            fieldvalue = savedFormFields[keyOrignal[0]].replace(/<br>/gi, "\n");

                            $('<label for=' + keyOrignal[0] + '-Field">' + keyOrignal[0] + '</label><textarea type="text" class="fieldsToMaintain" id="' + keyOrignal[0] + '-Field" name="' + keyOrignal[0] + '">' + fieldvalue + '</textarea><br>').insertBefore($(value).prev("label"));

                        } else {
                            $('<label for=' + keyOrignal[0] + '-Field">' + keyOrignal[0] + '</label><textarea type="text" class="fieldsToMaintain" id="' + keyOrignal[0] + '-Field" name="' + keyOrignal[0] + '"></textarea><br>').insertBefore($(value).prev("label"));


                        }
                    }
                });
            });
            saveChanges("connectionStatus", "true");
            runAfterElementExists(".fieldsToMaintain", function () {
                createDynamicFields();
            });

        })
        .catch(function (error) {
            //Handle Error
            console.log(error.message);

        });
};



function getChanges(key) {
    var valueReturn = [];

    chrome.storage.sync.get([key], function (result) {
        // console.log('Value currently is ' + result[key]');
        valueReturn = result[key];
        if (typeof valueReturn != "undefined") {
            setValue(key, valueReturn);
        }

    });
    // chrome.storage.sync.get(null, function (data) { console.info(data) });
}

function setValue(key, valueReturn) {
    window[key] = valueReturn;
    // debugLog( window[key]);
    console.log(key + valueReturn);

}


function debugLog(currentData) {
    if (debugStatus == 1) {
        console.log(currentData);
    } else {


    }
}

function init() {
    //grab deck names
    deckNames();
    // Fields names are retreived inside modelNames()
    modelNames();
    //Tags for AutoComplete
    getTags();


}

function runAfterElementExists(jquery_selector, callback) {
    var checker = window.setInterval(function () {
        //if 1 or more elements found
        if ($(jquery_selector).length) {

            //stop checking
            clearInterval(checker);

            //call the passed in function via the parameter above
            callback();
        }
    }, 300);
}


function createDynamicFields() {
    /**
     * Custom `color picker` extension
     */
    var ColorPickerExtension = MediumEditor.extensions.button.extend({
        name: "colorPicker",
        action: "applyForeColor",
        aria: "color picker",
        contentDefault: "<span class='editor-color-picker'>Text Color<span>",

        init: function () {
            this.button = this.document.createElement('button');
            this.button.classList.add('medium-editor-action');
            this.button.innerHTML = '<b>color</b>';

            initPicker(this.button);
        }
    });

    var pickerExtension = new ColorPickerExtension();


    function setColor(color) {
        pickerExtension.base.importSelection(this.selectionState);
        pickerExtension.document.execCommand("styleWithCSS", false, true);
        pickerExtension.document.execCommand("foreColor", false, color);
    }

    function initPicker(element) {
        $(element).spectrum({
            allowEmpty: true,
            color: "#f00",
            showInput: true,
            showAlpha: true,
            showPalette: true,
            showInitial: true,
            hideAfterPaletteSelect: false,
            preferredFormat: "hex3",
            change: function (color) {
                setColor(color);
            },
            hide: function (color) {
                //applyColor(color);
            },
            palette: [
                ["#000", "#444", "#666", "#999", "#ccc", "#eee", "#f3f3f3", "#fff"],
                ["#f00", "#f90", "#ff0", "#0f0", "#0ff", "#00f", "#90f", "#f0f"],
                ["#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#cfe2f3", "#d9d2e9", "#ead1dc"],
                ["#ea9999", "#f9cb9c", "#ffe599", "#b6d7a8", "#a2c4c9", "#9fc5e8", "#b4a7d6", "#d5a6bd"],
                ["#e06666", "#f6b26b", "#ffd966", "#93c47d", "#76a5af", "#6fa8dc", "#8e7cc3", "#c27ba0"],
                ["#c00", "#e69138", "#f1c232", "#6aa84f", "#45818e", "#3d85c6", "#674ea7", "#a64d79"],
                ["#900", "#b45f06", "#bf9000", "#38761d", "#134f5c", "#0b5394", "#351c75", "#741b47"],
                ["#600", "#783f04", "#7f6000", "#274e13", "#0c343d", "#073763", "#20124d", "#4c1130"]
            ]
        });
    }

    var editor = new MediumEditor('.fieldsToMaintain', {
        paste: {
            /* This example includes the default options for paste,
               if nothing is passed this is what it used */
            forcePlainText: true,
            cleanPastedHTML: true,
            cleanReplacements: [],
            cleanAttrs: ['class', 'style', 'dir'],
            cleanTags: ['meta'],
            unwrapTags: []
        },
        placeholder: false,
        toolbar: {
            buttons: ['colorPicker',
                'bold',
                'italic',
                'underline',
                //You can add other options also. left H1 for reference
                // {
                //     name: 'h1',
                //     action: 'append-h2',
                //     aria: 'header type 1',
                //     tagNames: ['h2'],
                //     contentDefault: '<b>H1</b>',
                //     classList: ['custom-class-h1'],
                //     attrs: {
                //         'data-custom-attr': 'attr-value-h1'
                //     }
                // },
                // {
                //     name: 'h2',
                //     action: 'append-h3',
                //     aria: 'header type 2',
                //     tagNames: ['h3'],
                //     contentDefault: '<b>H2</b>',
                //     classList: ['custom-class-h2'],
                //     attrs: {
                //         'data-custom-attr': 'attr-value-h2'
                //     }
                // },
                'pre',
                'justifyCenter',
            ]
        },
        extensions: {
            'colorPicker': pickerExtension
        }
    });
    var triggerAutoSave = function (event, editable) {

        var textarea = jQuery(editable).next();
        var textareaId = textarea.attr('id');
        var key = textareaId.replace("-Field", "");

        savedFormFields[key] = "" + editable.innerHTML + "";
        console.log("savedFormFields +live save");


        saveChanges("savedFormFields", savedFormFields);

        textarea.text(jQuery(editable).html()).trigger("change");

    };

    var throttledAutoSave = MediumEditor.util.throttle(triggerAutoSave, 1000); // 1 second

    // Listening to event
    editor.subscribe('editableInput', throttledAutoSave);



}

//wait for document to load
$(document).ready(function () {
    //create decks and models
    init();
    //create tabs
    $("#tabs").tabs();

    //Monitors currentDeck value.
    $('#deckList').change(function () {
        var value = $(this).val();
        currentDeck = value;
        saveChanges("currentDeck", value);

    });
    //Monitors currentNoteType value.

    $('#modelList').change(function () {
        var value = $(this).val();
        // console.log(value)
        currentNoteType = value;
        saveChanges("currentNoteType", value);
        cardFields(value);
        //clear saved Setting on background.js
        clearTextBoxes();

    });

    //reset button
    $("#resetButton").click(function () {
        clearTextBoxes();
    });

    $("#clearAllDefaults").click(function () {
        clearNotes();

    });
    $("#nukeExtension").click(function () {
        deleteExtension();

    });

    $("#appendFields").click(function () {
        appendFields();

    });

    $("#reloadChromeMenu").click(function () {
        reloadExtension();

    });


    //    act on form
    $("form").submit(function (event) {
        event.preventDefault();

        submitToAnki();

    });


    $("#syncAnkiToWeb").click(function () {
        syncAnkiToAnkiWeb();

    });

});

function syncAnkiToAnkiWeb(){

        ankiConnectRequest('sync', 6)
            .then(function (fulfilled) {
               debugLog(fulfilled);

            })
            .catch(function (error) {

            });



}
function submitToAnki() {
    //Getting Field types
    currentTags = $('#tags').val();

    if (typeof currentTags != "undefined") {
        currentTags = currentTags.replace(/;/g, ",");
    } else {
        currentTags = "";

    }

    //replace tags
    console.log("currenttags" + currentTags);
    var counter = 0;
    var arrayToSend = {};
    var sendValue;
    saveChanges("addNote", "");
    $.each(currentFields, function (index, value) {

        console.log(index + ": " + value);
        var textfieldValue = $('#' + value + '-Field').val();
        if (textfieldValue) {

            sendValue = textfieldValue;
            counter++;
        } else {

            sendValue = "";
        }

        arrayToSend[value] = sendValue;

    });
    console.log(arrayToSend);

    if (counter === 0) {
        if(connectionStatus=="false")
        {
            notifyUser("Can't connect to Anki. Please check it", "notifyAlert");


        }
        else
        {
       notifyUser("All fields are empty", "notifyAlert");


        }

    } else {
        //
        // if(typeof currentDeck =="undefined"|| typeof currentNoteType=="undefined"||savedFormFields=="undefined")
        // {
        //     alert("one of the field is empty");
        //     throw "One of the field is empty";
        //
        // }



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


                clearTextBoxes();
                console.log(fulfilled);

                notifyUser("Note added succesfully.", "notifyalert");

            })
            .catch(function (error) {

                //notification for error
                var currentError = JSON.stringify(error);

                if (findRegex("Note is duplicate", currentError)) {
                    notifyUser("This is a duplicate Note. Please change main field and try again", "notifyalert");

                } else if (findRegex("Collection was not found", currentError)) {
                    notifyUser("Collection was not found", "notifyalert");

                } else {
                    notifyUser("Unknown error occured. Please try again", "notifyalert");
                }

            });
    }
}

function notifyUser(notifyContent, notificationType) {
    notifyString = JSON.stringify(notifyContent);

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
            title: manifestName + '' + manifestVersion,
            message: notificationTitle
        },
        //for future
        function () {}

    );

}

function findRegex(findWhat, errorz) {


    let attributes = "gi";
    var txtToFind = new RegExp(findWhat, attributes);

    if (!findWhat) {
        return false;
    } else {

        if ((errorz.match(txtToFind))) {
            return true;
        } else {
            return false;


        }
    }




}

function clearTextBoxes() {
    //Notify background js to clear savedFormFields array
    port.postMessage("resetForms");

    $('textarea').each(function () {

        // reset value for all the fields
        $(this).val('');
        //clear global variable array
        savedFormFields = [];
        saveChanges("savedFormFields", savedFormFields);

    });
    //clear Medium editor's divs
    jQuery('#addCard div').html('');

    $('#tags').val('');

}

//if context menu crashes
function reloadExtension() {
    port.postMessage("reloadContextMenu");


}


function appendFields() {

    //change append mode for context menu
    if (appendModeSettings === 0 || typeof appendModeSettings == "undefined") {
        saveChanges("appendModeSettings", 1);
        appendModeSettings = 1;
        currentAppendMode = "switched on for context menu";

    } else {

        saveChanges("appendModeSettings", 0);

        appendModeSettings = 0;
        currentAppendMode = "switched off";

    }
    settingsLog.innerHTML = "<p>Append Mode: " + currentAppendMode + "</p>";
    setTimeout(function () {
        settingsLog.innerHTML = "";
    }, 1000);

}




function deleteExtension() {
    chrome.management.uninstallSelf({}, function (callback) {
        console.log("alfa cleared.Please install again");
    });


}

$.fn.isAfter = function (sel) {
    return this.prevAll(sel).length !== 0;
};
$.fn.isBefore = function (sel) {
    return this.nextAll(sel).length !== 0;
};



function saveChanges(key, value) {
    // Check that there's some code there.
    if (!value) {

        console.log('Error: No value specified for' + key);
        return;
    }


    // Save it using the Chrome extension storage API.
    chrome.storage.sync.set({
        [key]: value
    }, function () {
        //TODO: show to use for saved settings..
        console.log('Settings saved for' + key + " and val below");
        console.log(value);
    });
}




function clearNotes() {
    // CHANGE: array, not a string
    var toRemove = [];

    chrome.storage.sync.get(function (Items) {
        $.each(Items, function (index, value) {
            // CHANGE: add key to array
            toRemove.push(index);
        });

        console.log(toRemove);

        // CHANGE: now inside callback
        chrome.storage.sync.remove(toRemove, function (Items) {
            settingsLog.innerHTML = "<p>Settings Deleted!!</p>Please, open extension again";
            setTimeout(function () {
                settingsLog.innerHTML = "";
            }, 750);
            chrome.storage.sync.get(function (Items) {
                $.each(Items, function (index, value) {
                    console.log("removed" + value);
                });
            });
        });
    });

}