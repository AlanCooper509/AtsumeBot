module.exports = (inputString) => {
	// Goal: right padding with spaces to match item name widths
	let maxLength = 22; // "Grass Cushion (Purple)" from analyzing the GoodiesData table in memory.db
	let spaces = '';
	for (let i = inputString.length; i < maxLength; i++) { spaces += ' '; }
	return `${inputString}${spaces}`;
}