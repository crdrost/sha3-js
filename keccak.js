/* keccak.js
 *
 */

"use strict";
var keccak = (function () {
	var state, State, L, permute, zeros, RC, r, keccak_f;
	L = function (lo, hi) {
		this.lo = lo ? lo : 0;
		this.hi = hi ? hi : 0;
	};
	L.clone = function (a) {
		return new L(a.lo, a.hi);
	};
	L.prototype = {
		xor: function (that) {
			this.lo ^= that.lo;
			this.hi ^= that.hi;
			return this;
		},
		not: function () {
			return new L(~this.lo, ~this.hi);
		},
		and: function (that) {
			this.lo &= that.lo;
			this.hi &= that.hi;
			return this;
		},
		circ: function (n) {
			var tmp, m;
			if (n >= 32) {
				tmp = this.lo;
				this.lo = this.hi;
				this.hi = tmp;
				n -= 32;
			}
			if (n === 0) {
				return this;
			}
			m = 32 - n;
			tmp = (this.hi << n) + (this.lo >>> m);
			this.lo = (this.lo << n) + (this.hi >>> m);
			this.hi = tmp;
			return this;
		},
		toString: (function () {
			var hex, o;
			hex = function (n) {
				return ("00" + n.toString(16)).slice(-2);
			};
			/*
			o = function (n) {
				return hex(n & 255) + hex(n >>> 8) + hex(n >>> 16) + hex(n >>> 24);
			};
			return function () {
				return o(this.lo) + o(this.hi);
			};
			*/
			o = function (n) {
				return hex(n >>> 24) + hex(n >>> 16) + hex(n >>> 8) + hex(n & 255);
			};
			return function () {
				return o(this.hi) + o(this.lo);
			};
		}())
	};
	zeros = function (k) {
		var i, z = [];
		for (i = 0; i < k; i += 1){
			z[i] = new L();
		}
		return z;
	};
	State = function (s) {
		var fn = function (x, y) {
			return fn._array[(x % 5) + 5 * (y % 5)];
		};
		fn._array = s ? s : zeros(25);
		fn.clone = function () {
			return new State(fn._array.map(L.clone));
		};
		return fn;
	}
		
	permute = [0,10,20,5,15,16,1,11,21,6,7,17,2,12,22,23,8,18,3,13,14,24,9,19,4];
	RC = "0,1;0,8082;z,808A;z,yy;0,808B;0,y0001;z,y8081;z,8009;0,8A;0,88;0,y8009;0,y000A;0,y808B;z,8B;z,8089;z,8003;z,8002;z,80;0,800A;z,y000A;z,y8081;z,8080;0,y0001;z,y8008"
		.replace(/z/g,"80000000").replace(/y/g,"8000").split(";").map(function(str) {
			var k = str.split(",");
			return new L(parseInt(k[1], 16), parseInt(k[0], 16));
	});
	r = [0,1,62,28,27,36,44,6,55,20,3,10,43,25,39,41,45,15,21,8,18,2,61,56,14];
	keccak_f = function () {
		var x, y, i, B, C, D, round, log;
		for (round = 0; round < 24; round += 1) {
			log = round < 5;
			console.log("Round " + round);
			// THETA STEP
			C = zeros(5);
			for (x = 0; x < 5; x += 1) {
				for (y = 0; y < 5; y += 1) {
					C[x].xor(state(x,y));
				}
			}
			// Extra logic needed because L() objects are dynamic.
			// D[x] = C[x + 1]
			D = C.map(L.clone);
			D = D.concat(D.splice(0, 1));
			// D[x] = C[x - 1] xor rot(C[x+1], 1)
			for (x = 0; x < 5; x += 1) {
				D[x].circ(1).xor(C[(x + 4) % 5]);
			}
			for (x = 0; x < 5; x += 1) {
				for (y = 0; y < 5; y += 1) {
					state(x,y).xor(D[x]);
				}
			}
			if (log) {
				console.log("after theta\n", state._array.join(" "));
			}
			// RHO STEP
			B = state.clone()
			for (x = 0; x < 5; x += 1) {
				for (y = 0; y < 5; y += 1) {
					state(x,y).circ(r[5*y + x]);
				}
			}
			if (log) {
				console.log("after rho\n", state._array.join(" "));
			}
			// PI STEP
			last = state._array.slice(0);
			for (i = 0; i < 25; i += 1) {
				state._array[permute[i]] = last[i];
			}
			if (log) {
				console.log("after pi\n", state._array.join(" "));
			}
			
			// CHI STEP
			B = state.clone();
			for (x = 0; x < 5; x += 1) {
				for (y = 0; y < 5; y += 1) {
					state(x, y).xor(B(x + 1, y).not().and(B(x + 2, y)));
				}
			}
			if (log) {
				console.log("after chi\n", state._array.join(" "));
			}
			// IOTA STEP
			state(0, 0).xor(RC[round]);
			if (log) {
				console.log("after iota\n", state._array.join(" "));
			}
		}
	};
	function attempt(lo, hi) {
		state = new State();
		state(0, 0).xor(new L(lo, hi));
		keccak_f();
		console.log(state(0, 0) + " " + state(1, 0));
	}
	attempt(0, 0);
	console.log(RC.join(" "));
	//attempt(0x397B5853, 0x0001901C);
	//attempt(0x53587b39, 0x1C900100);
	//attempt(0xe4f6b0a6, 0x008090e0);
	//attempt(0xa6b0f6e4, 0xe0908000);
}());
/*
	return function (m) {
		state = zeros(25);
		m += "\u1c01\u0190";
		while (m.length % 72) {
			m += "\u0000";
		}
		blocks = [];
		for (i = 0; i < m.length; i += 4) {
			if (i % 72 === 0) {
				last = [];
				blocks.push(last);
			}
			last.push(new Long(
				m.charCodeAt(i) + m.charCodeAt(i+1)*65536,
				m.charCodeAt(i+2) + m.charCodeAt(i+3)*65536
			));
		}
		
	};
}());*/