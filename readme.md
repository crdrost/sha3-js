# SHA3 in JS

If you don't already know why Javascript or hash functions are important, I 
have provided a section called "Background for the Bewildered" below to explain
my aims a little bit better.

There are, at present, [14 different candidates][zoo] in NIST's SHA-3 
competition. This project aims to implement as many of them as is reasonably 
practical. Main goals include good compression under [/packer/][packer] and 
conformance with a decently strict [JSLint][jslint] check. For each algorithm, I
provide a minified implementation. (Occasionally, I provide two, if the 
specification provides another algorithm which is shorter, but not strictly a
part of the SHA3 contest for whatever reason -- right now, this includes Keccak
and Skein.)

Presently, the following six are implemented:

* [BLAKE][blake], by Aumasson, Henzen, Meier, and Phan
	* BLAKE-32 is supported in blake32.js and blake32.min.js
* [Blue Midnight Wish][bmw], by Gligoroski, Klima, Knapskog, El-Hadedy, Amundsen, and Mj&oslash;lsnes
	* BMW256 is supported in bmw.js and bmw.min.js
* [CubeHash][cubehash], by Dan Bernstein.
	* CubeHash16/64-256 is supported in cubehash.js and cubehash.min.js
* [Keccak][keccak], by Bertoni, Daemen, Peeters, and van Assche
	* The 64-bit SHA3-256 candidate Keccak[1088, 512, 32] is supported in keccak.js and keccak.min.js 
		as a "standards-compliant" version.
	* The 32-bit Keccak version Keccak[256, 544, 0] is supported in keccak32.js and keccak32.min.js 
		as my "shortest available implementation" version.
* [Shabal][shabal], by Bresson, Canteaut, Chevalier-Mames, Clavier, Fuhr, Gouget, Icart, Misarsky, Plasencia, Paillier, Pornin, Reinhard, Thuillet, and Videau
	* Shabal-256 is supported in shabal.js and shabal.min.js. 
* [Skein][skein], by Bellare, Callas, Ferguson, Kohno, Lucks, Schneier, Walker, and Whiting
	* Skein-512-512 is supported in skein.js and skein.min.js for standards-compliance.
	* A 32-bit Skein-256-256 (non-compliant) version is supported in 
		halfskein.js and halfskein.min.js as a shorter algorithm.

They all have a similar API: each file defines a function which takes 
Javascript strings to lowercase hexadecimal hash outputs. The string is always
converted to either UTF-16LE or UTF-16BE bytes, whichever matches the 
algorithm's own byte conventions. This means that these functions *can* be fed
binary data, but only if it is an even number of bytes. I view this as 
preferable to requiring that the binary data be a valid UTF-8 string or other
such requirements. Some non-minified versions which take byte arrays as inputs
without this "even number of bytes" restriction are available in the source code 
of [my SHA-3 gadget][gadget].

Test vectors are provided in the source code to prove compliance wherever 
possible.

[keccak]: http://keccak.noekeon.org/ "Keccak Homepage"
[blake]: http://131002.net/blake/ "BLAKE Homepage"
[bmw]: http://www.q2s.ntnu.no/sha3_nist_competition/start "Blue Midnight Wish Homepage"
[skein]: http://www.skein-hash.info/ "Skein Homepage"
[cubehash]: http://cubehash.cr.yp.to/ "CubeHash Homepage"
[shabal]: http://www.shabal.com/ "Shabal Homepage"
[jslint]: http://www.jslint.com/ "Doug Crockford's JSLint"
[zoo]: http://ehash.iaik.tugraz.at/wiki/The_SHA-3_Zoo "The SHA-3 Zoo"
[packer]: http://dean.edwards.name/packer/ "Dean Edwards's /packer/"
[gadget]: http://code.drostie.org/sha3/ "A SHA-3 Gadget"

# Basics for the Bewildered

This section is designed to give cryptographers a rough overview of Javascript,
and web programmers a rough overview of hash functions and NIST's big SHA-3 
competition.

## Javascript

Javascript is a [frequently misunderstood][misunderstood] synthesis of Lisp 
ideas, C syntax, and an event model which makes all code automatically thread-
safe. It is used in databases ([1][couch]), web servers ([2][node]), browser 
add-ons ([3][firefox]), and most famously, in most of the web pages you have ever 
visited. It is the <i>de facto</i> language of the world-wide web. And as its 
implementations become faster, it is becoming even *more* prevalent out there.

Javascript is important because it's incredibly non-idiosyncratic. A Javascript
program can at times look functional and at times object-oriented; hashmaps can
effortlessly take on the status of objects, only to then become a communication
layer (via JSON) with server-side processes; iterative and recursive algorithms
are both expressed equally naturally. You sometimes see a little idiosyncrasy,
like <code>var self = this;</code>, but it's generally an exception rather than
a rule.

Unfortunately, much has been left out: and unlike Python and Java, the standard
libraries which a Javascript programmer depends on are especially limited. This
should not be too surprising, since, for example, you don't expect a Javascript
web application to access the local file system. Nonetheless, the limits are 
often restrictive. And that's the thrust of this project: Javascript does not 
have any native hash functions.

