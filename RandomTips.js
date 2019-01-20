/**
 * Shows random tips to the user, if wanted.
 *
 * @module RandomTips
 * @requires ../lib/lodash/debounce
 * @requires ../AddonSettings
 * @requires ../MessageHandler/CustomMessages
 */

// lodash
import debounce from "../lodash/debounce.js";

import * as AddonSettings from "../AddonSettings/AddonSettings.js";
import * as CustomMessages from "../MessageHandler/CustomMessages.js";

const TIP_MESSAGE_BOX_ID = "messageTips";
const TIP_SETTING_STORAGE_ID = "randomTips";
const GLOBAL_RANDOMIZE = 0.2; // (%)
const DEBOUNCE_SAVING = 1000; // ms
const MESSAGE_TIP_ID = "messageTip";

// default values/settings for tip/tipconfig
const DEFAULT_TIP_SPEC = Object.freeze({
    requiredTriggers: 10,
    randomizeDisplay: false,
    allowDismiss: true
});
const DEFAULT_TIP_CONFIG = Object.freeze({
    shownCount: 0,
    dismissedCount: 0,
    shownContext: {}
});

/** @see {@link config/tips.js} **/
let tips;

let tipConfig = {
    tips: {}
};

let tipShown = null;
let context = null;

/**
 * Save the current config.
 *
 * @function
 * @name saveConfig
 * @private
 * @returns {void}
 */
let saveConfig = null; // will be assigned in init()

/**
 * Hook for the dismiss event.
 *
 * @function
 * @private
 * @param  {Object} param
 * @returns {void}
 */
function messageDismissed(param) {
    const elMessage = param.elMessage;

    const id = elMessage.dataset.tipId;
    if (tipShown.id !== id) {
        throw new Error("cached tip and dismissed tip differ");
    }

    // update config
    tipConfig.tips[id].dismissedCount = (tipConfig.tips[id].dismissedCount || 0) + 1;
    saveConfig();

    // cleanup values
    tipShown = null;
    delete elMessage.dataset.tipId;

    console.info(`Tip ${id} has been dismissed.`);
}

/**
 * Returns true or false at random. The passed procentage indicates how
 * much of the calls should return "true" on average.
 *
 * @function
 * @private
 * @param  {number} percentage
 * @returns {bool}
 */
function randomizePassed(percentage) {
    return (Math.random() < percentage);
}

/**
 * Shows this tip.
 *
 * @function
 * @private
 * @param  {TipObject} tipSpec
 * @returns {void}
 */
function showTip(tipSpec) {
    const elMessage = CustomMessages.getHtmlElement(MESSAGE_TIP_ID);
    elMessage.dataset.tipId = tipSpec.id;
    CustomMessages.showMessage(MESSAGE_TIP_ID, tipSpec.text, tipSpec.allowDismiss, tipSpec.actionButton);

    // update config
    tipConfig.tips[tipSpec.id].shownCount = (tipConfig.tips[tipSpec.id].shownCount || 0) + 1;
    tipConfig.tips[tipSpec.id].shownContext[context] = (tipConfig.tips[tipSpec.id].shownContext[context] || 0) + 1;
    saveConfig();

    tipShown = tipSpec;
}

/**
 * Returns true or false at random. The passed procentage indicates how
 * much of the calls should return "true" on average.
 *
 * @function
 * @private
 * @param  {TipObject} tipSpecOrig
 * @returns {[TipObject, Object]}
 */
function applyTipSpecAndConfigDefaults(tipSpecOrig) {
    // shallow-clone object (no deep object are being modified)
    const tipSpec = Object.assign({}, DEFAULT_TIP_SPEC, tipSpecOrig);

    // also convert to default value if just set to "true"
    if (tipSpec.randomizeDisplay === true) {
        // default value for randomizeDisplay = 0.5
        tipSpec.randomizeDisplay = 0.5;
    }

    // create option if needed
    let thisTipConfig = tipConfig.tips[tipSpec.id];
    if (thisTipConfig === undefined) {
        // deep-clone default object
        thisTipConfig = JSON.parse(JSON.stringify(DEFAULT_TIP_CONFIG));
        // save it actually in config
        tipConfig.tips[tipSpec.id] = thisTipConfig;
        saveConfig();
    }

    console.log("Applied default values for tip spec and tip config:", tipSpec, thisTipConfig);
    return [tipSpec, thisTipConfig];
}

/**
 * Returns whether the tip has already be shown enough times or may not
 * be shown, because of some other requirement.
 *
 * @function
 * @private
 * @param  {TipObject} tipSpec
 * @param  {Object} thisTipConfig
 * @param  {Object} tipSpecOrig
 * @returns {bool}
 */
