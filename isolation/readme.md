EQ80 isolation
===========

Emulating io.js and node in browser relies mainly on persistence sub-module and IFRAMEs.

Creating IFRAME, then sanitising the top-level window scope creates a context to run scripts
in virtual absence of the normal browser features. This isolation is soft by design, i.e. easy to break out of.

It is possible to implement hard, impenetrable isolation, for example by running code through interpreter,
but that was not the goal at this point. The goal is to allow running existing io.js/node code in EQ80.
Existing code does not know about EQ80 isolation, and does not try to break out of it.