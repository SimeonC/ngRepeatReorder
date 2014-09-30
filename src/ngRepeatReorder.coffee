"use strict"
module = angular.module 'ngRepeatReorder', ['hmTouchEvents']
#sets up the events directly before repeatReorder is executed, as when it executes we no longer have access to the original html until repeats start populating which is bad performance
#all hm events will correctly bubble if you'd like to do something cool like show a delete button with that functionality. Exception is hm-dragup, hm-dragdown and hm-drag when direction is up or down.
module.directive 'ngRepeatReorderHandle', ['$parse', ($parse) ->
	restrict: "A"
	priority: 999
	terminal: false
	link: (scope, element, attrs) ->
		# setup the element to have correct attributes on the drag 'handle'
		# touch compatible events - these do nothing if you don't have hammer.js installed. For compatability see here: https://github.com/EightMedia/hammer.js/wiki/Compatibility
		# This code borrows from angular-hammer.js
		bindHammer = (baseElement, eventName, actionString) ->
			opts = $parse(attrs['hmOptions'])(scope, {})
			fn = (event) -> scope.$apply -> $parse(actionString) scope,
				$event: event
			# don't create multiple Hammer instances per element
			if !(hammer = baseElement.data 'hammer')
				hammer = window.Hammer baseElement[0], opts
				baseElement.data 'hammer', hammer
			# bind Hammer touch event
			hammer.on eventName, fn
			# unbind Hammer touch event
			scope.$on '$destroy', -> hammer.off eventName, fn
		
		if attrs.ngRepeatReorderHandle is '' then baseElement = element
		else baseElement = element.find attrs.ngRepeatReorderHandle
		if baseElement?
			bindHammer baseElement, "drag", "reorderFuncs.moveevent($event, this, $index)"
			bindHammer baseElement, "dragstart", "reorderFuncs.startevent($event, this, $index)"
			bindHammer baseElement, "dragend", "reorderFuncs.stopevent($event, this, $index)"
]

