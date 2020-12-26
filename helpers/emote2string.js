module.exports = (emote) => {
	return emote.split(':')[2].split('>')[0];
}