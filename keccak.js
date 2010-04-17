/* keccak.js
 *
 */

"use strict";
var keccak = (function () {
	var L;
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
			o = function (n) {
				return hex(n & 255) + hex(n >>> 8) + hex(n >>> 16) + hex(n >>> 24);
			};
			return function () {
				return o(this.lo) + o(this.hi);
			};
		}())
	};
	var state, permute, zeros, RC, r, keccak_f;
	zeros = function (k) {
		var i, z = [];
		for (i = 0; i < k; i += 1){
			z[i] = new L();
		}
		return z;
	};
	permute = [0,10,20,5,15,16,1,11,21,6,7,17,2,12,22,23,8,18,3,13,14,24,9,19,4];
	state = zeros(25);
	RC = "0 1,0 8082,z 808A,z yy,0 808B,0 y0001,z y8081,z 8009,0 8A,0 88,0 y8009,0 y000A,0 y808B,z 8B,z 8089,z 8003,z 8002,z 80,0 800A,z y000A,z y8081,z 8080,0 y0001,z y8008"
		.replace("z","y0000").replace("y","8000").split(",").map(function(i) {
			var k = i.split(" ");
			return new L(parseInt(k[1], 16), parseInt(k[0], 16));
	});
	r = [0,1,62,28,27,36,44,6,55,20,3,10,43,25,39,41,45,15,21,8,18,2,61,56,14];
	keccak_f = function () {
		var x, y, i, B, C, D, round;
		for (round = 0; round < 24; round += 1) {
			C = zeros(5);
			for (i = 0; i < 25; i += 1) {
				C[i % 5].xor(state[i]);
			}
			D = C.map(L.clone);
			for (x = 0; x < 5; x += 1) {
				D[x].circ(1).xor(C[(x+3)%5]);
			}
			for (i = 0; i < 25; i += 1) {
				state[i].xor(D[(i+1)%5]).circ(r[i]);
			}
			console.log(1);
			last = state.slice(0);
			for (i = 0; i < 25; i += 1) {
				state[i] = last[permute[i]];
			};
			
			console.log(2);
			for (y = 0; y < 25; y += 5) {
				for (x = 0; x < 5; x += 1) {
					state[y+x].xor(
						state[y + (x + 1) % 5].not().and(
							state[y + (x + 2) % 5]
						)
					);
				}
			}
			console.log(3);
			state[0].xor(RC[round]);
		}
	};
	function attempt(lo, hi) {
		state = zeros(25);
		state[0] = new L(lo, hi);
		keccak_f();
		console.log(state[0] + " " + state[1]);
	}
	attempt(0x397B5853, 0x0001901C);
	attempt(0x53587b39, 0x1C900100);
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