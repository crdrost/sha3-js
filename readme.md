# SHA3 in JS

## Overview of Hash Functions
A *hash function* is a deterministic data-scrambler: you give it data, and it 
gives you back a smallish number which your computer can use as a sort of 
"fingerprint" for that data. The idea is that no two strings, and no two files,
share the same fingerprint, unless they contain the exact same data. You can
thus verify a file's integrity by checking its fingerprint, as is done in the
BitTorrent protocol. Or, you can sign an entire document by simply signing its
fingerprint, as is done in SSL.

It is mathematically impossible to guarantee both of these goals at the same
time. If the number is "smallish", then fingerprints will have duplicates. The 
goal of a *cryptographic* hash function is to make a fingerprinting method 
which is "good enough": it should be *hard* to find two files with the same 
fingerprint.

There are thus several design criteria for a cryptographic hash function. For example:

1. Given a number, you should not be able to find a file which hashes to that number.
2. Given a file, and its hash, you should not be able to find another file which hashes to that same number.
3. You should not be able to construct two different files with the same hash.
4. Any little difference in F should change the whole fingerprint drastically.
5. If F and G have the same fingerprint, you should not be able to modify both of them to get another such collision.
6. The output of the hash function should be hard to distinguish from a perfect random number generator, except that whenever you give it the same file it gives you the same number.

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
one of the popular options for hard-drive encryption. It decided to organize
a new contest, this time for a next-generation hash function. Though it will
have nothing to do with either SHA-1 or SHA-2, they have insisted on the 
confusing and unimaginative name "SHA-3". We can only hope that they change
their minds before the contest is over. 

The fantastic success of their last competition was not unforgotten: they 
received some 60-something contest entries, many of which had pretty bad flaws 
hiding beneath the surface. To give the researchers a smaller target group to 
focus more heavily on, they reduced it to around 14 candidates. The contest is 
not over yet, but these 14 candidates are all pretty serious contenders.

# How this fits in

Javascript has no built-in hash functions. It doesn't have built-in 64-bit 
integers, or even unsigned 32-bit arithmetic, much less memory-mapping 
functions. Many javascript functions are "bookmarklets", designed to fit 
within a URL, and have to boil down to less than 2000 characters or so for
Internet Explorer compatibility. (Other browsers aren't nearly so limited.)

Javascript sometimes needs hash functions, but it doesn't have any. Speed tests
and shortest-implementation trials in Javascript allow us to compare the SHA-3 
candidates in a totally new way. Whether this will be valuable to the crypto
community is something that I leave to people who know crypto better than I do.
But this is probably valuable to web programmers like me. :-D

This is intended to be an implementation for several SHA-3 candidates in pure 
Javascript. It is intended to be public-domain, fast, readable, and yet to 
compress reasonably well under JSMin or Dean Edwards's /packer/. I hope to 
support at least these three algorithms:

* CubeHash16/32-224, with extra output sizes available,
* HalfSkein -- a tweak version of Skein using 32-bit integers instead of 64-bit.
    * Possibly full Skein with an abstraction layer for the state numbers.
* Keccak

The other 11 I am holding off on right now, since I don't know so much about 
them just yet.





