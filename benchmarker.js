
benchmark = function (hash) {
	var phrase, t0, t1;
	phrase = "omg a paSsphrAse" + "97B32833D11EE19D"
	while (phrase.length < 15000) {
		phrase += phrase;
	}
	t0 = Date.now();
	hash(phrase);
	t1 = Date.now();
	console.log(phrase.length, t1 - t0);
};