/* skein.js
 *
 * An implementation of Skein-512-512 in Javascript, using a long integer class
 * L to allow for semi-efficient 64-bit long arithmetic. The chief purpose of 
 * this file is to prove the correctness of the algorithm of halfskein.js: 
 * since there are no test vectors, the similarity of the two codebases (this 
 * file was created directly from a halfskein.js file) allows us to confer 
 * confidence from skein.js to halfskein.js.
 *
 * These test vectors are given on the Skein v. 1.2 NIST CD:
 *     ShortMsgKAT_512.txt ::
 *         Len = 0
 *         Msg = 00
 *         MD = 5AF68A4912E0A6187A004947A9D2A37D7A1F0873F0BDD9DC64838ECE60DA5535C2A55D039BD58E178948996B7A8336486ED969C894BE658E47D595A5A9B86A8B
 *         ...
 *         Len = 16
 *         Msg = 41FB
 *         MD = 9FE78BD755A7B4E50E91033C250F65680D83D5288628FC848374496B849E0A2131C538737FC48F017DA892D0F2A61C903790505313C4F22A207FC991E2BEEDC7
 *         ...
 *         Len = 1024
 *         Msg = 2B6DB7CED8665EBE9DEB080295218426BDAA7C6DA9ADD2088932CDFFBAA1C14129BCCDD70F369EFB149285858D2B1D155D14DE2FDB680A8B027284055182A0CAE275234CC9C92863C1B4AB66F304CF0621CD54565F5BFF461D3B461BD40DF28198E3732501B4860EADD503D26D6E69338F4E0456E9E9BAF3D827AE685FB1D817
 *         MD = 492DB0C6B669BE4D9EC22A45F4C9D8F706FF580B90A6D5C8B83A22B2CEB6D91935B549F3E5D4CE0010B57ACB0A6F99FF2DBBF51305ED934904C5F3A1AC7DBBC7
 *         
 * The corresponding Javascript code is:
 *     skein512("")
 *         "5af68a4912e0a6187a004947a9d2a37d7a1f0873f0bdd9dc64838ece60da5535c2a55d039bd58e178948996b7a8336486ed969c894be658e47d595a5a9b86a8b"
 *     skein512("\ufb41")
 *         "9fe78bd755a7b4e50e91033c250f65680d83d5288628fc848374496b849e0a2131c538737fc48f017da892d0f2a61c903790505313c4f22a207fc991e2beedc7"
 *     skein512("\u6d2b\uceb7\u66d8\ube5e\ueb9d\u0208\u2195\u2684\uaabd\u6d7c\uada9\u08d2\u3289\uffcd\ua1ba\u41c1\ubc29\ud7cd\u360f\ufb9e\u9214\u8585\u2b8d\u151d\u145d\u2fde\u68db\u8b0a\u7202\u0584\u8251\ucaa0\u75e2\u4c23\uc9c9\u6328\ub4c1\u66ab\u04f3\u06cf\ucd21\u5654\u5b5f\u46ff\u3b1d\u1b46\u0dd4\u81f2\ue398\u2573\ub401\u0e86\ud5ad\ud203\u6e6d\u3369\u4e8f\u5604\ue9e9\uf3ba\u27d8\u68ae\ub15f\u17d8")
 *         "492db0c6b669be4d9ec22a45f4c9d8f706ff580b90a6d5c8b83a22b2ceb6d91935b549f3e5d4ce0010b57acb0a6f99ff2dbbf51305ed934904c5f3a1ac7dbbc7"
 *
 * This function was written by Chris Drost of drostie.org, and he hereby dedicates it into the 
 * public domain: it has no copyright. It is provided with NO WARRANTIES OF ANY KIND. 
 * I do humbly request that you provide me some sort of credit if you use it; but I leave that 
 * choice up to you.
 */

