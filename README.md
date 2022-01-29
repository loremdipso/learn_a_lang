Simple language learning page. Given a list of words and their translations will present them to you flashcard-style. I use it in combination with [New Tab Override](https://addons.mozilla.org/en-US/firefox/addon/new-tab-override/) so I get a random word every time I open a new page.

By default this comes with some common Spanish words, but just replace `docs/spanish.json` with whatever you like. To do so, just update `data/` and run `scripts/build_data.rb`.

There's also `scripts/build_bundle.rb`, which bundles the final application into a single page. Useful if you want to cache it in New Tab Override (dynamic local file access is disabled in Firefox for security).
