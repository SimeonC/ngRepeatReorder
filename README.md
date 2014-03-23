ngRepeatReorder
===============

## How It Works

In short this works by starting with the ngRepeat code in angular.js. Which in itself is complex as you have to also copy over a bunch of functions that it uses that are hidden elsewhere in the codebase. Then you add all the lovely complexity of moving elements around – I decided to simplify this by limiting the movement within the list bounds and only do vertical re-ordering. I animate this by fiddling with the margins – creating a gap where the ‘dragged’ element is going to drop into and then using +/- margins to position the dragging element correctly. Also we add in classes for display purposes.

The last hurdle I had to overcome is to modify the ngRepeat element before our modified ngRepeat compiles the element, I did this with a second directive that executes before the ngRepeat and adds the event tags onto the element.

## Example

[CodePen](http://codepen.io/SimeonC/pen/AJIyC)


## [Licence](https://github.com/SimeonC/ngRepeatReorder/blob/master/LICENSE)

Copyright (c) 2014 SimeonC, MIT
