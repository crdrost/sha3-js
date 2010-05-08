/* blake32.js
 * A Javascript implementation of Jean-Philippe Aumasson's BLAKE32 algorithm.
 * 
 * This implementation operates on Javascript strings, interpreted as UTF-16BE 
 * encoded (i.e. "\u1234\u5678" --> [0x12, 0x34, 0x56, 0x78], and is therefore
 * restricted to messages which are a multiple of 2 bytes in length. It may 
 * also incorrectly process strings longer than 2^28 == 268 million characters.
 * 
 * These test vectors are given on the BLAKE NIST CD:
 *     ShortMsgKAT_224.txt ::
 *         Len = 0
 *         Msg = 00
 *         MD = 73BE7E1E0A7D0A2F0035EDAE62D4412EC43C0308145B5046849A53756BCDA44B
 *         ...
 *         Len = 16
 *         Msg = 41FB
 *         MD = EC6C0405BCD2CDF2B0A5D50637417E9FC51F6B63D962E80BAF752798A34A77D6
 *         ...
 *         Len = 512
 *         Msg = E926AE8B0AF6E53176DBFFCC2A6B88C6BD765F939D3D178A9BDE9EF3AA131C61E31C1E42CDFAF4B4DCDE579A37E150EFBEF5555B4C1CB40
 *         MD = 0999358A03F2D724B29FAFC967C0DCF7C9A9CDCD97F9CFA93D9DD6754EBE66F6
 *
 * The corresponding Javascript code is:
 *     blake32("")
 *         "73be7e1e0a7d0a2f0035edae62d4412ec43c0308145b5046849a53756bcda44b"
 *     blake32("\u41fb")
 *         "ec6c0405bcd2cdf2b0a5d50637417e9fc51f6b63d962e80baf752798a34a77d6"
 *     blake32("\ue926\uae8b\u0af6\ue531\u76db\uffcc\u2a6b\u88c6\ubd76\u5f93\u9d3d\u178a\u9bde\u9ef3\uaa13\u1c61\ue31c\u1e42\ucdfa\uf4b4\udcde\u579a\u37e1\u50ef\ubef5\u555b\u4c1c\ub404\u39d8\u35a7\u24e2\ufae7")
 *         "0999358a03f2d724b29fafc967c0dcf7c9a9cdcd97f9cfa93d9dd6754ebe66f6"
 *
 * This function was written by Chris Drost of drostie.org, and he hereby dedicates it into the 
 * public domain: it has no copyright. It is provided with NO WARRANTIES OF ANY KIND. 
 * I do humbly request that you provide me some sort of credit if you use it; but I leave that 
 * choice up to you.
 */