uid = ['0', '0', '0']
module.directive 'ngRepeatReorder', [
	"$parse"
	"$animate"
	($parse, $animate) ->
		# functions only needed in here
		getBlockStart = (block) ->
			block.clone[0]
		getBlockEnd = (block) ->
			block.clone[block.clone.length - 1]
		nextUid = ()->
			# copied from nextUid of angular
			index = uid.length
			digit = undefined
			
			while index
				index--
				digit = uid[index].charCodeAt 0
				if digit is 57
					uid[index] = 'A'
					return uid.join ''
				if digit is 90
					uid[index] = '0'
				else
					uid[index] = String.fromCharCode digit + 1
					return uid.join ''
			uid.unshift '0'
			uid.join ''
		hashKey = (obj) ->
			objType = typeof obj
			if objType is 'object' and obj isnt null
				if typeof (key = obj.$$hashKey) is 'function'
					# must invoke on object to keep the right this
					key = obj.$$hashKey()
				else if key is undefined then key = obj.$$hashKey = nextUid()
			else key = obj
			return objType + ':' + key
		getBlockElements = (nodes) ->
			startNode = nodes[0]
			endNode = nodes[nodes.length - 1]
			return jqLite(startNode)  if startNode is endNode
			element = startNode
			elements = [element]
			loop
				element = element.nextSibling
				break  unless element
				elements.push element
				break unless element isnt endNode
			angular.element elements
		NG_REMOVED = "$$NG_REMOVED"
		ngRepeatMinErr = angular.$$minErr("ngRepeat")
		return (
			transclude: "element"
			priority: 1000
			terminal: true
			$$tlb: true
			link: ($scope, $element, $attr, ctrl, $transclude) ->
				expression = $attr.ngRepeatReorder
				match = expression.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+track\s+by\s+([\s\S]+?))?\s*$/)
				trackByExp = undefined
				trackByExpGetter = undefined
				trackByIdExpFn = undefined
				trackByIdArrayFn = undefined
				trackByIdObjFn = undefined
				lhs = undefined
				rhs = undefined
				valueIdentifier = undefined
				keyIdentifier = undefined
				dragBeforeElement = undefined
				dragAfterElement = undefined
				hashFnLocals = $id: hashKey
				throw ngRepeatMinErr("iexp", "Expected expression in form of '_item_ in _collection_[ track by _id_]' but got '{0}'.", expression)	unless match
				lhs = match[1]
				rhs = match[2]
				trackByExp = match[3]
				
				if trackByExp
					trackByExpGetter = $parse(trackByExp)
					trackByIdExpFn = (key, value, index) ->
						hashFnLocals[keyIdentifier] = key	if keyIdentifier
						hashFnLocals[valueIdentifier] = value
						hashFnLocals.$index = index
						trackByExpGetter $scope, hashFnLocals
				else
					trackByIdArrayFn = (key, value) ->
						hashKey value
					trackByIdObjFn = (key) ->
						key
				
				match = lhs.match(/^(?:([\$\w]+)|\(([\$\w]+)\s*,\s*([\$\w]+)\))$/)
				throw ngRepeatMinErr("iidexp", "'_item_' in '_item_ in _collection_' should be an identifier or '(_key_, _value_)' expression, but got '{0}'.", lhs)	unless match
				valueIdentifier = match[3] or match[1]
				keyIdentifier = match[2]
				lastBlockMap = {}
				
				#setup styling
				$element.wrap('<div class="ng-repeat-reorder-parent"></div>');
								
				$scope.$watchCollection rhs, ngRepeatAction = (collection) ->
					index = undefined
					length = undefined
					previousNode = $element[0]
					nextNode = undefined
					nextBlockMap = {}
					arrayLength = undefined
					childScope = undefined
					key = undefined
					value = undefined
					trackById = undefined
					trackByIdFn = undefined
					collectionKeys = undefined
					block = undefined
					nextBlockOrder = []
					elementsToRemove = undefined
					
					reorderFuncs = 
						offset: 0
						deltaOffset: 0
						dragBeforeElement: ''
						dragAfterElement: ''
						#this is used so we only detect vertical drags, this allows for swipe left to show a delete button for example
						setPosition: ($element, deltaTop="", deltaLeft="") ->
							$element = angular.element $element[0]
							$element.css 'top', "#{deltaTop}px"
							$element.css 'left', "#{deltaLeft}px"
						resetPosition: ($element) ->
							$element = angular.element $element[0]
							$element.css 'top', ""
							$element.css 'left', ""
						#a shortcut to set the top and bottom margins, also removes the top border style - in styles only
						setMargins: ($element, top="", bottom="") ->
							$element = angular.element $element[0]
							$element.css "margin-top", top
							$element.css "margin-bottom", bottom
							$element.css "border-top", ""
						#reset all margins to default - ie no margins/set in css
						resetMargins: -> @setMargins c.clone for c in nextBlockOrder
						#this function gets the offset of the mouse and manipulates the margins to reposition everything correctly
						updateOffset: ($event, $element, $index) ->
							if not $event or not $event.gesture or nextBlockOrder.length <= 1 then return
							@offset = 0
							@resetMargins()
							collection = $scope.$eval(rhs)
							workingDelta = $event.gesture.deltaY
							gDirection = if $event.gesture.deltaY < 0 then "up" else "down"
							directedHeight = $element[0].offsetHeight * if gDirection is "up" then -1.0 else 1.0
							workingElement = $element[0]
							halfHeight = 0
							
							# This means that the "gap" we will insert into will move when we move past the half way mark of the next element (called lenience calculation)
							testDelta = () -> workingDelta + (directedHeight/2.0)
							while (gDirection is "down" and testDelta() > 0 and $index+@offset < nextBlockOrder.length) or (gDirection is "up" and testDelta() < 0 and $index+@offset >= 0) #figure on how many spaces we've moved
								#get the currently focussed element, then reset the margins on it to 0
								workingElement = nextBlockOrder[$index+@offset].clone
								workingDelta += workingElement[0].offsetHeight * if gDirection is "down" then -1.0 else 1.0
								if gDirection is "down" then @offset++ else @offset--
							
							workingDelta -= workingElement[0].offsetHeight * if gDirection is "down" then -1.0 else 1.0
							# now we have the previous/next element, we insert the correct amount of margin to show the "gap"
							margin = "#{$element[0].offsetHeight}px"
							
							if Math.abs(@offset) is 1
								beforeIndex = $index-1
								afterIndex = $index+1
								# set the top margin of the next or bottom margin of the previous if at the end
								if $index < nextBlockOrder.length - 1 then @setMargins nextBlockOrder[$index+1].clone, margin
								else @setMargins nextBlockOrder[$index-1].clone, '', margin
							else
								if @offset < 0
									# going up, so show new gap
									beforeIndex = $index+@offset
									afterIndex = $index+@offset+1
									if $index+@offset <= 0 then @setMargins workingElement, margin
									else @setMargins workingElement, margin
								else
									# going down, so show new gap
									beforeIndex = $index+@offset-1
									afterIndex = $index+@offset
									if $index+@offset >= nextBlockOrder.length-1 then @setMargins workingElement, "", margin
									else @setMargins workingElement, "", margin
							#fix the delta so that it cannot move past the first/last slots!
							if ($event.gesture.deltaY+@deltaOffset <= 0 or $event.gesture.deltaY+@deltaOffset+$element[0].offsetHeight >= $element.parent()[0].offsetHeight) then delta = $event.gesture.deltaY - workingDelta
							else delta = $event.gesture.deltaY
							
							@setPosition $element, delta+@deltaOffset, 0
							
							# re-add the dragging-before and after classes, the two elements that get these classes border the "gap" we are targeting into
							if dragBeforeElement? then dragBeforeElement.removeClass "dragging-before"
							if dragAfterElement? then dragAfterElement.removeClass "dragging-after"
							if beforeIndex >= 0 then (dragBeforeElement = nextBlockOrder[beforeIndex].clone).addClass "dragging-before"
							if afterIndex < collection.length then (dragAfterElement = nextBlockOrder[afterIndex].clone).addClass "dragging-after"
						#to catch a move event
						moveevent: ($event, $scope, $index) ->
							if nextBlockOrder.length <= 1 then return
							$element = $scope.$elementRef
							$element.addClass 'dragging'
							@updateOffset $event, $element, $index
							$event.preventDefault()
							$event.stopPropagation()
							$event.gesture.stopPropagation()
							return false
						#used for the start event
						startevent: ($event, $scope, $index) ->
							if nextBlockOrder.length <= 1 then return
							$element = $scope.$elementRef
							$scope.$emit 'ngrr-dragstart', $event, $element, $index
							$element.parent().addClass "active-drag-below"
							@deltaOffset = $element[0].offsetTop
							$element.addClass 'dragging'
							@offset = 0
							@setMargins $element, '', "-#{$element[0].offsetHeight}px"
							@updateOffset $event, $element, $index
							$event.preventDefault()
						#when a drag event finishes
						stopevent: ($event, $scope, $index) ->
							if nextBlockOrder.length <= 1 then return
							$element = $scope.$elementRef
							$scope.$emit 'ngrr-dragend', $event, $element, $index
							$element.parent().removeClass "active-drag-below"
							@resetMargins()
							@resetPosition $element
							if dragBeforeElement? then dragBeforeElement.removeClass "dragging-before"
							if dragAfterElement? then dragAfterElement.removeClass "dragging-after"
							#after animation, so before the watch is fired!
							if @offset isnt 0
								collection = $scope.$eval(rhs)
								obj = collection.splice $index, 1
								if @offset < 0 then collection.splice $index + @offset + 1, 0, obj[0]
								else if @offset > 0 then collection.splice $index + @offset - 1, 0, obj[0]
								$scope.$emit 'ngrr-reordered'
							#so it shouldn't dissapear during transition
							$element.removeClass 'dragging'
							$event.preventDefault()
					
					isArrayLike = (obj) ->
						if not obj? or (obj and obj.document and obj.location and obj.alert and obj.setInterval) then return false
						length = obj.length
						if obj.nodeType is 1 and length then return true
						toString = ({}).toString
						return typeof obj is 'string' or toString.call(obj) is '[object Array]' or length is 0 or typeof length is 'number' and length > 0 and (length - 1) in obj
					if isArrayLike collection
						collectionKeys = collection
						trackByIdFn = trackByIdExpFn or trackByIdArrayFn
					else
						trackByIdFn = trackByIdExpFn or trackByIdObjFn
						collectionKeys = []
						for key of collection
							collectionKeys.push key	if collection.hasOwnProperty(key) and key.charAt(0) isnt "$"
						collectionKeys.sort()
					arrayLength = collectionKeys.length
					length = nextBlockOrder.length = collectionKeys.length
					index = 0
					while index < length
						key = (if (collection is collectionKeys) then index else collectionKeys[index])
						value = collection[key]
						trackById = trackByIdFn(key, value, index)
						# replaces: assertNotHasOwnProperty trackById, "`track by` id"
						if trackById is 'hasOwnProperty' then throw angular.ngMinErr 'badname', 'hasOwnProperty is not a valid {0} name', "`track by` id"
						if lastBlockMap.hasOwnProperty(trackById)
							block = lastBlockMap[trackById]
							delete lastBlockMap[trackById]

							nextBlockMap[trackById] = block
							nextBlockOrder[index] = block
						else if nextBlockMap.hasOwnProperty(trackById)
							angular.forEach nextBlockOrder, (block) ->
								lastBlockMap[parseInt block.id] = block	if block and block.scope
								return

							throw ngRepeatMinErr("dupes", "Duplicates in a repeater are not allowed. Use 'track by' expression to specify unique keys. Repeater: {0}, Duplicate key: {1}", expression, trackById)
						else
							nextBlockOrder[index] = id: trackById
							nextBlockMap[trackById] = false
						index++
					for key of lastBlockMap
						if lastBlockMap.hasOwnProperty(key)
							block = lastBlockMap[key]
							elementsToRemove = getBlockElements(block.clone)
							$animate.leave elementsToRemove
							angular.forEach elementsToRemove, (element) ->
								element[NG_REMOVED] = true
								return

							block.scope.$destroy()
					index = 0
					length = collectionKeys.length
					while index < length
						key = (if (collection is collectionKeys) then index else collectionKeys[index])
						value = collection[key]
						block = nextBlockOrder[index]
						previousNode = getBlockEnd(nextBlockOrder[index - 1])	if nextBlockOrder[index - 1]
						if block.scope
							childScope = block.scope
							nextNode = previousNode
							loop
								nextNode = nextNode.nextSibling
								break unless nextNode and nextNode[NG_REMOVED]
							$animate.move getBlockElements(block.clone), null, angular.element(previousNode)	unless getBlockStart(block) is nextNode
							previousNode = getBlockEnd(block)
						else
							childScope = $scope.$new()
						childScope[valueIdentifier] = value
						childScope[keyIdentifier] = key	if keyIdentifier
						childScope.$index = index
						childScope.$first = (index is 0)
						childScope.$last = (index is (arrayLength - 1))
						childScope.$middle = not (childScope.$first or childScope.$last)
						childScope.$odd = not (childScope.$even = (index & 1) is 0)
						childScope.reorderFuncs = reorderFuncs
						unless block.scope
							$transclude childScope, (clone) ->
								clone[clone.length++] = document.createComment(" end ngRepeat: " + expression + " ")
								$animate.enter clone, null, angular.element(previousNode)
								previousNode = clone
								block.scope = childScope
								block.clone = clone
								childScope.$elementRef = block.clone
								nextBlockMap[block.id] = block
								return

						index++
					lastBlockMap = nextBlockMap
					return

				return
		)
]
