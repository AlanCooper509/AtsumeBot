const createTable = require("../helpers/table_create.js");

module.exports = (tableMessage, reaction, current_page, itemLists) => {
	let offset = 0;
	if (reaction.emoji.name == "left") offset = -1;
	else if (reaction.emoji.name == "right") offset = 1;
	else return current_page;
	let keys = Object.keys(itemLists);
	let category = current_page.split('(')[0];
	let new_page = keys[(keys.indexOf(current_page) + offset + keys.length) % keys.length];
	while(!new_page.startsWith(category)) {
		new_page = keys[(keys.indexOf(new_page) + offset + keys.length) % keys.length];
	}
	let new_table = createTable(new_page, itemLists);
	tableMessage.edit(new_table);
	return new_page;
}