"use strict";
var skein512 = (function () {
	var even, odd, charcode, zero, pad, rot, ubi, initial, state, mix, subkey_inject, L;
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
		plus: (function () {
			var two32, s;
			two32 = 4 * (1 << 30);
			s = function (x, y) {
				var t = x + y;
				if (x < 0) {
					t += two32;
				}
				if (y < 0) {
					t += two32;
				}
				return t;
			};
			return function (that) {
				this.lo = s(this.lo, that.lo);
				this.hi = (s(this.hi, that.hi) + (this.lo >= two32 ? 1 : 0)) % two32;
				this.lo = this.lo % two32;
				return this;
			};
		}()),
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
	//permutation constants
	even = [0, 2, 4, 6, 2, 4, 6, 0, 4, 6, 0, 2, 6, 0, 2, 4];
	odd = [1, 3, 5, 7, 1, 7, 5, 3, 1, 3, 5, 7, 1, 7, 5, 3];
	charcode = String.fromCharCode;
	zero = charcode(0);
	// padding string: 32 zero-characters
	pad = zero + zero + zero + zero;
	pad += pad + pad + pad;
	pad += pad;
	// rotation constants..
	rot = [
		[46, 36, 19, 37, 33, 27, 14, 42, 17, 49, 36, 39, 44, 9, 54, 56], 
		[39, 30, 34, 24, 13, 50, 10, 17, 25, 29, 39, 43, 8, 35, 56, 22]
	];
	subkey_inject = function (key, tweak, round) {
		for (var i = 0; i < 8; i += 1) {
			state[i].plus(key[(round + i) % 9]);
		}
		state[5].plus(tweak[round % 3]);
		state[6].plus(tweak[(round + 1) % 3]);
		state[7].plus(new L(round));
	};
	mix = function (r) {
		// input: one of the two arrays of round constants.
		var a, b, i;
		for (i = 0; i < 16; i += 1) {
			a = even[i];
			b = odd[i];
			state[a].plus(state[b]);
			state[b].circ(r[i]).xor(state[a]);
		}
	};
	// UBI calls on the chaining state c have a type number T (0-63), and some
	// data string D, while c is itself used as a Threefish32 key schedule.
	ubi = function (type, message) {
		var key, data, i, j, block, round, first, last, tweak, original_length;
		// the message is padded with zeroes and turned into 32-bit ints.
		// first we store the original length
		original_length = message.length;
		if (original_length % 32) {
			message += pad.slice(original_length % 32);
		} else if (original_length === 0) {
			message = pad;
		}
		// then we construct the data array.
		data = [];
		j = 0;
		for (i = 0; i < message.length; i += 4) {
			data[j] = new L(
				message.charCodeAt(i) + message.charCodeAt(i + 1) * 0x10000,
				message.charCodeAt(i + 2) + message.charCodeAt(i + 3) * 0x10000
			);
			j += 1;
		}
		// we want a pointer last block, and tweak flags for first and type.
		first = 1 << 30;
		type <<= 24;
		last = data.length - 8;
		for (block = 0; block <= last; block += 8) {
			// tweak field. we're processing ints (block -> block + 8),
			// which each take up four bytes. On the last block we don't count
			// the padding 0's and we raise a "last" flag.
			tweak = (block === last) ? 
				[new L(2 * original_length), new L(0, first + type + (1 << 31))] :
				[new L(8 * block + 64), new L(0, first + type)];
			// extended tweak field.
			tweak[2] = new L().xor(tweak[0]).xor(tweak[1]);
			
			// the key for threefish encryption is extended from the chaining state
			// with one extra value.
			key = state;
			key[8] = new L(0x55555555, 0x55555555);
			for (i = 0; i < 8; i += 1) {
				key[8].xor(key[i]);
			}
			// and the state now gets the plaintext for this UBI iteration.
			state = data.slice(block, block + 8).map(L.clone);
			
			// Each "mix" is four "rounds" of threefish32, so the 18 here 
			// is essentially 4*18 = 72 in the spec.
			for (round = 0; round < 18; round += 1) {
				subkey_inject(key, tweak, round);
				mix(rot[round % 2]);
			}
			// there is then one final subkey addition in Threefish32:
			subkey_inject(key, tweak, round);
			// now we pass on to Matyas-Meyer-Oseas, XORing the source data
			// into the current state vector.
			for (i = 0; i < 8; i += 1) {
				state[i].xor(data[block + i]);
			}
			first = 0;
		}
	};
	state = [new L(), new L(), new L(), new L(), new L(), new L(), new L(), new L()];
	
	// ubi(0, "key string")
	ubi(4, charcode(0x4853, 0x3341, 1, 0, 512) + pad.slice(5, 16));
	// ubi(8, "personalization as UTF-16, against the standard.");
	// ubi(12, "public key string, if such exists.");
	// ubi(16, "key identifier");
	// ubi(20, "nonce input");
	initial = state;
	return function (m) {
		state = initial.map(L.clone);
		ubi(48, m);
		ubi(63, zero + zero + zero + zero);
		return state.join("");
	};
}());