

[<img src="https://github.com/1nsp1r3rnzt/chrome-anki-quick-adder/blob/master/docs/images/icon.png?raw=true&s=200">](https://chrome.google.com/webstore/detail/anki-quick-adder/gpbcbbajoagdgnokieocaplbhkiidmmb)

# chrome Anki Quick Adder

> This chrome extension provides the ability to create Anki cards directly from Google Chrome on your Anki Desktop.

![main features](https://raw.githubusercontent.com/1nsp1r3rnzt/chrome-anki-quick-adder/master/docs/images/Add%20Cards%20Easily.png)
 
 ### features
 - [x] Ability to create Anki cards directly from Google Chrome on your Anki
   Desktop.
 - [x] Drop-down with all your tag for auto-complete feature.
 - [x] create card from chrome Menu Extension icon.
 - [x] In-line WYSIWYG editor.
## Demo

![demo](https://github.com/1nsp1r3rnzt/chrome-anki-quick-adder/blob/master/demo.gif?raw=true)


## Installation

- Please *start Anki* before running chrome or before installing chrome extension.
1. Install [ankiConnect](https://ankiweb.net/shared/info/2055492159)
- Please [see note for window](https://github.com/FooSoft/anki-connect#notes-for-windows-users) users to allow ankiConnect.
- Mac users need to **[follow these instructions](https://github.com/FooSoft/anki-connect#notes-for-mac-os-x-users)** to allow communication.
2. Restart Anki 
3. install [extension from webstore](https://chrome.google.com/webstore/detail/anki-quick-adder/gpbcbbajoagdgnokieocaplbhkiidmmb)
4. See known [bugs and issues](#known-bugs-and-solutions) in this readme to solve any bugs.

### Clone
- Clone this repo to your local machine using `https://github.com/1nsp1r3rnzt/chrome-anki-quick-adder/`

### Getting Started

1. You can add cards through pop-up or chrome menu.
2. Please, select a deck and note type before adding cards for the first time.

#### From Chrome Menu
![ssss](https://raw.githubusercontent.com/1nsp1r3rnzt/chrome-anki-quick-adder/master/docs/images/anki-2.png)  

1. Select the word, you want to enter.
2. Right click, then, Click the field to send the word to that field.
3. Finally, click submit.
4. Select, word for the other field and add it.
5. Right click and Click submit.
6. A popup will open to submit your data for 2 seconds and will close.

###  Add From Popup.
![enter image description here](https://raw.githubusercontent.com/1nsp1r3rnzt/chrome-anki-quick-adder/master/docs/images/ankiStep1.png)

1.  Run Anki. The decklist is populated then only.
2. Click App [icon][icon] to open app.
3. Select Deck type.
4. Select Card type.
5.  Enter the data in fields.
6.  ( Optional) Enter **tags separated by ;** for multiple tags.
7. Click Add Note.
8. You see a notification if card is entered successfully or not.

___
## Known Bugs and Solutions 
| Bug           | Solution      | Reason  |
| ------------- |:-------------:| -----:|
| chrome Menu disappears      | ![enter image description here](https://raw.githubusercontent.com/1nsp1r3rnzt/chrome-anki-quick-adder/master/docs/images/no-menu.png) 1. Start Anki <br> 2. Goto extension settings. <br> 3. Settings> Click Rebuild Menu  | 1. Anki is not running.<br>2. Chrome was opened before running Anki |
|  Duplicate Note. Note not Added.     | Change main field as Anki doesn't allow duplicate notes.   |   Note is already present in Anki |
|  No notification on Mac on successful card addition.   |   no solution yet |need mac  to test so not fixable yet.|
---

## Contributing

>

### Step 1

- **Option 1**
    - 🍴 Fork this repo!

- **Option 2**
    - 👯 Clone this repo to your local machine using `https://github.com/1nsp1r3rnzt/chrome-anki-quick-adder.git`

### Step 2

- **HACK AWAY!** 🔨🔨🔨

### Step 3

- 🔃 Create a new pull request using <a href="https://github.com/1nsp1r3rnzt/chrome-anki-quick-adder/compare/" target="_blank">`new pull request`</a>.

---
## ChangeLog
                                        Version 1.0.4 - Tuesday, June 19th, 2018
                                        - Ability to export and import your saved notes in extension.
                                        - fixed typeError bug on saving notes.
                                        - Quick icon to turn off global sticky fields.
                                        --------------------------------
                                        Version 1.0.3 - Tuesday, June 19th, 2018
                                        - Moved to local storage to save currentFields instead of sync
                                        --------------------------------
                                        Version 1.0.2 - Tuesday, June 19th, 2018
                                        Fixed Type Error
                                        --------------------------------
                                        Version 1.0.1 - Tuesday, June 19th, 2018
                                        Fixed bug for users who updated extension.
                                        --------------------------------
                                        Version 1.0.0 - Monday, June 18th, 2018
                                          - Ability to save notes in Local Storage and sync later. (settings-> saveNotes)
                                          - Added ability to customize in-line editor buttons (settings-> In-Line editor Buttons)
                                        - Added sticky Fields. Click [S] icon and field data will persist after adding a note until you clear.
                                        - Mode to change field background theme to dark mode temporarily.
                                        - Fixed field deletion on noteType   change.
                                        ---------------------------------------
                                          Version 0.0.9 - Sunday, June 10th, 2018
                                          - Fixed bugs
                                        ---------------------------------------
                                          Version 0.0.8 - Sunday, June 10th, 2018
                                          - Toggle between favourite decks or models (select more than one deck or model)
                                          - Fixed cloze caret position
                                          - Customizable shortcuts
                                        ---------------------------------------Version 0.0.7 - Wednesday, June 7th, 2018
                                          - card submission directly on shortcut instead of submission through pop-up.
                                        ---------------------------------------Version 0.0.6 - Wednesday, June 7th, 2018
                                        -fixed settings bug for users who updated instead of installing it.
                                           Version 0.0.5 - Wednesday, June 6th, 2018
                                        ---------------------------------------
                                        - shortcuts for: deck, model and Cloze
                                        - shortcuts for: adding selection to fields
                                        - Cache for: decks, models and tags
                                        - settings for: cleaning text
                                        - Settings for: submit timeout from chrome menu

                                          Version 0.0.4 - Sunday, June 3rd, 2018
                                        ---------------------------------------
                                        - Fixed adding cards from context menu

                                            --------------------------------------------------
                                        Version 0.0.3 - Sunday, June 3rd, 2018
                                        -----------------------------------------------------------------------------------------
                                        - Fixed appendMode
                                        - Added setting to turn on debugging.
                                                 
                                        Version 0.0.2 - Saturday, June 2nd, 2018
                                        -----------------------------------------------------------------------------------------
                                        - Fixed note adding error on windows and mac
                                        
                                        -----------------------------------------------------------------------------------------
                                        Version 0.0.1 - Friday, June 1, 2018
                                        -----------------------------------------------------------------------------------------
                                        - Released beta version
                                        -fixed deck selection for single decklist
                                        -fixed deck selection for modelList
                                        - parsed tags for auto-complete

## License

- **[MIT license](/LICENSE)**
- Copyright 2018 © <a href="http://codehealthy.com" target="_blank">Ranjit Singh</a>.