It is missing a bunch of other things, too. For example, Javascript has exactly
one number type: what you would probably call a "double". There are no 64-bit
long integers, and in fact there aren't technically any 32-bit integers -- 
although to "bridge the gap", Javascript *does* support 32-bit signed 
integer *operations* on those doubles, like bitwise XOR, so not all is lost; it
is straightforward, too, to build a 64-bit compatibility layer.

Javascript strings are natively UTF-16 encoded, with hacky use of a couple of
native functions [encodeURIComponent() and decodeURIComponent()] allowing fast
conversion to and from a UTF-8 representation. After some consideration, I've
decided that my functions should take strings as input and yield hex strings as
output, since that is the most common Javascript usage case for hash functions.
This has one important consequence: the functions will generally only handle 
messages which are an even multiple of 16 bits in length. All of the other
solutions I've considered were comparatively bad solutions.

Many javascript functions are "bookmarklets", which need to fit within a URL, 
and have to boil down to less than 2000 characters or so for Internet Explorer 
compatibility. (Other browsers aren't nearly so limited.) Thus, the question 
"what's the fewest number of characters that I can implement this function in?"
is indeed meaningful. Automated "minifiers" -- code compressors -- are now
commonplace for Javascript code, but the code should still be authored in such
a way as to get the most benefit out of such minification. The result is a sort
of metric for how "simple" an algorithm is on a 32-bit platform: shorter code
means a simpler algorithm.

On the other hand, I have tried to not overdo this minification. Javascript
allows certain code practices which are considered bad style, like writing
<code>if (a) b;</code> instead of <code>if (a) { b; }</code>, with the curly 
braces, or writing <code>i++</code> instead of <code>i += 1</code>. In order to 
ensure that these rules are applied fairly and consistently, this code is meant 
to pass [a JSLint check][jslint] with all of "The Good Parts" except for the 
ban on bitwise operations. Minified versions come directly from JSLinted 
versions, with most of the work done [automatically][packer], like removing 
comments, whitespace, and safely shortening variable names: but some work, like 
shortening method names and removing the <code>"use strict"; var </code> 
opening characters, still needs to be done by hand.  

I have also provided a simple function for benchmarking different hash 
functions, to ask the question of "which one is faster?" -- but keep in mind 
that:

1. there is probably a huge variation between browsers on such a simple matter,
2. browsers don't generally run performance-critical code, and
3. hash functions are not usually in the 20% of the code that takes 80% of the 
	time.

Still, those are the three most important design criteria for Javascript: 32-bit
operations, less than 2000 characters (ideally less than 1000), and fast. Speed
tests and shortest-implementation trials in Javascript allow us to compare the 
SHA-3 candidates on a totally new platform: it's rather like seeing an 8-bit 
hardware application, only this is a language which almost everybody on the 
planet is running when they visit a web site. Whether this will be valuable to 
the crypto community is something that I leave to them; but I think it's very
valuable to other web programmers like me.

[couch]: http://couchdb.apache.org/ "Apache CouchDB"
[node]: http://nodejs.org/ "Node.js"
[firefox]: https://addons.mozilla.org/firefox "Add-ons for Firefox"
[misunderstood]: http://www.crockford.com/javascript/javascript.html "Javascript: The World's Most Misunderstood Programming Language"
[jslint]: http://www.jslint.com/ "Doug Crockford's JSLint"
[packer]: http://dean.edwards.name/packer/ "Dean Edwards's /packer/"
[beautifier]: http://www.jsbeautifier.org/ "Online javascript beautifier"

## Hash Functions
A *hash function* is a deterministic data-scrambler: you give it data, and it 
gives you back a smallish number which your computer can use as a sort of 
"fingerprint" for that data. 

I want you to read that last paragraph again and let it sink in. Let me give a
trivial example: if you have ever sorted files by file size on your computer, 
then that's a simple example. You convert all of the files into numbers because
it's much easier to handle the smallish number than it is to handle reading the
whole file. The hash function is the process of turning a file into a small 
number.

With a good hash function, the idea is that no two strings, and no two files,
share the same fingerprint, unless they contain the exact same data. You can
thus verify a file's integrity by checking its fingerprints, as is done in the
BitTorrent protocol. Or, you can append a digital signature to an entire 
document by simply signing its fingerprints, as is done in SSL. 

Obviously, then, file size is not a "good" hash. While as a number it is nice
and small, many very different files will have the exact same file size. You 
see, there are two goals here: smallness and uniqueness. File size is good with
smallness, but not good with uniqueness. If you didn't have the requirement of 
"smallness", the file contents could be used directly (remember, everything in
a computer is ultimately 1s and 0s: a binary number). If you didn't have the
requirement of uniqueness, then you might use file size or the truncated first
bytes of the file. It is when the two requirements come together that this 
becomes an interesting problem.

It is *mathematically impossible* to provide an absolute guarantee of both goals 
at the same time, because the set of files that you might want to hash is much,
much bigger than the set of "smallish numbers". The exact sizes of these sets
vary, but that point remains the same. So, we need a cryptographical approach.

The goal of a *cryptographic* hash function is to make a fingerprinting method 
which is "good enough": it should be *extremely hard* to find two files with the 
same fingerprint, without the fingerprints being too long to handle. You can see
that this is not an absolute guarantee, but it suffices for practical purposes.

This goal inspires several design criteria for a cryptographic hash function. 
If the hash function turns strings of bits into numbers, then you might desire
many of the following criteria:

1. Given a number, you should not be able to find a string which hashes to that 
	number. (A "first preimage".)
2. Given a string, and its hash, you should not be able to find another string 
	which has that same hash. (A "second preimage".)
3. You should not be able to construct two different strings with the same hash.
	(A "collision".)
4. If two strings do end up having the same fingerprint, you should not be able 
	to modify both of them to get another such collision. ("Differences" or
	"extensions".)
5. Any change in the input string should propagate to a potential change in the 
	entire output string. ("Diffusion".)
6. The output of the hash function should be hard to distinguish from a perfect 
	random number generator, except that whenever you give it the same input
	it gives you the same output number. ("Distinguishers" and 
	"indifferentiability".)

These are arranged roughly from weakest criteria to strongest: for example, if 
you can succeed at attacking criterion #2, then you automatically have an attack
on criteria #3 and #4, but there is no guarantee of the reverse. So, #4, #5, and 
 #6 are the most restrictive, whereas #1 is "the bare minimum." Accordingly, the 
first breaks typically come on criteria #5 and #6, and then they become stronger 
and stronger as more cryptanalysts apply their bright minds to the hash 
function's internal structure. 

Again, I must stress that absolute perfection is impossible, and it's tied to
the size of the output numbers and how "small" they are. If they are 128 bits
long, for example, then even your best hash function will fail if someone can
do 2<sup>64</sup> operations using it. (The 2<sup>N/2</sup> standard for an 
N-bit hash function is a pretty common expectation for its security; it comes 
from an attack on criterion #3 above, called the "birthday attack.") So
we should ask, "when we want our algorithm to be *good enough*, how many
operations is *good enough*?" 

As of early 2010, the [top supercomputers in the world][top500] can manage a
bit over 2<sup>50</sup> floating-point operations per second, or around 
2<sup>75</sup> operations per year. And they're only getting faster, by about 
one bit per year: so next year, expect 2<sup>76</sup>, and the year after that 
2<sup>77</sup>, and so on. Eventually, we will probably either hit a physical 
barrier or else a technological singularity, but if the status quo is 
maintained, then an ideal 256-bit hash function would protect you for at least 
the next 50 years -- and there is no way that your application will live that 
long in this digital age. Heck, the Web is only 20 years old or so.

So, most of my implementations will target a 256-bit output model.

[top500]: http://www.top500.org/ "Top 500 supercomputing sites"

## Overview of SHA-3

At the opening of the new millenium, it was discovered that our most-used hash 
functions fell ridiculously short of the six design criteria I've stated above. 
In the past few years, researchers published an active break on the SSL 
protocol: their attack used the weakness of the popular MD5 algorithm to enable 
them to "lift" a digital signature from one document to another, since SSL only 
signs the document's hash, not the whole document. (SSL certificates contain a 
little section saying how much you can trust them. When they "lifted" the 
signature, they made sure that their destination document was a certificate 
which said "you can trust me 100%" -- they used this to break *all of SSL*, and
not just one pithy website.)

MD5 is still used by some, but in real applications it has mostly been replaced
by an algorithm that the US National Security Administration published, called
SHA-1. Unfortunately, SHA-1 has now been pushed to a very uncomfortable level.
People are worried because the NSA's updated algorithms -- the SHA-2 algorithms 
(sha224, sha256, sha384, and sha512) -- have the same general structure as 
SHA-1 did. Security professionals want some new ideas.

The US government had done reasonably well when it last orchestrated a public
cryptographic competition: the block cipher that they created, AES, is now the
<i>de facto</i> standard for all secure information transmission online, as well 
as one of the popular options for hard-drive encryption. It has a couple of 
breaks at this point, especially on its 256-bit key version, but it's nothing 
too scary. The US agency NIST decided to organize a new contest, this time for a 
next-generation hash function. Though it will have nothing to do with either 
SHA-1 or SHA-2, they have insisted on the confusing and unimaginative name 
"SHA-3". We can only hope that they change their minds before the contest is 
over. It is bad enough that nobody calls the SHA-2 algorithms by the name
"SHA-2;" we do not need to make it worse. 

The fantastic success of their last competition was not forgotten: they 
received some 60-something contest entries, many of which had pretty bad flaws 
hiding beneath the surface. To give the researchers a smaller target group to 
focus more heavily on, they reduced it to just 14 candidates. The contest is 
not over yet, but these 14 candidates are all pretty serious contenders, and
everyone wants to poke holes in everyone else's submissions.

It's an exciting playing field. I hope that they choose an algorithm which will
port better to Javascript than sha256 does.

