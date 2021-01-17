module.exports = (current_page, itemLists) => {
	let width = 41;
	let title = current_page;

	let spaces = '';
	for (let i = title.length; i < width; i++) { spaces += ' '; }
	let header = `\`${title}${spaces}\``

	let topBorder = '';
	for (let i = 0; i < width; i++) {topBorder += '_'; }
	topBorder = `\`${topBorder}\``;
	
	let border = "`│`";
	let rows = `${border}${itemLists[current_page].join(`${border}\n${border}`)}${border}`;
	
	let bottomBorder = '';
	for (let i = 0; i < width; i++) {bottomBorder += '¯'; }
	bottomBorder = `\`${bottomBorder}\``;

	return `${header}\n${topBorder}\n${rows}\n${bottomBorder}`;
}