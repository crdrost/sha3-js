/* bmw.js
 * A Javascript implementation of the Blue Midnight Wish hash function BMW256.
 *
 * This implementation currently operates on Javascript strings, interpreted  
 * with a UTF-16LE encoding ("\u1234\u5678" --> [0x34, 0x12, 0x78, 0x56]). It  
 * is therefore restricted to messages which are a multiple of 2 bytes in 
 * length. 
 * 
 * The Blue Midnight Wish NIST CD provides these test vectors:
 *     ShortMsgKAT_256.txt ::
 *         Len = 0
 *         Msg = 00
 *         MD = 82CAC4BF6F4C2B41FBCC0E0984E9D8B76D7662F8E1789CDFBD85682ACC55577A
 *         [...]
 *         Len = 16
 *         Msg = 41FB
 *         MD = 8F7A69E19A65F1148D02DE5E2BF784974E6CF3335CD2B2D07BC3B88463D2BE3C
 *         [...]
 *         Len = 2000
 *         Msg = B3C5E74B69933C2533106C563B4CA20238F2B6E675E8681E34A389894785BDADE59652D4A73D80A5C85BD454FD1E9FFDAD1C3815F5038E9EF432AAC5C3C4FE840CC370CF86580A6011778BBEDAF511A51B56D1A2EB68394AA299E26DA9ADA6A2F39B9FAFF7FBA457689B9C1A577B2A1E505FDF75C7A0A64B1DF81B3A356001BF0DF4E02A1FC59F651C9D585EC6224BB279C6BEBA2966E8882D68376081B987468E7AED1EF90EBD090AE825795CDCA1B4F09A979C8DFC21A48D8A53CDBB26C4DB547FC06EFE2F9850EDD2685A4661CB4911F165D4B63EF25B87D0A96D3DFF6AB0758999AAD214D07BD4F133A6734FDE445FE474711B69A98F7E2B
 *         MD = ED2C6CC9DDA413C9D992F6A538C14BC7CFF1E726E3493EC15BE12380E52701B8
 * 
 * The corresponding Javascript code is:
 *     bmw("");
 *         "82cac4bf6f4c2b41fbcc0e0984e9d8b76d7662f8e1789cdfbd85682acc55577a"
 *     bmw("\ufb41");
 *         "8f7a69e19a65f1148d02de5e2bf784974e6cf3335cd2b2d07bc3b88463d2be3c"
 *     bmw("\uc5b3\u4be7\u9369\u253c\u1033\u566c\u4c3b\u02a2\uf238\ue6b6\ue875\u1e68\ua334\u8989\u8547\uadbd\u96e5\ud452\u3da7\ua580\u5bc8\u54d4\u1efd\ufd9f\u1cad\u1538\u03f5\u9e8e\u32f4\uc5aa\uc4c3\u84fe\uc30c\ucf70\u5886\u600a\u7711\ube8b\uf5da\ua511\u561b\ua2d1\u68eb\u4a39\u99a2\u6de2\uada9\ua2a6\u9bf3\uaf9f\ufbf7\u57a4\u9b68\u1a9c\u7b57\u1e2a\u5f50\u75df\ua0c7\u4ba6\uf81d\u3a1b\u6035\ubf01\uf40d\u2ae0\uc51f\u659f\u9d1c\u5e58\u22c6\ub24b\uc679\ubabe\u6629\u88e8\u682d\u6037\ub981\u4687\u7a8e\u1eed\u0ef9\u09bd\ue80a\u7925\udc5c\ub4a1\u9af0\u9c97\ufc8d\ua421\u8a8d\ucd53\u26bb\udbc4\u7f54\u6ec0\u2ffe\u5098\ud2ed\u5a68\u6146\u49cb\uf111\ud465\u3eb6\u5bf2\ud087\u6da9\uff3d\ub06a\u8975\uaa99\u14d2\u7bd0\uf1d4\ua633\u4f73\u44de\ue45f\u7174\u691b\u8fa9\u2b7e");
 *         "ed2c6cc9dda413c9d992f6a538c14bc7cff1e726e3493ec15be12380e52701b8"
 * 
 * This function was written by Chris Drost of drostie.org, and he hereby 
 * dedicates it into the public domain: it has no copyright. It is provided 
 * with NO WARRANTIES OF ANY KIND. 
 * 
 * I do humbly request that you provide me some sort of credit if you use it,
 * but by making it public-domain, I leave that choice strictly up to you.
 */

