/* cubehash.js
 * An implementation of DJB's public domain CubeHash algorithm in Javascript.
 * 
 * This implementation is presently doing Cubehash16/32-256, but the output size is easily tuned 
 * in the code. This implementation operates on Javascript strings, interpreted as UTF-16LE 
 * encoded (i.e. "\u1234\u5678" --> [0x34, 0x12, 0x78, 0x56], and thus restricted to be a 
 * multiple of 2 bytes in length. 
 * 
 * These test vectors are given on the CubeHash NIST CD:
 *     ShortMsgKAT_256.txt ::
 *         Len = 0
 *         Msg = 00
 *         MD = 44C6DE3AC6C73C391BF0906CB7482600EC06B216C7C54A2A8688A6A42676577D
 *         ...
 *         Len = 16
 *         Msg = 41FB
 *         MD = AD4A4242BD1D2385D72A46EAEAE3239BFA243829F0CF3640ED852D4F6609F7DF
 *         ...
 *         Len = 2000
 *         Msg = B3C5E74B69933C2533106C563B4CA20238F2B6E675E8681E34A389894785BDADE59652D4A73D80A5C85BD454FD1E9FFDAD1C3815F5038E9EF432AAC5C3C4FE840CC370CF86580A6011778BBEDAF511A51B56D1A2EB68394AA299E26DA9ADA6A2F39B9FAFF7FBA457689B9C1A577B2A1E505FDF75C7A0A64B1DF81B3A356001BF0DF4E02A1FC59F651C9D585EC6224BB279C6BEBA2966E8882D68376081B987468E7AED1EF90EBD090AE825795CDCA1B4F09A979C8DFC21A48D8A53CDBB26C4DB547FC06EFE2F9850EDD2685A4661CB4911F165D4B63EF25B87D0A96D3DFF6AB0758999AAD214D07BD4F133A6734FDE445FE474711B69A98F7E2B
 *         MD = A430ADEA39EEAA3FF63D4F3CBFF204DADD77E1601CEFD2A6B045437DDEDAA52B
 * 
 * The corresponding Javascript code is:
 *     cubehash("");
 *         "44c6de3ac6c73c391bf0906cb7482600ec06b216c7c54a2a8688a6a42676577d"
 *     cubehash("\ufb41");
 *         "ad4a4242bd1d2385d72a46eaeae3239bfa243829f0cf3640ed852d4f6609f7df"
 *     cubehash("\uC5B3\u4BE7\u9369\u253C\u1033\u566C\u4C3B\u02A2\uF238\uE6B6\uE875\u1E68\uA334\u8989\u8547\uADBD\u96E5\uD452\u3DA7\uA580\u5BC8\u54D4\u1EFD\uFD9F\u1CAD\u1538\u03F5\u9E8E\u32F4\uC5AA\uC4C3\u84FE\uC30C\uCF70\u5886\u600A\u7711\uBE8B\uF5DA\uA511\u561B\uA2D1\u68EB\u4A39\u99A2\u6DE2\uADA9\uA2A6\u9BF3\uAF9F\uFBF7\u57A4\u9B68\u1A9C\u7B57\u1E2A\u5F50\u75DF\uA0C7\u4BA6\uF81D\u3A1B\u6035\uBF01\uF40D\u2AE0\uC51F\u659F\u9D1C\u5E58\u22C6\uB24B\uC679\uBABE\u6629\u88E8\u682D\u6037\uB981\u4687\u7A8E\u1EED\u0EF9\u09BD\uE80A\u7925\uDC5C\uB4A1\u9AF0\u9C97\uFC8D\uA421\u8A8D\uCD53\u26BB\uDBC4\u7F54\u6EC0\u2FFE\u5098\uD2ED\u5A68\u6146\u49CB\uF111\uD465\u3EB6\u5BF2\uD087\u6DA9\uFF3D\uB06A\u8975\uAA99\u14D2\u7BD0\uF1D4\uA633\u4F73\u44DE\uE45F\u7174\u691B\u8FA9\u2B7E");
 *         "a430adea39eeaa3ff63d4f3cbff204dadd77e1601cefd2a6b045437ddedaa52b"
 *
 * This function was written by Chris Drost of drostie.org, and he hereby dedicates it into the 
 * public domain: it has no copyright. It is provided with NO WARRANTIES OF ANY KIND. 
 * I do humbly request that you provide me some sort of credit if you use it; but I leave that 
 * choice up to you.
 */

/*jslint white: true, onevar: true, undef: true, nomen: true, eqeqeq: true, plusplus: true, regexp: true, strict: true, newcap: true, immed: true */
"use strict";
var cubehash = (function () {
	var state, round, input, initial_state, out_length, tmp, i, j, r, plus_rotate, swap_xor_swap, hex, output_fn;
	out_length = 256;
	state = [
		out_length / 8, 32, 16, 0, 0, 0, 0, 0,
		0, 0, 0, 0, 0, 0, 0, 0,
		0, 0, 0, 0, 0, 0, 0, 0,
		0, 0, 0, 0, 0, 0, 0, 0
	];
	
	plus_rotate = function (r, s) {
		for (i = 0; i < 16; i += 1) {
			state[16 + i] += state[i];
			state[i] = (state[i] << r) ^ (state[i] >>> s);
		}
	};

		// swap, xor, and swap steps.
	swap_xor_swap = function (mask1, mask2) {
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
	};
	round = function (n) {
		n *= 16;
		for (r = 0; r < n; r += 1) {
			plus_rotate(7, 25);
			swap_xor_swap(8, 2);
			plus_rotate(11, 21);
			swap_xor_swap(4, 1);
		}
	};
	// we initialize the state and save it.
	round(10);
	initial_state = state.slice(0);
	
	// output formatting function, giving the little-endian hex display of a number.
	hex = function (n) {
		return ("00" + n.toString(16)).slice(-2);
	};
	output_fn = function (n) {
		return hex(n & 255) + hex(n >>> 8) + hex(n >>> 16) + hex(n >>> 24);
	};
	
	return function (str) {
		var block, i;
		state = initial_state.slice(0);
		str += "\u0080";
		while (str.length % 16 > 0) {
			str += "\u0000";
		}
		input = [];
		for (i = 0; i < str.length; i += 2) {
			input.push(str.charCodeAt(i) + str.charCodeAt(i + 1) * 0x10000);
		}
		for (block = 0; block < input.length; block += 8) {
			for (i = 0; i < 8; i += 1) {
				state[i] ^= input[block + i];
			}
			round(1);
		}
		state[31] ^= 1;
		round(10);
		return state.map(output_fn).join("").substring(0, out_length / 4);
	};
}());