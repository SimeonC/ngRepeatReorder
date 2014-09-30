(function() {
  "use strict";
  var module, uid,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  module = angular.module('ngRepeatReorder', ['hmTouchEvents']);

  module.directive('ngRepeatReorderHandle', [
    '$parse', function($parse) {
      return {
        restrict: "A",
        priority: 999,
        terminal: false,
        link: function(scope, element, attrs) {
          var baseElement, bindHammer;
          bindHammer = function(baseElement, eventName, actionString) {
            var fn, hammer, opts;
            opts = $parse(attrs['hmOptions'])(scope, {});
            fn = function(event) {
              return scope.$apply(function() {
                return $parse(actionString)(scope, {
                  $event: event
                });
              });
            };
            if (!(hammer = baseElement.data('hammer'))) {
              hammer = window.Hammer(baseElement[0], opts);
              baseElement.data('hammer', hammer);
            }
            hammer.on(eventName, fn);
            return scope.$on('$destroy', function() {
              return hammer.off(eventName, fn);
            });
          };
          if (attrs.ngRepeatReorderHandle === '') {
            baseElement = element;
          } else {
            baseElement = element.find(attrs.ngRepeatReorderHandle);
          }
          if (baseElement != null) {
            bindHammer(baseElement, "drag", "reorderFuncs.moveevent($event, this, $index)");
            bindHammer(baseElement, "dragstart", "reorderFuncs.startevent($event, this, $index)");
            return bindHammer(baseElement, "dragend", "reorderFuncs.stopevent($event, this, $index)");
          }
        }
      };
    }
  ]);

  uid = ['0', '0', '0'];

  module.directive('ngRepeatReorder', [
    "$parse", "$animate", function($parse, $animate) {
      var NG_REMOVED, getBlockElements, getBlockEnd, getBlockStart, hashKey, nextUid, ngRepeatMinErr;
      getBlockStart = function(block) {
        return block.clone[0];
      };
      getBlockEnd = function(block) {
        return block.clone[block.clone.length - 1];
      };
      nextUid = function() {
        var digit, index;
        index = uid.length;
        digit = void 0;
        while (index) {
          index--;
          digit = uid[index].charCodeAt(0);
          if (digit === 57) {
            uid[index] = 'A';
            return uid.join('');
          }
          if (digit === 90) {
            uid[index] = '0';
          } else {
            uid[index] = String.fromCharCode(digit + 1);
            return uid.join('');
          }
        }
        uid.unshift('0');
        return uid.join('');
      };
      hashKey = function(obj) {
        var key, objType;
        objType = typeof obj;
        if (objType === 'object' && obj !== null) {
          if (typeof (key = obj.$$hashKey) === 'function') {
            key = obj.$$hashKey();
          } else if (key === void 0) {
            key = obj.$$hashKey = nextUid();
          }
        } else {
          key = obj;
        }
        return objType + ':' + key;
      };
      getBlockElements = function(nodes) {
        var element, elements, endNode, startNode;
        startNode = nodes[0];
        endNode = nodes[nodes.length - 1];
        if (startNode === endNode) {
          return jqLite(startNode);
        }
        element = startNode;
        elements = [element];
        while (true) {
          element = element.nextSibling;
          if (!element) {
            break;
          }
          elements.push(element);
          if (element === endNode) {
            break;
          }
        }
        return angular.element(elements);
      };
      NG_REMOVED = "$$NG_REMOVED";
      ngRepeatMinErr = angular.$$minErr("ngRepeat");
      return {
        transclude: "element",
        priority: 1000,
        terminal: true,
        $$tlb: true,
        link: function($scope, $element, $attr, ctrl, $transclude) {
          var dragAfterElement, dragBeforeElement, expression, hashFnLocals, keyIdentifier, lastBlockMap, lhs, match, ngRepeatAction, rhs, trackByExp, trackByExpGetter, trackByIdArrayFn, trackByIdExpFn, trackByIdObjFn, valueIdentifier;
          expression = $attr.ngRepeatReorder;
          match = expression.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+track\s+by\s+([\s\S]+?))?\s*$/);
          trackByExp = void 0;
          trackByExpGetter = void 0;
          trackByIdExpFn = void 0;
          trackByIdArrayFn = void 0;
          trackByIdObjFn = void 0;
          lhs = void 0;
          rhs = void 0;
          valueIdentifier = void 0;
          keyIdentifier = void 0;
          dragBeforeElement = void 0;
          dragAfterElement = void 0;
          hashFnLocals = {
            $id: hashKey
          };
          if (!match) {
            throw ngRepeatMinErr("iexp", "Expected expression in form of '_item_ in _collection_[ track by _id_]' but got '{0}'.", expression);
          }
          lhs = match[1];
          rhs = match[2];
          trackByExp = match[3];
          if (trackByExp) {
            trackByExpGetter = $parse(trackByExp);
            trackByIdExpFn = function(key, value, index) {
              if (keyIdentifier) {
                hashFnLocals[keyIdentifier] = key;
              }
              hashFnLocals[valueIdentifier] = value;
              hashFnLocals.$index = index;
              return trackByExpGetter($scope, hashFnLocals);
            };
          } else {
            trackByIdArrayFn = function(key, value) {
              return hashKey(value);
            };
            trackByIdObjFn = function(key) {
              return key;
            };
          }
          match = lhs.match(/^(?:([\$\w]+)|\(([\$\w]+)\s*,\s*([\$\w]+)\))$/);
          if (!match) {
            throw ngRepeatMinErr("iidexp", "'_item_' in '_item_ in _collection_' should be an identifier or '(_key_, _value_)' expression, but got '{0}'.", lhs);
          }
          valueIdentifier = match[3] || match[1];
          keyIdentifier = match[2];
          lastBlockMap = {};
          $element.wrap('<div class="ng-repeat-reorder-parent"></div>');
          $scope.$watchCollection(rhs, ngRepeatAction = function(collection) {
            var arrayLength, block, childScope, collectionKeys, elementsToRemove, index, isArrayLike, key, length, nextBlockMap, nextBlockOrder, nextNode, previousNode, reorderFuncs, trackById, trackByIdFn, value;
            index = void 0;
            length = void 0;
            previousNode = $element[0];
            nextNode = void 0;
            nextBlockMap = {};
            arrayLength = void 0;
            childScope = void 0;
            key = void 0;
            value = void 0;
            trackById = void 0;
            trackByIdFn = void 0;
            collectionKeys = void 0;
            block = void 0;
            nextBlockOrder = [];
            elementsToRemove = void 0;
            reorderFuncs = {
              offset: 0,
              deltaOffset: 0,
              dragBeforeElement: '',
              dragAfterElement: '',
              setPosition: function($element, deltaTop, deltaLeft) {
                if (deltaTop == null) {
                  deltaTop = "";
                }
                if (deltaLeft == null) {
                  deltaLeft = "";
                }
                $element = angular.element($element[0]);
                $element.css('top', "" + deltaTop + "px");
                return $element.css('left', "" + deltaLeft + "px");
              },
              resetPosition: function($element) {
                $element = angular.element($element[0]);
                $element.css('top', "");
                return $element.css('left', "");
              },
              setMargins: function($element, top, bottom) {
                if (top == null) {
                  top = "";
                }
                if (bottom == null) {
                  bottom = "";
                }
                $element = angular.element($element[0]);
                $element.css("margin-top", top);
                $element.css("margin-bottom", bottom);
                return $element.css("border-top", "");
              },
              resetMargins: function() {
                var c, _i, _len, _results;
                _results = [];
                for (_i = 0, _len = nextBlockOrder.length; _i < _len; _i++) {
                  c = nextBlockOrder[_i];
                  _results.push(this.setMargins(c.clone));
                }
                return _results;
              },
              updateOffset: function($event, $element, $index) {
                var afterIndex, beforeIndex, delta, directedHeight, gDirection, halfHeight, margin, testDelta, workingDelta, workingElement;
                if (!$event || !$event.gesture || nextBlockOrder.length <= 1) {
                  return;
                }
                this.offset = 0;
                this.resetMargins();
                collection = $scope.$eval(rhs);
                workingDelta = $event.gesture.deltaY;
                gDirection = $event.gesture.deltaY < 0 ? "up" : "down";
                directedHeight = $element[0].offsetHeight * (gDirection === "up" ? -1.0 : 1.0);
                workingElement = $element[0];
                halfHeight = 0;
                testDelta = function() {
                  return workingDelta + (directedHeight / 2.0);
                };
                while ((gDirection === "down" && testDelta() > 0 && $index + this.offset < nextBlockOrder.length) || (gDirection === "up" && testDelta() < 0 && $index + this.offset >= 0)) {
                  workingElement = nextBlockOrder[$index + this.offset].clone;
                  workingDelta += workingElement[0].offsetHeight * (gDirection === "down" ? -1.0 : 1.0);
                  if (gDirection === "down") {
                    this.offset++;
                  } else {
                    this.offset--;
                  }
                }
                workingDelta -= workingElement[0].offsetHeight * (gDirection === "down" ? -1.0 : 1.0);
                margin = "" + $element[0].offsetHeight + "px";
                if (Math.abs(this.offset) === 1) {
                  beforeIndex = $index - 1;
                  afterIndex = $index + 1;
                  if ($index < nextBlockOrder.length - 1) {
                    this.setMargins(nextBlockOrder[$index + 1].clone, margin);
                  } else {
                    this.setMargins(nextBlockOrder[$index - 1].clone, '', margin);
                  }
                } else {
                  if (this.offset < 0) {
                    beforeIndex = $index + this.offset;
                    afterIndex = $index + this.offset + 1;
                    if ($index + this.offset <= 0) {
                      this.setMargins(workingElement, margin);
                    } else {
                      this.setMargins(workingElement, margin);
                    }
                  } else {
                    beforeIndex = $index + this.offset - 1;
                    afterIndex = $index + this.offset;
                    if ($index + this.offset >= nextBlockOrder.length - 1) {
                      this.setMargins(workingElement, "", margin);
                    } else {
                      this.setMargins(workingElement, "", margin);
                    }
                  }
                }
                if ($event.gesture.deltaY + this.deltaOffset <= 0 || $event.gesture.deltaY + this.deltaOffset + $element[0].offsetHeight >= $element.parent()[0].offsetHeight) {
                  delta = $event.gesture.deltaY - workingDelta;
                } else {
                  delta = $event.gesture.deltaY;
                }
                this.setPosition($element, delta + this.deltaOffset, 0);
                if (dragBeforeElement != null) {
                  dragBeforeElement.removeClass("dragging-before");
                }
                if (dragAfterElement != null) {
                  dragAfterElement.removeClass("dragging-after");
                }
                if (beforeIndex >= 0) {
                  (dragBeforeElement = nextBlockOrder[beforeIndex].clone).addClass("dragging-before");
                }
                if (afterIndex < collection.length) {
                  return (dragAfterElement = nextBlockOrder[afterIndex].clone).addClass("dragging-after");
                }
              },
              moveevent: function($event, $scope, $index) {
                if (nextBlockOrder.length <= 1) {
                  return;
                }
                $element = $scope.$elementRef;
                $element.addClass('dragging');
                this.updateOffset($event, $element, $index);
                $event.preventDefault();
                $event.stopPropagation();
                $event.gesture.stopPropagation();
                return false;
              },
              startevent: function($event, $scope, $index) {
                if (nextBlockOrder.length <= 1) {
                  return;
                }
                $element = $scope.$elementRef;
                $scope.$emit('ngrr-dragstart', $event, $element, $index);
                $element.parent().addClass("active-drag-below");
                this.deltaOffset = $element[0].offsetTop;
                $element.addClass('dragging');
                this.offset = 0;
                this.setMargins($element, '', "-" + $element[0].offsetHeight + "px");
                this.updateOffset($event, $element, $index);
                return $event.preventDefault();
              },
              stopevent: function($event, $scope, $index) {
                var obj;
                if (nextBlockOrder.length <= 1) {
                  return;
                }
                $element = $scope.$elementRef;
                $scope.$emit('ngrr-dragend', $event, $element, $index);
                $element.parent().removeClass("active-drag-below");
                this.resetMargins();
                this.resetPosition($element);
                if (dragBeforeElement != null) {
                  dragBeforeElement.removeClass("dragging-before");
                }
                if (dragAfterElement != null) {
                  dragAfterElement.removeClass("dragging-after");
                }
                if (this.offset !== 0) {
                  collection = $scope.$eval(rhs);
                  obj = collection.splice($index, 1);
                  if (this.offset < 0) {
                    collection.splice($index + this.offset + 1, 0, obj[0]);
                  } else if (this.offset > 0) {
                    collection.splice($index + this.offset - 1, 0, obj[0]);
                  }
                  $scope.$emit('ngrr-reordered');
                }
                $element.removeClass('dragging');
                return $event.preventDefault();
              }
            };
            isArrayLike = function(obj) {
              var toString, _ref;
              if ((obj == null) || (obj && obj.document && obj.location && obj.alert && obj.setInterval)) {
                return false;
              }
              length = obj.length;
              if (obj.nodeType === 1 && length) {
                return true;
              }
              toString = {}.toString;
              return typeof obj === 'string' || toString.call(obj) === '[object Array]' || length === 0 || typeof length === 'number' && length > 0 && (_ref = length - 1, __indexOf.call(obj, _ref) >= 0);
            };
            if (isArrayLike(collection)) {
              collectionKeys = collection;
              trackByIdFn = trackByIdExpFn || trackByIdArrayFn;
            } else {
              trackByIdFn = trackByIdExpFn || trackByIdObjFn;
              collectionKeys = [];
              for (key in collection) {
                if (collection.hasOwnProperty(key) && key.charAt(0) !== "$") {
                  collectionKeys.push(key);
                }
              }
              collectionKeys.sort();
            }
            arrayLength = collectionKeys.length;
            length = nextBlockOrder.length = collectionKeys.length;
            index = 0;
            while (index < length) {
              key = (collection === collectionKeys ? index : collectionKeys[index]);
              value = collection[key];
              trackById = trackByIdFn(key, value, index);
              if (trackById === 'hasOwnProperty') {
                throw angular.ngMinErr('badname', 'hasOwnProperty is not a valid {0} name', "`track by` id");
              }
              if (lastBlockMap.hasOwnProperty(trackById)) {
                block = lastBlockMap[trackById];
                delete lastBlockMap[trackById];
                nextBlockMap[trackById] = block;
                nextBlockOrder[index] = block;
              } else if (nextBlockMap.hasOwnProperty(trackById)) {
                angular.forEach(nextBlockOrder, function(block) {
                  if (block && block.scope) {
                    lastBlockMap[parseInt(block.id)] = block;
                  }
                });
                throw ngRepeatMinErr("dupes", "Duplicates in a repeater are not allowed. Use 'track by' expression to specify unique keys. Repeater: {0}, Duplicate key: {1}", expression, trackById);
              } else {
                nextBlockOrder[index] = {
                  id: trackById
                };
                nextBlockMap[trackById] = false;
              }
              index++;
            }
            for (key in lastBlockMap) {
              if (lastBlockMap.hasOwnProperty(key)) {
                block = lastBlockMap[key];
                elementsToRemove = getBlockElements(block.clone);
                $animate.leave(elementsToRemove);
                angular.forEach(elementsToRemove, function(element) {
                  element[NG_REMOVED] = true;
                });
                block.scope.$destroy();
              }
            }
            index = 0;
            length = collectionKeys.length;
            while (index < length) {
              key = (collection === collectionKeys ? index : collectionKeys[index]);
              value = collection[key];
              block = nextBlockOrder[index];
              if (nextBlockOrder[index - 1]) {
                previousNode = getBlockEnd(nextBlockOrder[index - 1]);
              }
              if (block.scope) {
                childScope = block.scope;
                nextNode = previousNode;
                while (true) {
                  nextNode = nextNode.nextSibling;
                  if (!(nextNode && nextNode[NG_REMOVED])) {
                    break;
                  }
                }
                if (getBlockStart(block) !== nextNode) {
                  $animate.move(getBlockElements(block.clone), null, angular.element(previousNode));
                }
                previousNode = getBlockEnd(block);
              } else {
                childScope = $scope.$new();
              }
              childScope[valueIdentifier] = value;
              if (keyIdentifier) {
                childScope[keyIdentifier] = key;
              }
              childScope.$index = index;
              childScope.$first = index === 0;
              childScope.$last = index === (arrayLength - 1);
              childScope.$middle = !(childScope.$first || childScope.$last);
              childScope.$odd = !(childScope.$even = (index & 1) === 0);
              childScope.reorderFuncs = reorderFuncs;
              if (!block.scope) {
                $transclude(childScope, function(clone) {
                  clone[clone.length++] = document.createComment(" end ngRepeat: " + expression + " ");
                  $animate.enter(clone, null, angular.element(previousNode));
                  previousNode = clone;
                  block.scope = childScope;
                  block.clone = clone;
                  childScope.$elementRef = block.clone;
                  nextBlockMap[block.id] = block;
                });
              }
              index++;
            }
            lastBlockMap = nextBlockMap;
          });
        }
      };
    }
  ]);

}).call(this);
