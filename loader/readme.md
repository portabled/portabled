EQ80 loader
===========

The loading of an EQ80 page application is a process during which the browser's
session storage is feature-detected, then reconciled with DOM-based storage (i.e. HTML comment-based).

For a reasonable large app that happens simultaneously with page DOM loading itself.

In order to keep appearances during this loading process and initialisation, a separate UI is displayed.
This is done in an IFRAME, which is during the loading is kept covering full page.

This boot UI is app-specific, but it can use events from the loading process logic, to display progress bar
and/or some progress status messages (such as last loaded storage file).


Post-boot hand-off
---------------------

After loading is done, the UI normally needs to transition from a temporary boot display
to the normal working UI.

EQ80 provides a simple but perhaps good enough option for straightforward cases.
The real UI is loaded into an off-screen IFRAME (remember, boot UI is IFRAME too!),
then one IFAME is faded out whilst the other appears fading in. The fading animation is quick,
but makes it smooth and sufficiently professional.

The working UI will load, take time to initialise and report back to EQ80 when ready to transition.

This process means boot UI in its good up-to-date state transitions to the working UI
in good up-to-date fully rendered state.

Note that working UI may be loaded into its offscreeen IFRAME before loading finishes,
and do some of its own preparations whilst the page DOM keeps loading, session/offline state read.

The main concern to be aware of is to get the boot UI out quick, make it good
and avoid unstyled/complex content in the boot UI.