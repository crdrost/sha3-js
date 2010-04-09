/* halfskein.js
 * An implementation of Skein in Javascript, using 32-bit state integers rather
 * than 64-bit ones. This implementation operates on Javascript strings, 
 * interpreted as UTF-16LE byte arrays. 
 * 
 * The Skein specification alludes to the possibility of a 32-bit version; but 
 * it does not actually standardise this. In particular, the rotation constants
 * chosen here are somewhat arbitrary, and the choice to alter the geometry of 
 * the tweak schedule to 5 words from 3 is not written down anywhere in the 
 * spec. Also, the Skein team might change the number of rounds at their own 
 * discretion. I have not seen whether the cryptanalysis described in the Skein
 * spec applies with the same number of rounds to the 32-bit version.
 *  
 * Since this is basically my own initiative, the config block contains the 
 * identifier "hSkn" rather than "SHA3", and the rotation constants are
 * nothing-up-my-sleeve numbers: they come from the base-100 decimal expansion 
 * of pi, with each digit passed into the function '2 + (n % 28)' so that 0, 1,
 * and 31 are forbidden values. I have indeed done similar searches to the ones
 * described in the paper, but I don't feel I'm qualified to publish them
 * authoritatively; I figure the random constants are more credible.
 * 
 * This function was written by Chris Drost of drostie.org, and he hereby dedicates it into the 
 * public domain: it has no copyright. It is provided with NO WARRANTIES OF ANY KIND. 
 * I do humbly request that you provide me some sort of credit if you use it; but I leave that 
 * choice up to you.
 */

"use strict";
var halfskein = (function () {
	var even, odd, charcode, zero, pad, rot, ubi, initial, state, mix, hex, output_fn, subkey_inject;
	//permutation constants
	even = [0, 2, 4, 6, 2, 4, 6, 0, 4, 6, 0, 2, 6, 0, 2, 4];
	odd = [1, 3, 5, 7, 1, 7, 5, 3, 1, 3, 5, 7, 1, 7, 5, 3];
	charcode = String.fromCharCode;
	zero = charcode(0);
	// padding string: sixteen zero-characters
	pad = zero + zero + zero + zero;
	pad += pad + pad + pad;
	
	// rotation constants: f([3, 14, 15, 92, 65, 35...]).
	rot = [
		[5, 16, 17, 10, 11, 9, 7, 25, 6, 12, 20, 28, 17, 12, 6, 25], 
		[24, 2, 2, 21, 17, 15, 13, 11, 21, 12, 4, 22, 15, 23, 18, 5]
	];
	subkey_inject = function (key, tweak, round) {
		for (var i = 0; i < 8; i += 1) {
			state[i] += key[(round + i) % 9];
		}
		state[5] += tweak[round % 5];
		state[6] += tweak[(round + 1) % 5];
		state[7] += round;
	};
	mix = function (r) {
		// input: one of the two arrays of round constants.
		var a, b, i;
		for (i = 0; i < 16; i += 1) {
			a = even[i];
			b = odd[i];
			state[a] += state[b];
			state[b] = state[a] ^ (state[b] << r[i] | state[b] >>> 32 - r[i]);
		}
	};
	
	// UBI calls on the chaining state c have a type number T (0-63), and some
	// data string D, while c is itself used as a Threefish32 key schedule.
	ubi = function (type, message) {
		var key, data, i, j, block, round, first, last, tweak, original_length;
		// the message is padded with zeroes and turned into 32-bit ints.
		// first we store the original length
		original_length = message.length;
		if (original_length % 16) {
			message += pad.slice(original_length % 16);
		} else if (original_length === 0) {
			message = pad;
		}
		// then we construct the data array.
		data = [];
		j = 0;
		for (i = 0; i < message.length; i += 2) {
			data[j] = message.charCodeAt(i) + message.charCodeAt(i + 1) * 0x10000;
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
				[2 * original_length, 0, 0, first + type + (1 << 31)] :
				[4 * block + 32, 0, 0, first + type];
			// extended tweak field.
			tweak[4] = tweak[0] ^ tweak[3];
			
			// the key for threefish encryption is extended from the chaining state
			// with one extra value.
			key = state;
			key[8] = 0x55555555;
			for (i = 0; i < 8; i += 1) {
				key[8] ^= key[i];
			}
			// and the state now gets the plaintext for this UBI iteration.
			state = data.slice(block, block + 8);
			
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
				state[i] ^= data[block + i];
			}
			first = 0;
		}
	};
	// output formatting function, giving the little-endian hex display of a number.
	hex = function (n) {
		return ("00" + n.toString(16)).slice(-2);
	};
	output_fn = function (n) {
		return hex(n & 255) + hex(n >>> 8) + hex(n >>> 16) + hex(n >>> 24);
	};
	state = [0, 0, 0, 0, 0, 0, 0, 0];
	
	// below, the config block should be ASCII bytes for "SHA3", but it has 
	// intentionally been left as ASCII bytes for "hSkn" instead.
	
	// different options for configuration:
	// ubi(0, "key string")
	ubi(4, charcode(0x5368, 0x6e6b, 1, 0, 256) + pad.slice(5));
	// ubi(8, "personalization as UTF-16, against the standard.");
	// ubi(12, "public key string, if such exists.");
	// ubi(16, "key identifier");
	// ubi(20, "nonce input");
	initial = state;
	return function (m) {
		state = initial.slice(0);
		ubi(48, m);
		ubi(63, zero + zero + zero + zero);
		return state.map(output_fn).join("");
	};
}());