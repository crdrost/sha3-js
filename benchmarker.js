
benchmark = (function () {
	// implements an example use of a hash function: a simple salted
	// password hash application. It is meant to expand a password into
	// a very long string before hashing it, so as to make an adversary
	// do more work: thus, it really benchmarks the algorithms' speeds
	// on long messages. 
	var pass = encodeURIComponent("omg a paSsphrAse"),
		salt = "fb6d983003191d940155993b558423c1",
		bigstring = "",
		i;
	for (i = 0; i < 300; i += 1) {
		bigstring += pass + "," + salt + "," + i + ";"
	}
	return function (hash) {
		var t0, t1;
		t0 = Date.now();
		hash(bigstring);
		t1 = Date.now();
		console.log(name + ", hashing a " + (2 * bigstring.length) + " byte string: " + (t1 - t0) + "ms.";
	};
}());