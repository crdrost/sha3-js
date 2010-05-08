/* keccak32.js
 * Implements keccak[256, 544, 0] truncated to 256 bits, acting on UTF-16LE 
 * strings. In order to prove conformance with the standard, I have played 
 * around with the submitters' KeccakTools program to obtain the following test
 * vectors, all analogues of the ShortMsgKAT_256.txt tests that NIST requests:
 * 
 *     Length: 0
 *     Message:
 *     Hash: 775e75101d7b5ed8145ad59eb8fd2522a3478c5c4a4f0443dfefab049909102b
 *     
 *     Length: 16
 *     Message: 41fb
 *     Hash: a224469e2030ef166ed0d3959c26e79e6cb50cabf3a90a5bbba2501ad8a2d7c3
 *     
 *     Length: 2000
 *     Message: b3c5e74b69933c2533106c563b4ca20238f2b6e675e8681e34a389894785bdade59652d4a73d80a5c85bd454fd1e9ffdad1c3815f5038e9ef432aac5c3c4fe840cc370cf86580a6011778bbedaf511a51b56d1a2eb68394aa299e26da9ada6a2f39b9faff7fba457689b9c1a577b2a1e505fdf75c7a0a64b1df81b3a356001bf0df4e02a1fc59f651c9d585ec6224bb279c6beba2966e8882d68376081b987468e7aed1ef90ebd090ae825795cdca1b4f09a979c8dfc21a48d8a53cdbb26c4db547fc06efe2f9850edd2685a4661cb4911f165d4b63ef25b87d0a96d3dff6ab0758999aad214d07bd4f133a6734fde445fe474711b69a98f7e2b
 *     Hash: f39724f7822db9e0affc48664597379501185cbfb4f56d3f7626b847ccf07072 
 *
 * Since this implementation is little-endian, the corresponding Javascript is:
 * 
 *     keccak32("");
 *         "775e75101d7b5ed8145ad59eb8fd2522a3478c5c4a4f0443dfefab049909102b"
 *     keccak32("\ufb41");
 *         "a224469e2030ef166ed0d3959c26e79e6cb50cabf3a90a5bbba2501ad8a2d7c3"
 *     keccak32("\uC5B3\u4BE7\u9369\u253C\u1033\u566C\u4C3B\u02A2\uF238\uE6B6\uE875\u1E68\uA334\u8989\u8547\uADBD\u96E5\uD452\u3DA7\uA580\u5BC8\u54D4\u1EFD\uFD9F\u1CAD\u1538\u03F5\u9E8E\u32F4\uC5AA\uC4C3\u84FE\uC30C\uCF70\u5886\u600A\u7711\uBE8B\uF5DA\uA511\u561B\uA2D1\u68EB\u4A39\u99A2\u6DE2\uADA9\uA2A6\u9BF3\uAF9F\uFBF7\u57A4\u9B68\u1A9C\u7B57\u1E2A\u5F50\u75DF\uA0C7\u4BA6\uF81D\u3A1B\u6035\uBF01\uF40D\u2AE0\uC51F\u659F\u9D1C\u5E58\u22C6\uB24B\uC679\uBABE\u6629\u88E8\u682D\u6037\uB981\u4687\u7A8E\u1EED\u0EF9\u09BD\uE80A\u7925\uDC5C\uB4A1\u9AF0\u9C97\uFC8D\uA421\u8A8D\uCD53\u26BB\uDBC4\u7F54\u6EC0\u2FFE\u5098\uD2ED\u5A68\u6146\u49CB\uF111\uD465\u3EB6\u5BF2\uD087\u6DA9\uFF3D\uB06A\u8975\uAA99\u14D2\u7BD0\uF1D4\uA633\u4F73\u44DE\uE45F\u7174\u691B\u8FA9\u2B7E");
 *         "f39724f7822db9e0affc48664597379501185cbfb4f56d3f7626b847ccf07072"
 * 
 * This function was written by Chris Drost of drostie.org, and he hereby dedicates it into the 
 * public domain: it has no copyright. It is provided with NO WARRANTIES OF ANY KIND. 
 * I do humbly request that you provide me some sort of credit if you use it; but I leave that 
 * choice up to you.
 */

/*jslint white: true, onevar: true, undef: true, nomen: true, eqeqeq: true, plusplus: true, regexp: true, newcap: true, immed: true, strict: true */
"use strict";
var keccak32 = (function () {
	var permute, RC, r, circ, hex, output_fn;
	permute = [0, 10, 20, 5, 15, 16, 1, 11, 21, 6, 7, 17, 2, 12, 22, 23, 8, 18, 3, 13, 14, 24, 9, 19, 4];
	RC = "1,8082,808a,80008000,808b,80000001,80008081,8009,8a,88,80008009,8000000a,8000808b,8b,8089,8003,8002,80,800a,8000000a,80008081,8080"
		.split(",").map(function (i) { 
			return parseInt(i, 16); 
		});
	r = [0, 1, 30, 28, 27, 4, 12, 6, 23, 20, 3, 10, 11, 25, 7, 9, 13, 15, 21, 8, 18, 2, 29, 24, 14];
	circ = function (s, n) {
		return (s << n) | (s >>> (32 - n));
	};
	hex = function (n) {
		return ("00" + n.toString(16)).slice(-2);
	};
	output_fn = function (n) {
		return hex(n & 255) + hex(n >>> 8) + hex(n >>> 16) + hex(n >>> 24);
	};
	return function (m) {
		var i, b, k, x, y, C, D, round, next, state;
		state = [];
		for (i = 0; i < 25; i += 1) {
			state[i] = 0;
		}
		C = [];
		D = [];
		next = [];
		m += "\u0001\u0120";
		while (m.length % 16 !== 0) {
			m += "\u0000";
		}
		for (b = 0; b < m.length; b += 16) {
			for (k = 0; k < 16; k += 2) {
				state[k / 2] ^= m.charCodeAt(b + k) + m.charCodeAt(b + k + 1) * 65536;
			}
			for (round = 0; round < 22; round += 1) {
				for (x = 0; x < 5; x += 1) {
					C[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20]; 
				}
				for (x = 0; x < 5; x += 1) {
					D[x] = C[(x + 4) % 5] ^ circ(C[(x + 1) % 5], 1);
				}
				for (i = 0; i < 25; i += 1) {
					next[permute[i]] = circ(state[i] ^ D[i % 5], r[i]);
				}
				for (x = 0; x < 5; x += 1) {
					for (y = 0; y < 25; y += 5) {
						state[y + x] = next[y + x] ^ ((~ next[y + (x + 1) % 5]) & (next[y + (x + 2) % 5]));
					}
				}
				state[0] ^= RC[round];
			}
		}
		return state.slice(0, 8).map(output_fn).join("");
	};
}());