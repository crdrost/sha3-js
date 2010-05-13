/* shabal.js
 * A Javascript implementation of the SAPHIR Project's Shabal hash function.
 * 
 * This implementation currently operates on Javascript strings, interpreted  
 * with a UTF-16LE encoding ("\u1234\u5678" --> [0x34, 0x12, 0x78, 0x56]). It  
 * is therefore restricted to messages which are a multiple of 2 bytes in 
 * length. 
 * 
 * The Shabal NIST CD provides these test vectors:
 *     ShortMsgKAT_256.txt ::
 *         Len = 0
 *         Msg = 00
 *         MD = AEC750D11FEEE9F16271922FBAF5A9BE142F62019EF8D720F858940070889014
 *         [...]
 *         Len = 16
 *         Msg = 41FB
 *         MD = B956D01ABE2105DAD2C6B29896E14AFBEBD6F0AC750B64E9DCA508A8B94A86E4
 *         [...]
 *         Len = 2000
 *         Msg = B3C5E74B69933C2533106C563B4CA20238F2B6E675E8681E34A389894785BDADE59652D4A73D80A5C85BD454FD1E9FFDAD1C3815F5038E9EF432AAC5C3C4FE840CC370CF86580A6011778BBEDAF511A51B56D1A2EB68394AA299E26DA9ADA6A2F39B9FAFF7FBA457689B9C1A577B2A1E505FDF75C7A0A64B1DF81B3A356001BF0DF4E02A1FC59F651C9D585EC6224BB279C6BEBA2966E8882D68376081B987468E7AED1EF90EBD090AE825795CDCA1B4F09A979C8DFC21A48D8A53CDBB26C4DB547FC06EFE2F9850EDD2685A4661CB4911F165D4B63EF25B87D0A96D3DFF6AB0758999AAD214D07BD4F133A6734FDE445FE474711B69A98F7E2B
 *         MD = F111B50C6B39E6F3ACD32FED4E6675D675605FE3B928B7B248DD1AC1268EBB56
 * 
 * The corresponding Javascript code is:
 *     shabal("");
 *         "aec750d11feee9f16271922fbaf5a9be142f62019ef8d720f858940070889014"
 *     shabal("\ufb41");
 *         "b956d01abe2105dad2c6b29896e14afbebd6f0ac750b64e9dca508a8b94a86e4"
 *     shabal("\uc5b3\u4be7\u9369\u253c\u1033\u566c\u4c3b\u02a2\uf238\ue6b6\ue875\u1e68\ua334\u8989\u8547\uadbd\u96e5\ud452\u3da7\ua580\u5bc8\u54d4\u1efd\ufd9f\u1cad\u1538\u03f5\u9e8e\u32f4\uc5aa\uc4c3\u84fe\uc30c\ucf70\u5886\u600a\u7711\ube8b\uf5da\ua511\u561b\ua2d1\u68eb\u4a39\u99a2\u6de2\uada9\ua2a6\u9bf3\uaf9f\ufbf7\u57a4\u9b68\u1a9c\u7b57\u1e2a\u5f50\u75df\ua0c7\u4ba6\uf81d\u3a1b\u6035\ubf01\uf40d\u2ae0\uc51f\u659f\u9d1c\u5e58\u22c6\ub24b\uc679\ubabe\u6629\u88e8\u682d\u6037\ub981\u4687\u7a8e\u1eed\u0ef9\u09bd\ue80a\u7925\udc5c\ub4a1\u9af0\u9c97\ufc8d\ua421\u8a8d\ucd53\u26bb\udbc4\u7f54\u6ec0\u2ffe\u5098\ud2ed\u5a68\u6146\u49cb\uf111\ud465\u3eb6\u5bf2\ud087\u6da9\uff3d\ub06a\u8975\uaa99\u14d2\u7bd0\uf1d4\ua633\u4f73\u44de\ue45f\u7174\u691b\u8fa9\u2b7e");
 *         "f111b50c6b39e6f3acd32fed4e6675d675605fe3b928b7b248dd1ac1268ebb56"
 * 
 * This function was written by Chris Drost of drostie.org, and he hereby 
 * dedicates it into the public domain: it has no copyright. It is provided 
 * with NO WARRANTIES OF ANY KIND. 
 * 
 * I do humbly request that you provide me some sort of credit if you use it,
 * but by making it public-domain, I leave that choice strictly up to you.
 */

"use strict";
/*jslint bitwise: false, white: true, onevar: true, undef: true, nomen: true, eqeqeq: true, plusplus: true, regexp: true, newcap: true, immed: true, strict: true */

var shabal = (function () {
	var A, B, C, M, circ, shabal_f, ivA, ivB, ivC, z, hex, output_fn;
	circ = function (x, n) {
		return (x << n) + (x >>> (32 - n));
	};
	hex = function (n) {
		return ("00" + n.toString(16)).slice(-2);
	};
	output_fn = function (n) {
		return hex(n & 255) + hex(n >>> 8) + hex(n >>> 16) + hex(n >>> 24);
	};
	shabal_f = function (start, w0, w1) {
		var i, j, k;
		for (i = 0; i < 16; i += 1) {
			B[i] = circ(B[i] + M[start + i], 17);
		}
		A[0] ^= w0;
		A[1] ^= w1;
		for (j = 0; j < 3; j += 1) {
			for (i = 0; i < 16; i += 1) {
				k = (i + 16 * j) % 12;
				A[k] = 3 * (A[k] ^ 5 * circ(A[(k + 11) % 12], 15) ^ C[(24 - i) % 16]) ^
					B[(i + 13) % 16] ^ (B[(i + 9) % 16] & ~ B[(i + 6) % 16]) ^ M[start + i];
				B[i] = circ(B[i], 1) ^ ~ A[k];
			}
		}
		for (j = 0; j < 36; j += 1) {
			A[j % 12] += C[(j + 3) % 16];
		}
		for (i = 0; i < 16; i += 1) {
			C[i] -= M[start + i];
		}
		k = B; 
		B = C; 
		C = k;
	};
	B = []; 
	C = [];
	M = [];
	for (z = 0; z < 16; z += 1) {
		B[z] = C[z] = 0;
		M[z] = 256 + z;
		M[z + 16] = 272 + z;
	}
	A = B.slice(4);
	shabal_f(0, -1, -1);
	shabal_f(16, 0, 0);
	ivA = A;
	ivB = B;
	ivC = C;
	return function (msg) {
		var i, j = 0;
		// clone the IV.
		A = ivA.slice(0);
		B = ivB.slice(0);
		C = ivC.slice(0);
		// pad the message with a byte 0x80 and then bytes 0x00 until you have
		// an integer number of 512-bit blocks.
		msg += "\u0080";
		while (msg.length % 32) {
			msg += "\u0000";
		}
		// then push them into the M array as 
		M = [];
		for (i = 0; i < msg.length; i += 2) {
			M.push(msg.charCodeAt(i) + 65536 * msg.charCodeAt(i + 1));
		}
		for (i = 0; i < M.length; i += 16) {
			j += 1;
			shabal_f(i, j, 0);
		}
		i -= 16;
		shabal_f(i, j, 0);
		shabal_f(i, j, 0);
		shabal_f(i, j, 0);
		return C.slice(8, 16).map(output_fn).join("");
	};
}());