ngRepeatReorder
===============

Drag and Drop reordering for AngularJS Repeat.

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

## How It Works

In short this works by starting with the ngRepeat code in angular.js. Which in itself is complex as you have to also copy over a bunch of functions that it uses that are hidden elsewhere in the codebase. Then you add all the lovely complexity of moving elements around – I decided to simplify this by limiting the movement within the list bounds and only do vertical re-ordering. I animate this by fiddling with the margins – creating a gap where the ‘dragged’ element is going to drop into and then using +/- margins to position the dragging element correctly. Also we add in classes for display purposes.

The last hurdle I had to overcome is to modify the ngRepeat element before our modified ngRepeat compiles the element, I did this with a second directive that executes before the ngRepeat and adds the event tags onto the element.

## Example

[CodePen](http://codepen.io/SimeonC/pen/AJIyC)


## [Licence](https://github.com/SimeonC/ngRepeatReorder/blob/master/LICENSE)

Copyright (c) 2014 SimeonC, MIT