function shouldBeShown(tipSpec, thisTipConfig, tipSpecOrig) {
    // require some global triggers, if needed
    if (tipConfig.triggeredOpen < tipSpec.requiredTriggers) {
        return false;
    }
    // 1 : x -> if one number is not selected, do not display result
    if (tipSpec.randomizeDisplay && !randomizePassed(tipSpec.randomizeDisplay)) {
        return false;
    }

    // do not show if it has been dismissed enough times
    if (tipSpec.maximumDismiss && thisTipConfig.dismissedCount >= tipSpec.maximumDismiss) {
        return false;
    }

    // block when it is shown too much times in a given context
    if (tipSpec.maximumInContest) {
        if (context in tipSpec.maximumInContest) {
            const tipShownInCurrentContext = tipConfig.tips[tipSpec.id].shownContext[context] || 0;

            if (tipShownInCurrentContext >= tipSpec.maximumInContest[context]) {
                return false;
            }
        }
    }

    // NOTE: do not return true above this line (for obvious reasons)
    // or has it been shown enough times already?

    // dismiss is shown enough times?
    let requiredDismissCount;
    if (Number.isFinite(tipSpec.requireDismiss)) {
        requiredDismissCount = tipSpec.requireDismiss;
    } else if (tipSpec.requireDismiss === true) { // bool
        requiredDismissCount = tipSpec.requiredShowCount;
    } else {
        // ignore dismiss count
        requiredDismissCount = null;
    }

    // check context check if needed
    if (tipSpec.showInContext) {
        if (context in tipSpec.showInContext) {
            const tipShownInCurrentContext = tipConfig.tips[tipSpec.id].shownContext[context] || 0;

            if (tipShownInCurrentContext < tipSpec.showInContext[context]) {
                return true;
            }
        }
    }

    return (tipSpec.requiredShowCount === null || thisTipConfig.shownCount < tipSpec.requiredShowCount) // not already shown enough times already?
        || (requiredDismissCount !== null && thisTipConfig.dismissedCount < requiredDismissCount); // not dismissed enough times?
}

/**
 * Sets the context for the current session.
 *
 * @function
 * @param {string} newContext
 * @returns {void}
 */
export function setContext(newContext) {
    context = newContext;
}

/**
 * Selects and shows a random tip.
 *
 * @function
 * @returns {void}
 */
export function showRandomTip() {
    // only try to select tip, if one is even available
    if (tips.length === 0) {
        console.info("no tips to show available anymore");
        return;
    }

    // randomly select element
    const randomNumber = Math.floor(Math.random() * tips.length);
    const tipSpecOrig = tips[randomNumber];

    // prepare tip spec
    const [tipSpec, thisTipConfig] = applyTipSpecAndConfigDefaults(tipSpecOrig);

    if (!shouldBeShown(tipSpec, thisTipConfig, tipSpecOrig)) {
        // remove tip
        tips.splice(randomNumber, 1);

        // retry random selection
        showRandomTip();
        return;
    }

    console.info("selected tip to be shown:", randomNumber, tipSpec);

    showTip(tipSpec);
}

/**
 * Shows the random tip only randomly so the user is not annoyed.
 *
 * @function
 * @returns {void}
 */
export function showRandomTipIfWanted() {
    tipConfig.triggeredOpen = (tipConfig.triggeredOpen || 0) + 1;
    saveConfig();

    // randomize tip showing in general
    if (!randomizePassed(GLOBAL_RANDOMIZE)) {
        console.info("show no random tip, because randomize did not pass");
        return;
    }

    showRandomTip();
}

/**
 * Initialises the module.
 *
 * @function
 * @param {TipObject[]} tipsToShow the tips object to init
 * @returns {Promise.<void>}
 */
export function init(tipsToShow) {
    // use local shallow copy, so we can modify it
    // inner objects won't be modified, so we do not need to deep-clone it.
    tips = tipsToShow.slice();

    // load function
    // We need to assign it here to make it testable.
    saveConfig = debounce(() => {
        AddonSettings.set(TIP_SETTING_STORAGE_ID, tipConfig);
    }, DEBOUNCE_SAVING);

    // register HTMLElement
    CustomMessages.registerMessageType(MESSAGE_TIP_ID, document.getElementById(TIP_MESSAGE_BOX_ID));
    CustomMessages.setHook(MESSAGE_TIP_ID, "dismissStart", messageDismissed);

    return AddonSettings.get(TIP_SETTING_STORAGE_ID).then((randomTips) => {
        tipConfig = randomTips;
    });
}