"use strict";
/*jslint white: true, onevar: true, undef: true, nomen: true, eqeqeq: true, plusplus: true, bitwise: false, regexp: true, newcap: true, immed: true, strict: true */
var bmw = (function () {
	var hex, output_fn, compress, H, iv, final, u;
	// output formatting function, giving the little-endian hex display of a number.
	hex = function (n) {
		return ("00" + n.toString(16)).slice(-2);
	};
	output_fn = function (n) {
		return hex(n & 255) + hex(n >>> 8) + hex(n >>> 16) + hex(n >>> 24);
	};
	// initial constants.
	iv = [0x40414243];
	final = [0xaaaaaaa0];
	for (u = 0; u < 15; u += 1) {
		final.push(final[u] + 1);
		iv.push(iv[u] + 0x04040404);
	}
	// This compress function is sufficiently complicated that I've decided to give 
	// it its own dedicated constructor function and variable-space. 
	compress = (function () {
		var i, rot, fold, s, Q, expansion_constants_sign, expansion_constants_num, expand1_fns, expand2_fns;
		rot = function (x, n) {
			return (x << n) + (x >>> (32 - n));
		};
		// y and z are generic templates for s and the expansion functions.
		function y(n) {
			var m = 32 - n;
			return function (x) {
				return (x << n) ^ (x >>> m);
			};
		}
		function z(i, j, m, p) {
			var n = 32 - m,
				q = 32 - p;
			return (j === undefined) ?
			function (x) {
				return x ^ (x >>> i);
			} : function (x) {
				return (x >>> i) ^ (x << j) ^ (x << m) ^ (x >>> n) ^ (x << p) ^ (x >>> q);
			};
		}
		// I also define an identity function for the sake of exp2.
		function I(n) { 
			return n;
		}
		// The BMW spec defines five s-functions.
		s = [z(1, 3, 4, 19), z(1, 2, 8, 23), z(2, 1, 12, 25), z(2, 2, 15, 29), z(1), z(2)];
		
		// There are two sets of expansions, expand1() and expand2(), defined in the spec.
		// Since they both have a similar operation, we give them here a similar form, 
		// defining just the 16 functions that each uses on its arguments.
		
		// expand1_fns = [s1, s2, s3, s0, s1, s2, s3, s0, ...].
		expand1_fns = [];
		for (i = 0; i < 16; i += 1) {
			expand1_fns[i] = s[(i + 1) % 4];
		}
		expand2_fns = [I, y(3), I, y(7), I, y(13), I, y(16), I, y(19), I, y(23), I, y(27), s[4], s[5]];
		
		// u and v are templates for the fold[] functions. 
		function u(m, n, reverse) {
			return function (x, y) {
				return reverse ? (y >>> n) ^ (x << m) : (x >>> m) ^ (y << n);
			};
		}
		function v(m, reverse) {
			return function (x) {
				return reverse ? (x << m) : (x >>> m);
			};
		}
		// this array takes care of the part of the "folding" step that depends on i.
		fold = [
			u(5, 5, 1), u(7, 8), u(5, 5), u(1, 5), 
			u(3, 0), u(6, 6, 1), u(4, 6), u(11, 2), 
			v(8, 1), v(6), v(6, 1), v(4, 1), 
			v(3), v(4), v(7), v(2)
		];
		
		// the initial quad-expansion is actually very regular, except that it has 
		// a set of random minus signs thrown in.
		expansion_constants_sign = "+-+++,+-++-,++-++,+-++-,+--++,+-+-+,-+--+,--+--,+-+--,++-+-,+---+,---++,++--+,+++++,+-+--,---++"
			.split(",");
		expansion_constants_num = [5, 7, 10, 13, 14];
		return function (m) {
			var lo, hi, i, j, k, a, b;
			Q = [];
			for (i = 0; i < 16; i += 1) {
				a = 0; 
				for (j = 0; j < 5; j += 1) {
					k = (i + expansion_constants_num[j]) % 16;
					b = H[k] ^ m[k];
					a += expansion_constants_sign[i].charAt(j) === "+" ? b : -b;
				}
				Q[i] = H[(i + 1) % 16] + s[i % 5](a);
			}
			for (i = 16; i < 32; i += 1) {
				j = i - 16;
				a = (j + 3) % 16;
				b = (j + 10) % 16;
				Q[i] = H[(j + 7) % 16] ^ (i * 0x05555555 +
					rot(m[j], 1 + j) + 
					rot(m[a], 1 + a) -
					rot(m[b], 1 + b));
				for (k = 0; k < 16; k += 1) {
					Q[i] += (i < 18 ? expand1_fns : expand2_fns)[k](Q[j + k]);
				}
			}
			lo = hi = 0;
			for (i = 16; i < 24; i += 1) {
				lo ^= Q[i];
				hi ^= Q[i + 8];
			}
			hi ^= lo;
			
			for (i = 0; i < 16; i += 1) {
				H[i] = (i < 8) ? 
					(lo ^ Q[i] ^ Q[i + 24]) + (m[i] ^ fold[i](hi, Q[i + 16])) : 
					(hi ^ m[i] ^ Q[i + 16]) + (Q[i] ^ fold[i](lo) ^ Q[16 + (i - 1) % 8]) + 
						rot(H[(i - 4) % 8], i + 1);
			}
		};
	}()); // construct compress();
	
	// The bmw() function.
	return function (msg) {
		var len, i, data, temp;
		len = 16 * msg.length;
		msg += "\u0080";
		while (msg.length % 32 !== 28) {
			msg += "\u0000";
		}
		data = [];
		for (i = 0; i < msg.length; i += 2) {
			data.push(msg.charCodeAt(i) + 65536 * msg.charCodeAt(i + 1));
		}
		data.push(len);
		data.push(0);
		H = iv.slice(0);
		for (i = 0; i < data.length; i += 16) {
			compress(data.slice(i, i + 16));
		}
		temp = H;
		H = final.slice(0);
		compress(temp);
		return H.slice(8, 16).map(output_fn).join("");
	};
}());