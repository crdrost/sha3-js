/* skein.js
 *
 * An implementation of Skein-512-512 in Javascript, using a long integer class
 * L to allow for semi-efficient 64-bit long arithmetic. The chief purpose of 
 * this file is to prove the correctness of the algorithm of halfskein.js: 
 * since there are no test vectors, the similarity of the two codebases (this 
 * file was created directly from a halfskein.js file) allows us to confer 
 * confidence from skein.js to halfskein.js.
 *
 * These test vectors are given on the Skein v. 1.3 NIST CD:
 *     ShortMsgKAT_512.txt ::
 *         Len = 0
 *         Msg = 00
 *         MD = BC5B4C50925519C290CC634277AE3D6257212395CBA733BBAD37A4AF0FA06AF41FCA7903D06564FEA7A2D3730DBDB80C1F85562DFCC070334EA4D1D9E72CBA7A
 *         ...
 *         Len = 16
 *         Msg = 41FB
 *         MD = 258F3CEEBD9C01271D75ABE73E90085390F54CD318B4D5FA71E8813A541DD96E9DE5A119D053A913296929E263267A3710B3675AB99C42A3F67D96FBE6CA8451
 *         ...
 *         Len = 2000
 *         Msg = B3C5E74B69933C2533106C563B4CA20238F2B6E675E8681E34A389894785BDADE59652D4A73D80A5C85BD454FD1E9FFDAD1C3815F5038E9EF432AAC5C3C4FE840CC370CF86580A6011778BBEDAF511A51B56D1A2EB68394AA299E26DA9ADA6A2F39B9FAFF7FBA457689B9C1A577B2A1E505FDF75C7A0A64B1DF81B3A356001BF0DF4E02A1FC59F651C9D585EC6224BB279C6BEBA2966E8882D68376081B987468E7AED1EF90EBD090AE825795CDCA1B4F09A979C8DFC21A48D8A53CDBB26C4DB547FC06EFE2F9850EDD2685A4661CB4911F165D4B63EF25B87D0A96D3DFF6AB0758999AAD214D07BD4F133A6734FDE445FE474711B69A98F7E2B
 *         MD = 72B6C1EAAF98E4643EC3E6348988C7C5BA8AE0A4BB2EDC65409B7C4CBF37B3D6096DE4967FC0D0B22B7E709531BF9F65EE0203BFD9925BBB2A8AAC509AD762B4
 *         
 * The corresponding Javascript code is:
 *     skein("");
 *         "bc5b4c50925519c290cc634277ae3d6257212395cba733bbad37a4af0fa06af41fca7903d06564fea7a2d3730dbdb80c1f85562dfcc070334ea4d1d9e72cba7a"
 *     skein("\ufb41");
 *         "258f3ceebd9c01271d75abe73e90085390f54cd318b4d5fa71e8813a541dd96e9de5a119d053a913296929e263267a3710b3675ab99c42a3f67d96fbe6ca8451"
 *     skein("\uC5B3\u4BE7\u9369\u253C\u1033\u566C\u4C3B\u02A2\uF238\uE6B6\uE875\u1E68\uA334\u8989\u8547\uADBD\u96E5\uD452\u3DA7\uA580\u5BC8\u54D4\u1EFD\uFD9F\u1CAD\u1538\u03F5\u9E8E\u32F4\uC5AA\uC4C3\u84FE\uC30C\uCF70\u5886\u600A\u7711\uBE8B\uF5DA\uA511\u561B\uA2D1\u68EB\u4A39\u99A2\u6DE2\uADA9\uA2A6\u9BF3\uAF9F\uFBF7\u57A4\u9B68\u1A9C\u7B57\u1E2A\u5F50\u75DF\uA0C7\u4BA6\uF81D\u3A1B\u6035\uBF01\uF40D\u2AE0\uC51F\u659F\u9D1C\u5E58\u22C6\uB24B\uC679\uBABE\u6629\u88E8\u682D\u6037\uB981\u4687\u7A8E\u1EED\u0EF9\u09BD\uE80A\u7925\uDC5C\uB4A1\u9AF0\u9C97\uFC8D\uA421\u8A8D\uCD53\u26BB\uDBC4\u7F54\u6EC0\u2FFE\u5098\uD2ED\u5A68\u6146\u49CB\uF111\uD465\u3EB6\u5BF2\uD087\u6DA9\uFF3D\uB06A\u8975\uAA99\u14D2\u7BD0\uF1D4\uA633\u4F73\u44DE\uE45F\u7174\u691B\u8FA9\u2B7E");
 *         "72b6c1eaaf98e4643ec3e6348988c7c5ba8ae0a4bb2edc65409b7c4cbf37b3d6096de4967fc0d0b22b7e709531bf9f65ee0203bfd9925bbb2a8aac509ad762b4"
 *
 * This function was written by Chris Drost of drostie.org, and he hereby dedicates it into the 
 * public domain: it has no copyright. It is provided with NO WARRANTIES OF ANY KIND. 
 * I do humbly request that you provide me some sort of credit if you use it; but I leave that 
 * choice up to you.
 */

"use strict";
var skein = (function () {
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
			key[8] = new L(0xa9fc1a22, 0x1bd11bda);
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