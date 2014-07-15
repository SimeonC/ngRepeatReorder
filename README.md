ngRepeatReorder
===============

## Requirements

ngRepeatReorder requires [angular-hammer](http://monospaced.github.io/angular-hammer/) and [hammer.js](http://eightmedia.github.io/hammer.js/)

## Install Instructions.

Either use `bower install ngRepeatReorder` or download from the github repository at http://github.com/SimeonC/ngRepeatReorder.

Include `ngRepeatReorder.js`, `hammer.js` and `angular-hammer.js` as a script in your html file.

Include `ngRepeatReorder` in your module, e.g. `angular.module("myAppName", ['ngRepeatReorder'])`

In your HTML you need to define two attributes, the first is `ng-repeat-reorder` this functions EXACTLY like AngularJS' native `ng-repeat` directive.
The second attribute is `ng-repeat-reorder-handle`, this is a selector handle that is restricted by what you have loaded, ie if no jQuery then select by tag name only (internally uses `.find` for the curious).
This attribute should select the element that you want to use as a "drag handle", if you leave this blank it uses the node you define it on.

You will need to mess around with CSS to get it to work correctly, see the demo for examples.