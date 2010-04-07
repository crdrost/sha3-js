/* cubehash.js
 * An implementation of DJB's public domain CubeHash algorithm in Javascript.
 * 
 * This implementation is presently doing Cubehash16/32-224, but the output size is easily tuned 
 * in the code. This implementation operates on Javascript strings, interpreted as UTF-16LE 
 * encoded (i.e. "\u1234\u5678" --> [0x34, 0x12, 0x78, 0x56], and thus restricted to be a 
 * multiple of 2 bytes in length. 
 * 
 * These test vectors are given on the CubeHash NIST CD:
 *     ShortMsgKAT_224.txt ::
 *         Len = 0
 *         Msg = 00
 *         MD = F9802AA6955F4B7CF3B0F5A378FA0C9F138E0809D250966879C873AB
 *         ...
 *         Len = 16
 *         Msg = 41FB
 *         MD = 63687E93C6A512C9F2E9689BB0CD4F0196D45E4DE7CBE50C4402FA12
 *         ...
 *         Len = 512
 *         Msg = E926AE8B0AF6E53176DBFFCC2A6B88C6BD765F939D3D178A9BDE9EF3AA131C61E31C1E42CDFAF4B4DCDE579A37E150EFBEF5555B4C1CB40439D835A724E2FAE7
 *         MD = 06A2A08F2CA14CA233B98CB195C6FC284CE6EF026961CA2278178040
 * 
 * The corresponding Javascript code is:
 *     cubehash("")
 *         "f9802aa6955f4b7cf3b0f5a378fa0c9f138e0809d250966879c873ab"
 *     cubehash("\ufb41")
 *         "63687e93c6a512c9f2e9689bb0cd4f0196d45e4de7cbe50c4402fa12"
 *     cubehash("\u26e9\u8bae\uf60a\u31e5\udb76\uccff\u6b2a\uc688\u76bd\u935f\u3d9d\u8a17\ude9b\uf39e\u13aa\u611c\u1ce3\u421e\ufacd\ub4f4\udedc\u9a57\ue137\uef50\uf5be\u5b55\u1c4c\u04b4\ud839\ua735\ue224\ue7fa")
 *         "06a2a08f2ca14ca233b98cb195c6fc284ce6ef026961ca2278178040"
 */

var cubehash = (function () {
	var state, z, input, initial, out_length, h, o;
	out_length = 224;
	state = [
		out_length/8,32,16,0, 0,0,0,0,  0,0,0,0, 0,0,0,0,  
		0,0,0,0, 0,0,0,0,  0,0,0,0, 0,0,0,0
	];
	
	// output formatting function, giving the little-endian hex display of a number.
	o = function () {
		function h(n) {
			return ("00" + n.toString(16)).slice(-2);
		}
		return function (n) {
			return h(n & 255) + h(n >>> 8) + h(n >>> 16) + h(n >>> 24);
		};
	}();
	
	// We call the rounds function z and divide the CubeHash instructions within.
	z = (function () {
		var i, j, k, x, y;
		// plus and rotate steps. r + s == 32.
		function x(r, s) {
			for (i = 0; i < 16; i += 1) {
				state[16 + i] += state[i];
				state[i] = (state[i] << r) ^ (state[i] >>> s);
			}
		}
		// swap, xor, and swap steps.
		function y(mask1, mask2) {
			for (i = 0; i < 16; i += 1) {
				if (i & mask1) {
					j = i ^ mask1;
					tmp = state[i] ^ state[j + 16];
					state[i] = state[j] ^ state[i + 16];
					state[j] = tmp;
				}
			}
			for (i = 16; i < 32; i += 1) {
				if (i & mask2) {
					j = i ^ mask2;
					tmp = state[i];
					state[i] = state[j];
					state[j] = tmp;
				}
			}
		}
		return function (n) {
			n *= 16;
			for (r = 0; r < n; r += 1) {
				x(7, 25);
				y(8, 2);
				x(11, 21);
				y(4, 1);
			}
		};
	}());
	// we initialize the state and save it.
	z(10);
	initial = state.slice(0);
	
	return function (str) {
		var a, b;
		state = initial.slice(0);
		str += "\u0080";
		while (str.length % 16 > 0) {
			str += "\u0000";
		}
		input = [];
		for (a = 0; a < str.length; a += 2) {
			input.push(str.charCodeAt(a) + str.charCodeAt(a+1)*0x10000);
		}
		for (a = 0; a < input.length; a += 8) {
			for (b = 0; b < 8; b += 1) {
				state[b] ^= input[a+b];
			}
			z(1);
		}
		state[31] ^= 1;
		z(10);
		return state.map(o).join("").substring(0, out_length/4);
	};
}());