/*jslint white: true, onevar: true, undef: true, nomen: true, eqeqeq: true, plusplus: true, regexp: true, newcap: true, immed: true, strict: true */
"use strict";
var blake32 = (function () {
	var iv, g, r, block, constants, sigma, circ, state, message, output, two32;
	two32 = 4 * (1 << 30);
	iv = [
		0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
		0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
	];
	constants = [
		0x243F6A88, 0x85A308D3, 0x13198A2E, 0x03707344, 
		0xA4093822, 0x299F31D0, 0x082EFA98, 0xEC4E6C89, 
		0x452821E6, 0x38D01377, 0xBE5466CF, 0x34E90C6C, 
		0xC0AC29B7, 0xC97C50DD, 0x3F84D5B5, 0xB5470917
	];
	output = function (i) {
		if (i < 0) {
			i += two32;
		}
		return ("00000000" + i.toString(16)).slice(-8);
	};
	/* The spec calls for 2*i and 2 * i + 1 to be passed into the g function 
	 * simultaneously. This implementation splits this even-and-odd distinction
	 * in the source code itself: sigma.u[r][i] is the even coefficient and
	 * sigma.v[r][i] is the odd one. 
	 */
	sigma = {
		u: [
			[0, 2, 4, 6, 8, 10, 12, 14],   [14, 4, 9, 13, 1, 0, 11, 5], 
			[11, 12, 5, 15, 10, 3, 7, 9],  [7, 3, 13, 11, 2, 5, 4, 15], 
			[9, 5, 2, 10, 14, 11, 6, 3],   [2, 6, 0, 8, 4, 7, 15, 1], 
			[12, 1, 14, 4, 0, 6, 9, 8],    [13, 7, 12, 3, 5, 15, 8, 2], 
			[6, 14, 11, 0, 12, 13, 1, 10], [10, 8, 7, 1, 15, 9, 3, 13]
		], 
		v: [
			[1, 3, 5, 7, 9, 11, 13, 15],  [10, 8, 15, 6, 12, 2, 7, 3], 
			[8, 0, 2, 13, 14, 6, 1, 4],   [9, 1, 12, 14, 6, 10, 0, 8], 
			[0, 7, 4, 15, 1, 12, 8, 13],  [12, 10, 11, 3, 13, 5, 14, 9], 
			[5, 15, 13, 10, 7, 3, 2, 11], [11, 14, 1, 9, 0, 4, 6, 10], 
			[15, 9, 3, 8, 2, 7, 4, 5],    [2, 4, 6, 5, 11, 14, 12, 0]
		]
	};
	circ = function (a, b, n) {
		var s = state[a] ^ state[b];
		state[a] = (s >>> n) | (s << (32 - n));
	};
	g = function (i, a, b, c, d) {
		var u = block + sigma.u[r][i], v = block + sigma.v[r][i];
		state[a] += state[b] + (message[u] ^ constants[v % 16]);
		circ(d, a, 16);
		state[c] += state[d];
		circ(b, c, 12);
		state[a] += state[b] + (message[v] ^ constants[u % 16]);
		circ(d, a, 8);
		state[c] += state[d];
		circ(b, c, 7);
	};
	return function (msg, salt) {
		if (! (salt instanceof Array && salt.length === 4)) {
			salt = [0, 0, 0, 0];
		}
		var pad, chain, len, L, last_L, last, total, i; 
		chain = iv.slice(0);
		pad = constants.slice(0, 8);
		for (r = 0; r < 4; r += 1) {
			pad[r] ^= salt[r];
		}
		// pre-padding bit length of the string.
		len = msg.length * 16;
		last_L = (len % 512 > 446 || len % 512 === 0) ? 0 : len;
		// padding step: append a 1, then a bunch of 0's until we're at 447 bits,
		// then another 1 (note: 448/16 = 28), then len as a 64-bit integer.
		if (len % 512 === 432) {
			msg += "\u8001";
		} else {
			msg += "\u8000";
			while (msg.length % 32 !== 27) {
				msg += "\u0000";
			}
			msg += "\u0001";
		}
		message = [];
		for (i = 0; i < msg.length; i += 2) {
			message.push(msg.charCodeAt(i) * 65536 + msg.charCodeAt(i + 1));
		}
		message.push(0);
		message.push(len);
		last = message.length - 16;
		total = 0;
		for (block = 0; block < message.length; block += 16) {
			total += 512;
			L = (block === last) ? last_L : Math.min(len, total);
			state = chain.concat(pad);
			state[12] ^= L;
			state[13] ^= L;
			for (r = 0; r < 10; r += 1) {
				g(0, 0, 4,  8, 12);
				g(1, 1, 5,  9, 13);
				g(2, 2, 6, 10, 14);
				g(3, 3, 7, 11, 15);
				g(4, 0, 5, 10, 15);
				g(5, 1, 6, 11, 12);
				g(6, 2, 7,  8, 13);
				g(7, 3, 4,  9, 14);
			}
			for (i = 0; i < 8; i += 1) {
				chain[i] ^= salt[i % 4] ^ state[i] ^ state[i + 8];
			}
		}
		return chain.map(output).join("");
	};
}());