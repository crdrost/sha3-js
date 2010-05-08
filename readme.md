# SHA3 in JS

If you don't already know why Javascript or hash functions are important, I 
have provided a section called "Background for the Bewildered" below to explain
my aims a little bit better.

There are, at present, [14 different candidates][zoo] in NIST's SHA-3 
competition. This project aims to implement as many of them as is reasonably 
practical. Main goals include good compression under [/packer/][packer] and 
conformance with a decently strict [JSLint][jslint] check. For each algorithm, 
I provide a minified implementation. (Occasionally, I might provide two, if 
there is a shorter algorithm suggested by the spec but which is not totally
standards-compliant; e.g. Halfskein.)

Presently, the following four are implemented:

* [BLAKE][blake], by Aumasson, Henzen, Meier, and Phan
	* BLAKE-32 is supported in blake32.js
* [CubeHash][cubehash], by Dan Bernstein.
	* CubeHash16/64-256 is supported in cubehash.js and cubehash.min.js
* [Keccak][keccak], by Bertoni, Daemen, Peeters, and van Assche
	* Keccak-1600/224 is supported in keccak.js as a "standards-compliant" version.
	* A Keccak-800/256 version is supported in keccak32.js and keccak32.min.js 
		as my "shortest available implementation" candidate.
* [Skein][skein], by Bellare, Callas, Ferguson, Kohno, Lucks, Schneier, Walker, and Whiting
	* Skein-512-512 is supported in skein.js and skein.min.js
	* A 32-bit Skein-256-256 (non-compliant) version is supported in 
		halfskein.js and halfskein.min.js as shorter.

They all have a similar API: Javascript strings are interpreted with whichever 
UTF-16 encoding matches the algorithm's own byte conventions, and are hashed by
a simple function call. Test vectors are provided in the source code to prove
compliance wherever possible.

[keccak]: http://keccak.noekeon.org/ "Keccak Homepage"
[blake]: http://131002.net/blake/ "BLAKE Homepage"
[skein]: http://www.skein-hash.info/ "Skein Homepage"
[cubehash]: http://cubehash.cr.yp.to/ "CubeHash Homepage"
[jslint]: http://www.jslint.com/ "Doug Crockford's JSLint"
[zoo]: http://ehash.iaik.tugraz.at/wiki/The_SHA-3_Zoo "The SHA-3 Zoo"
[packer]: http://dean.edwards.name/packer/ "Dean Edwards's /packer/"

# Basics for the Bewildered

This section is designed to give cryptographers a rough overview of Javascript,
and web programmers a rough overview of hash functions and NIST's big SHA-3 
competition.

## Javascript

Javascript is a [frequently misunderstood][misunderstood] synthesis of Lisp 
ideas, C syntax, and an event model which makes all code automatically thread-
safe. It is used in databases ([1][couch]), web servers ([2][node]), browser 
add-ons [3][firefox], and most famously, in most of the web pages you have ever 
visited. It is the <i>de facto</i> language of the world-wide web. And as its 
implementations become faster, it is becoming even *more* prevalent out there.

Javascript is important because it's incredibly non-idiosyncratic. A Javascript
program can at times look functional and at times object-oriented; hashmaps can
effortlessly take on the status of objects, only to then become a communication
layer (via JSON) with server-side processes; iterative and recursive algorithms
are both expressed equally naturally.

Unfortunately, much has been left out: and unlike Python and Java, the standard
libraries which a Javascript programmer depends on are especially limited. This
should not be too surprising, since, for example, you don't expect a Javascript
web application to access the local file system. And that's the thrust of this
project: Javascript does not have any native hash functions.

It is missing a bunch of other things, too. For example, Javascript has exactly
one number type: what you would probably call a "double". It *does* have 32-bit 
integer operations on those doubles, like bitwise XORs, so not all is lost; it
is straightforward, too, to build a 64-bit compatibility layer.

