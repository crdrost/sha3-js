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
	var iv, final, u, add_const, sc, fc, ec_s, ec_n, ec2_rot, hex, output_fn, compress, rot, s, fold;
	// output formatting function, giving the little-endian hex display of a number.
	hex = function (n) {
		return ("00" + n.toString(16)).slice(-2);
	};
	output_fn = function (n) {
		return hex(n & 255) + hex(n >>> 8) + hex(n >>> 16) + hex(n >>> 24);
	};
	// initial constants.
	iv = [];
	final = [];
	add_const = [];
	for (u = 0; u < 16; u += 1) {
		final[u] = 0xaaaaaaa0 + u;
		iv[u] = 0x40414243 + u * 0x04040404;
		add_const[u] = (u + 16) * 0x5555555;
	}
	rot = function (x, n) {
		return (x << n) + (x >>> (32 - n));
	};
	sc = [19, 23, 25, 29, 4, 8, 12, 15, 3, 2, 1, 2, 1, 1, 2, 2];

	// The BMW spec defines a suite of s_n(x) functions. I implement this as
	// one function s(x, n), with the constants sc[n]. 
	s = function (x, n) {
		return (n < 4) ? 
			rot(x, sc[n]) ^ rot(x, sc[n + 4]) ^ (x << sc[n + 8]) ^ (x >>> sc[n + 12]) :
			x ^ (x >>> n - 3); 
	};
	// In the "folding" step there is a set of erratic, irregular expressions,
	// which can mostly be reduced to a suite of 24 constants:
	fc = [21, 7, 5, 1, 3, 22, 4, 11, 24, 6, 22, 20, 3, 4, 7, 2, 5, 24, 21, 21, 16, 6, 22, 18];
	fold = function (x, n) {
		n = fc[n];
		return (n < 16) ? x >>> n : x << (n - 16);
	};
	// There are also some erratic expansion constants, which are defined here:
	ec_s = [29, 13, 27, 13, 25, 21, 18, 4, 5, 11, 17, 24, 19, 31, 5, 24];
	ec_n = [5, 7, 10, 13, 14];
	ec2_rot = [0, 3, 7, 13, 16, 19, 23, 27];

	// This is the BMW compression function: given a message block m and a  
	// chaining state H, it "expands" the two into the "quad-pipe" Q, and
	// then "folds" the result back into H. 
	compress = function (m, H) {
		var lo, hi, i, j, k, a, b, Q;
		Q = [];
		// first expansion phase: here `a` is W_i as mentioned in the spec.
		for (i = 0; i < 16; i += 1) {
			a = 0; 
			for (j = 0; j < 5; j += 1) {
				k = (i + ec_n[j]) % 16;
				b = H[k] ^ m[k];
				a += (ec_s[i] >> j) % 2 ? b : -b;
			}
			Q[i] = H[(i + 1) % 16] + s(a, i % 5);
		}
		// second expansion phase: two expand1 rounds and 14 expand2 rounds
		for (i = 0; i < 16; i += 1) {
			// both expand1 and expand2 start from this value for Q:
			a = (i + 3) % 16;
			b = (i + 10) % 16;
			Q[i + 16] = H[(i + 7) % 16] ^ (add_const[i] +
				rot(m[i], 1 + i) + 
				rot(m[a], 1 + a) -
				rot(m[b], 1 + b));
			// then they both add in f(Q[i]) for the 16 previous i's. 
			// we start k at 1 to make the indices for both functions go
			// like [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].
			for (k = 1; k < 17; k += 1) {
				// here `a` is the Q[i] to be transformed. We apply either the
				// expand1 functions:
				// [s1, s2, s3, s0, s1, s2, s3, s0, s1, s2, s3, s0, s1, s2, s3, s0]
				// or the expand2 functions:
				// [r0, r3, r0, r7, r0, r13, r0, r16, r0, r19, r0, r23, r0, r27, s4, s5]
				a = Q[i + k - 1];
				Q[i + 16] += (i < 2) ? s(a, k % 4) : // expand1
					(k > 14) ? s(a, k - 11) :        // expand2 s4 and s5
					(k % 2) ? a :                    // expand2 r0
					rot(a, ec2_rot[k / 2]);          // expand2 r**.
			}
		}
		
		// folding phase. We initialize the lo and hi diffusion variables.
		lo = hi = 0;
		for (i = 16; i < 24; i += 1) {
			lo ^= Q[i];
			hi ^= Q[i + 8];
		}
		hi ^= lo;
		// then we "fold" Q into H.
		for (i = 0; i < 16; i += 1) {
			H[i] = (i < 8) ? 
				(lo ^ Q[i] ^ Q[i + 24]) + (m[i] ^ fold(hi, i) ^ fold(Q[i + 16], i + 16)) : 
				(hi ^ m[i] ^ Q[i + 16]) + (Q[i] ^ fold(lo, i) ^ Q[16 + (i - 1) % 8]) + 
					rot(H[(i - 4) % 8], i + 1);
		}
		return H;
	};
	
	// The bmw() function.
	return function (msg) {
		var len, i, data, H;
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
			compress(data.slice(i, i + 16), H);
		}
		return compress(H, final.slice(0)).slice(8, 16).map(output_fn).join("");
	};
}());