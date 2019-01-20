# TinyWebEx RandomTips

Makes it possibly to easily specify tips to show to the user in a random, non-obstrusive way and allows you to set constraints for each tip.
It is basically an extension of the [MessageHandler module](https://github.com/TinyWebEx/MessageHandler) and automatically shows such a tip from a list of tips you specify.

## Features

* has an extensive and flexible list of contraints you can use to define in which cases a tip should (not) be shown (See ["Specifying tips"](#specifying-tips) below)
* easy setup
* low amount of work, after you 
* integrates into other TinyWebEx modules for [showing messages](#html-setup) and [saving config values](#addon-settings)

## HTML Setup

As the [MessageHandler module](https://github.com/TinyWebEx/MessageHandler) requires the message HTML to be pre-defined, you have to define it for this module, too. In your `.message-container` you need to add this:

```html
<div id="messageTips" aria-label="info message" class="message-box info invisible fade-hide">
  <span class="message-text"></span>
  <a href="#">
    <button class="message-action-button micro-button info invisible"></button>
  </a>
  <img class="icon-dismiss invisible" src="/common/img/close.svg" width="24" height="24" tabindex="0" data-i18n data-i18n-aria-label="__MSG_dismissIconDescription__"></span>
</div>
```

It's just the default message markup, it uses the "info" style here and an ID `messageTips`, so it can find the message and register it.

## Using

A full example of how to use it, is the following:

```js
// fetch tips from somewhere..

// init RandomTips
RandomTips.init(tips).then(() => {
    RandomTips.setContext("options");
    RandomTips.showRandomTipIfWanted();
});
```

This does the following steps:
1. Initializes the module with the list of all tips (the [tip data](#specifying-tips)).
2. When they are loaded, sets a specific [context](#context), which allows you to show some tips only in some "contexts".
3. Shows a tip with a chance of 20%, so on average only in 1 of 5 triggers of this function, a tip is shown.

Instead of the last step, you can also use `showRandomTip` to force it to evaluate showing a tip. Note it still depends on your [tip spec](#specifying-tips) whether any (and if so which) tip is actually shown. 

## Specifying tips

Tips are specified as a list (array) of objects. Each object represents on tip and lists the constraints under which the tip may be shown or may not be shown. These are evaluated of this module, but only _after_ the global constraint(s), i.e. `showRandomTipIfWanted` (see [above](#using)), passed.

There are many constraints you can configure/set, so it would not be useful to list them here, but [you can look them up in the JSDOC](https://tinywebex.github.io/RandomTips/global.html#TipObject). Also, you can see the same [in the example source code](examples/Tips.js) of a tips specification. You can copy this to your `../data` dir (relative to this repo), but as the object is loaded via the `init` method, is it not required to be at any specific place.

### Context

The `.setContext` method is somewhat special, as it is optional, but recommend to call before you actually (try to) show a tip. It basically just sets a string value to let you specify the context you have when you are calling `RandomTips`, so you can differentiate whether you are e.g. calling it from your add-on's popup, options page or some other place.
You can thus easily limit where (i.e. in which "contexts") your tip may be shown or hidden.

## Addon settings

This module needs to save some data in order to count the times the addon has been "opened" (i.e. the function has been triggered) or it needs to be saved how often a specific tip has been shown (in some context etc.).

For getting and saving the data, it uses the [AddonSettings module](https://github.com/TinyWebEx/AddonSettings).
It does use the setting name `randomTips` and includes all data in potentially multiple nested objects there.
Note that it itself does add another level of caching, i.e. it saves that object in it's module when it's `init` method is called.

In order to properly use this module, you have to set the following [default options](https://github.com/TinyWebEx/AddonSettings#setup-default-value-store), i.e. add this to your `DEFAULT_SETTINGS`:
```js
randomTips: {
    tips: {}
}
```

### Tests

It is recommend that the tip objects is static and frozen. To be able to easily test this, [a test spec for this is included in this repo](./tests/dataTest/tips.test.js). Note if you want to include it as it is, it only works if the tip data is saved in `../data/Tips.js` (relative to this repo).