Javascript strings are natively UTF-16 encoded, with hacky use of a couple of
native functions [encodeURIComponent() and decodeURIComponent()] allowing fast
conversion to and from a UTF-8 representation. After some consideration, I've
decided that my functions should take strings as input and yield hex strings as
output, since that is the most common Javascript usage case for hash functions.
This has one important consequence: the functions will generally only handle 
messages which are an even multiple of 16 bits in length. (All of the other
solutions I've considered were comparatively bad solutions.)

Many javascript functions are "bookmarklets", designed to fit within a URL, and
have to boil down to less than 2000 characters or so for Internet Explorer 
compatibility. (Other browsers aren't nearly so limited.) Thus, the question 
"what's the fewest number of characters that I can implement this function in?"
is indeed meaningful. I have also provided a simple function for benchmarking
different hash functions, to ask the question of "which one is faster?" -- but
keep in mind that there is probably a huge variation between browsers on such a
simple matter. 

Those are the three most important design criteria for Javascript: 32-bit
operations, less than 2000 characters (ideally less than 1000), and fast. Speed
tests and shortest-implementation trials in Javascript allow us to compare the 
SHA-3 candidates on a totally new platform: it's rather like seeing an 8-bit 
hardware application, only this is a language which almost everybody on the 
planet is running when they visit a web site. Whether this will be valuable to 
the crypto community is something that I leave to them; but I think it's very
valuable to other web programmers like me.


[couch] http://couchdb.apache.org/ "Apache CouchDB"
[node] http://nodejs.org/ "Node.js"
[firefox] https://addons.mozilla.org/firefox "Add-ons for Firefox"
[misunderstood] http://www.crockford.com/javascript/javascript.html "Javascript: The World's Most Misunderstood Programming Language"

## Hash Functions
A *hash function* is a deterministic data-scrambler: you give it data, and it 
gives you back a smallish number which your computer can use as a sort of 
"fingerprint" for that data. 

I want you to read that last paragraph again and let it sink in. Let me give a
trivial example: if you have ever sorted files by file size on your computer, 
then that's a simple example. You convert all of the files into numbers because
it's much easier to handle the smallish number than it is to handle reading the
whole file.

With a good hash function, the idea is that no two strings, and no two files,
share the same fingerprint, unless they contain the exact same data. You can
thus verify a file's integrity by checking its fingerprint, as is done in the
BitTorrent protocol. Or, you can sign an entire document by simply signing its
fingerprint, as is done in SSL.

Obviously, then, file size is not a "good" hash. While as a number it is nice
and small, many very different files will have the exact same file size.

It is *mathematically impossible* to guarantee both of the above goals at the 
same time. If the number is "smallish", then fingerprints will have duplicates.
The goal of a *cryptographic* hash function is to make a fingerprinting method 
which is "good enough": it should be *hard* to find two files with the same 
fingerprint.

This goal inspires several design criteria for a cryptographic hash function. For example:

1. Given a number, you should not be able to find a string which hashes to that number.
2. Given a string, and its hash, you should not be able to find another string which has that same hash.
3. You should not be able to construct two different strings with the same hash.
4. Any little difference in the string should change the whole fingerprint drastically.
5. If two strings do end up having the same fingerprint, you should not be able to modify both of them to get another such collision.
6. The output of the hash function should be hard to distinguish from a perfect random number generator, except that whenever you give it the same string it gives you the same number.

These are arranged roughly from weakest criteria to strongest: for example, if 
you can succeed at #2 by turning a number back into a string (a "first preimage 
attack"), then you can succeed at #3 by just hashing whatever string you want,
and then looking for a preimage -- if your input string is bigger than the hash
function output, then there is a very good chance that you will get a different
string from the one you started with. In turn, this breaks #4, since you now 
have a rather massive difference between two strings which doesn't change the 
fingerprint at all. 

Again, I must stress that absolute perfection is impossible: even your best 
128-bit hash function falls short of these criteria if someone can do 2^64 
operations using it. 

As of early 2010, the [top supercomputers in the world][top500] can manage a
bit over 2^50 operations per second, or around 2^75 operations per year. And
they're only getting faster, by about one bit per year: so next year, expect
2^76, and the year after that 2^77, and so on. A good 256-bit hash function
should therefore protect you for at least the next 50 years -- and there is
no way that your application will live that long in this digital age. ;-D

[top500]: http://www.top500.org/ "Top 500 supercomputing sites"

## Overview of SHA-3

At the opening of the new millenium, it was discovered that our most-used hash 
functions fell ridiculously short of these standards. Soon after, researchers
published an active break on the SSL protocol: their attack used the weakness
of the popular MD5 algorithm to enable them to "lift" a digital signature from
one document to another, since SSL only signs the document's hash, not the 
whole document. The even-more-popular sha1 has been pushed to an uncomfortable
level already. People are worried because the NSA's updated algorithms -- the
SHA-2 algorithms (sha224, sha256, sha384, and sha512) -- have the same general 
structure as sha1 did. 

The US government had done reasonably well when it last orchestrated a public
cryptographic competition: the block cipher that they created, AES, is now the
de facto standard for all secure information transmission online, as well as
one of the popular options for hard-drive encryption. It has a couple of breaks
at this point, but nothing too scary. The US agency NIST decided to organize a 
new contest, this time for a next-generation hash function. Though it will have
nothing to do with either SHA-1 or SHA-2, they have insisted on the confusing 
and unimaginative name "SHA-3". We can only hope that they change their minds 
before the contest is over. 

The fantastic success of their last competition was not unforgotten: they 
received some 60-something contest entries, many of which had pretty bad flaws 
hiding beneath the surface. To give the researchers a smaller target group to 
focus more heavily on, they reduced it to just 14 candidates. The contest is 
not over yet, but these 14 candidates are all pretty serious contenders, and
everyone wants to poke holes in everyone else's submissions.
