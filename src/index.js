import nextNode from './next-node.js';

const win = window;
const doc = document;

export const ver = '0.3.3';

/**
 * Get the active `Selection`
 * @return {Selection}
 */
export function getSelection() {
	return win.getSelection() || doc.selection;
}

/**
 * Get a Selection's Range
 * @see http://stackoverflow.com/questions/13949059/persisting-the-changes-of-range-objects-after-selection-in-html/13950376#13950376
 * @param {Selection} sel
 * @return {Range|null}
 */
export function getRange(sel) {
	sel = sel || getSelection();
	return sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
}

/**
 * Restore a Selection Range
 * @see http://stackoverflow.com/questions/13949059/persisting-the-changes-of-range-objects-after-selection-in-html/13950376#13950376
 * @param {Range} saved
 * @param {Selection} sel
 */
export function setRange(saved, sel) {
	if (!saved) return;
	// will make new selection, if unset
	sel = sel || getSelection();
	sel.removeAllRanges();
	sel.addRange(saved);
}

/**
 * Get a Selection Rectangle
 * @see http://stackoverflow.com/questions/12603397/calculate-width-height-of-the-selected-text-javascript
 * @see http://stackoverflow.com/questions/6846230/coordinates-of-selected-text-in-browser-page
 * @param {Selection} sel
 * @return {Object|Boolean}
 */
export function getRect(sel) {
	sel = sel || getSelection();
	if (!sel.rangeCount) return false;

	var range = sel.getRangeAt(0).cloneRange();

	// on Webkit 'range.getBoundingClientRect()' sometimes return 0/0/0/0 - but 'range.getClientRects()' works
	var rects = range.getClientRects ? range.getClientRects() : [];
	for (var i = 0; i < rects.length; ++i) {
		var rect = rects[i];
		if (rect.left && rect.top && rect.right && rect.bottom) {
			return {
				// Modern browsers return floating-point numbers
				left: parseInt(rect.left, 10),
				top: parseInt(rect.top, 10),
				width: parseInt(rect.right - rect.left, 10),
				height: parseInt(rect.bottom - rect.top, 10)
			};
		}
	}

	return false;
}

/**
 * Get all Nodes within a Selection.
 * @see http://stackoverflow.com/questions/7781963/js-get-array-of-all-selected-nodes-in-contenteditable-div
 * @param  {Selection} sel
 * @return {Array}
 */
export function getNodes(sel) {
	var range = getRange(sel);
	if (!range) return [];

	var node = range.startContainer;
	var endNode = range.endContainer;

	// Special case for a range that is contained within a single node
	if (node === endNode) return [node];

	// Iterate nodes until we hit the end container
	var nodes = [];
	while (node && node !== endNode) {
		nodes.push(node = nextNode(node));
	}

	// Add partially selected nodes at the start of the range
	node = range.startContainer;
	while (node && node !== range.commonAncestorContainer) {
		nodes.unshift(node);
		node = node.parentNode;
	}

	return nodes;
}

/**
 * Get the inner HTML content of a selection.
 * @see http://stackoverflow.com/questions/4652734/return-html-from-a-user-selected-text/4652824#4652824
 * @param {Selection} sel
 * @return {String}
 */
export function getHTML(sel) {
	sel = sel || getSelection();
	if (!sel.rangeCount || sel.isCollapsed) return null;

	var len = sel.rangeCount;
	var container = doc.createElement('div');

	for (var i = 0; i < len; ++i) {
		container.appendChild(sel.getRangeAt(i).cloneContents());
	}

	return container.innerHTML;
}

/**
 * Is there a Selection active?
 * @param {Selection} sel
 * @return {Boolean}
 */
export function isCollapsed(sel) {
	return (sel || getSelection()).isCollapsed;
}

/**
 * Collapse a Selection to its beginning.
 * @param {Selection} sel
 * @see  http://stackoverflow.com/questions/8513368/collapse-selection-to-start-of-selection-not-div
 */
export function collapseStart(sel) {
	(sel || getSelection()).collapseToStart();
}

/**
 * Collapse a Selection to its endpoint.
 * @param {Selection} sel
 */
export function collapseEnd(sel) {
	(sel || getSelection()).collapseToEnd();
}

/**
 * Is the Selection within given container Node?
 * @param {Node} container  The container node
 * @param {Selection} sel
 * @return {Boolean}
 */
export function isWithin(container, sel) {
	sel = sel || getSelection();
	return container.contains(sel.anchorNode) && container.contains(sel.focusNode);
}

/**
 * Force/Restrict a Selection to the container & its children only.
 * @param {Node} container
 * @param {Selection} sel
 */
export function forceWithin(container, sel) {
	var range = doc.createRange();
	range.selectNodeContents(container);
	range.collapse(false);
	setRange(range, sel);
}

/**
 * Expand the Selection to include the full word that the Caret is (partially) within.
 * @see http://stackoverflow.com/questions/11247737/how-can-i-get-the-word-that-the-caret-is-upon-inside-a-contenteditable-div
 * @param {Selection} sel
 */
export function expandToWord(sel) {
	sel = sel || getSelection();
	if (sel.modify) {
		collapseStart(sel);
		sel.modify('move', 'backward', 'word');
		sel.modify('extend', 'forward', 'word');
	} else if (sel.type !== 'Control') {
		var range = sel.createRange();
		range.collapse(true);
		range.expand('word');
	}
}

/**
 * Get the full word that the Caret is within.
 * @see http://stackoverflow.com/questions/11247737/how-can-i-get-the-word-that-the-caret-is-upon-inside-a-contenteditable-div
 * @param  {Selection} sel
 * @return {String}
 */
export function getCaretWord(sel) {
	sel = sel || getSelection();
	var rng = getRange(sel);
	expandToWord(sel);
	var str = sel.toString(); // range?
	// Restore selection
	setRange(rng);
	return str;
}

/**
 * Detect the direction of the Selection
 * @param  {Selection} sel
 * @return {Boolean}
 */
export function isBackwards(sel) {
	sel = sel || getSelection();
	if (isCollapsed(sel)) return;

	// Detect if selection is backwards
	var range = doc.createRange();
	range.setStart(sel.anchorNode, sel.anchorOffset);
	range.setEnd(sel.focusNode, sel.focusOffset);
	range.detach();

	// if `collapsed` then it's backwards
	return range.collapsed;
}

/**
 * Snap the Selection to encompass all partially-selected words.
 * @see  http://stackoverflow.com/questions/7380190/select-whole-word-with-getselection
 * @param  {Selection} sel
 */
export function snapSelected(sel) {
	sel = sel || getSelection();
	if (isCollapsed(sel)) return;

	var end = sel.focusNode;
	var off = sel.focusOffset;
	var dir = ['forward', 'backward'];
	isBackwards(sel) && dir.reverse();

	// modify() works on the focus of the selection
	sel.collapse(sel.anchorNode, sel.anchorOffset);

	sel.modify('move', dir[0], 'character');
	sel.modify('move', dir[1], 'word');
	sel.extend(end, off);
	sel.modify('extend', dir[1], 'character');
	sel.modify('extend', dir[0], 'word');
}
