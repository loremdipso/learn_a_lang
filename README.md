Simple language learning page. Given a list of words and their translations will present them to you flashcard-style. I use it in combination with [New Tab Override](https://addons.mozilla.org/en-US/firefox/addon/new-tab-override/) so I get a random word every time I open a new page.

By default this comes with some common Spanish words, but just replace `docs/spanish.json` with whatever you like. To do so, just update `data/` and run `scripts/build_data.rb`.

There's also `scripts/build_bundle.rb`, which attempts to bundle the final application into a single page. This would work, but the Default Content Security Policy disallows JS unless you explicitly enable it and then put its hash your `manifest.json` :/. So while the bundling does work I haven't found a use for it just yet.

Finally, if you append `?withSearchBar` to your url, then typing will open an input field that tries really hard to roughly correspond to your browser's omnibar. It's not ideal, but the best I can do without full browser support :\.
