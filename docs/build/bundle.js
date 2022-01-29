
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function compute_slots(slots) {
        const result = {};
        for (const key in slots) {
            result[key] = true;
        }
        return result;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.2' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/common/GithubCorner.svelte generated by Svelte v3.46.2 */

    const file$4 = "src/common/GithubCorner.svelte";

    function create_fragment$4(ctx) {
    	let a;
    	let svg;
    	let path0;
    	let path1;
    	let path2;
    	let svg_class_value;

    	const block = {
    		c: function create() {
    			a = element("a");
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			attr_dev(path0, "class", "background");
    			attr_dev(path0, "d", "M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z");
    			add_location(path0, file$4, 17, 2, 460);
    			attr_dev(path1, "d", "M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2");
    			attr_dev(path1, "fill", "currentColor");
    			set_style(path1, "transform-origin", "130px 106px");
    			attr_dev(path1, "class", "octo-arm svelte-1rr76ng");
    			add_location(path1, file$4, 21, 2, 552);
    			attr_dev(path2, "d", "M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z");
    			attr_dev(path2, "fill", "currentColor");
    			attr_dev(path2, "class", "octo-body");
    			add_location(path2, file$4, 27, 2, 841);
    			attr_dev(svg, "width", "80");
    			attr_dev(svg, "height", "80");
    			attr_dev(svg, "viewBox", "0 0 250 250");
    			attr_dev(svg, "aria-hidden", "true");
    			set_style(svg, "fill", /*fill*/ ctx[1]);
    			attr_dev(svg, "class", svg_class_value = "" + (null_to_empty(/*classes*/ ctx[2]) + " svelte-1rr76ng"));
    			add_location(svg, file$4, 9, 1, 337);
    			attr_dev(a, "href", /*href*/ ctx[0]);
    			attr_dev(a, "target", "#");
    			attr_dev(a, "class", "github-corner svelte-1rr76ng");
    			attr_dev(a, "aria-label", "View source on GitHub");
    			add_location(a, file$4, 8, 0, 257);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, svg);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    			append_dev(svg, path2);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*fill*/ 2) {
    				set_style(svg, "fill", /*fill*/ ctx[1]);
    			}

    			if (dirty & /*classes*/ 4 && svg_class_value !== (svg_class_value = "" + (null_to_empty(/*classes*/ ctx[2]) + " svelte-1rr76ng"))) {
    				attr_dev(svg, "class", svg_class_value);
    			}

    			if (dirty & /*href*/ 1) {
    				attr_dev(a, "href", /*href*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let classes;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('GithubCorner', slots, []);
    	let { href } = $$props;
    	let { position = "topRight" } = $$props;
    	let { fill = "#ff2768" } = $$props;
    	let { small = false } = $$props;
    	const writable_props = ['href', 'position', 'fill', 'small'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<GithubCorner> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('href' in $$props) $$invalidate(0, href = $$props.href);
    		if ('position' in $$props) $$invalidate(3, position = $$props.position);
    		if ('fill' in $$props) $$invalidate(1, fill = $$props.fill);
    		if ('small' in $$props) $$invalidate(4, small = $$props.small);
    	};

    	$$self.$capture_state = () => ({ href, position, fill, small, classes });

    	$$self.$inject_state = $$props => {
    		if ('href' in $$props) $$invalidate(0, href = $$props.href);
    		if ('position' in $$props) $$invalidate(3, position = $$props.position);
    		if ('fill' in $$props) $$invalidate(1, fill = $$props.fill);
    		if ('small' in $$props) $$invalidate(4, small = $$props.small);
    		if ('classes' in $$props) $$invalidate(2, classes = $$props.classes);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*position, small*/ 24) {
    			$$invalidate(2, classes = `${position}${small ? " small" : ""}`);
    		}
    	};

    	return [href, fill, classes, position, small];
    }

    class GithubCorner extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { href: 0, position: 3, fill: 1, small: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "GithubCorner",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*href*/ ctx[0] === undefined && !('href' in props)) {
    			console.warn("<GithubCorner> was created without expected prop 'href'");
    		}
    	}

    	get href() {
    		throw new Error("<GithubCorner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set href(value) {
    		throw new Error("<GithubCorner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get position() {
    		throw new Error("<GithubCorner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set position(value) {
    		throw new Error("<GithubCorner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get fill() {
    		throw new Error("<GithubCorner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fill(value) {
    		throw new Error("<GithubCorner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get small() {
    		throw new Error("<GithubCorner>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set small(value) {
    		throw new Error("<GithubCorner>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    // Thanks https://stackoverflow.com/a/12646864 !!!
    function getRandomElement(arr) {
        return arr[getRandomInt(0, arr.length) % arr.length];
    }
    function getRandomInt(min, maxExclusive) {
        return min + Math.floor(Math.random() * maxExclusive);
    }
    // Thanks https://stackoverflow.com/a/4819886
    function isTouchDevice() {
        return (('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0));
    }

    /* node_modules/smelte/src/components/Icon/Icon.svelte generated by Svelte v3.46.2 */

    const file$3 = "node_modules/smelte/src/components/Icon/Icon.svelte";

    function create_fragment$3(ctx) {
    	let i;
    	let i_class_value;
    	let i_style_value;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[7].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[6], null);

    	const block = {
    		c: function create() {
    			i = element("i");
    			if (default_slot) default_slot.c();
    			attr_dev(i, "aria-hidden", "true");
    			attr_dev(i, "class", i_class_value = "material-icons icon text-xl select-none " + /*$$props*/ ctx[5].class + " duration-200 ease-in" + " svelte-1bygq4a");
    			attr_dev(i, "style", i_style_value = /*color*/ ctx[4] ? `color: ${/*color*/ ctx[4]}` : '');
    			toggle_class(i, "reverse", /*reverse*/ ctx[2]);
    			toggle_class(i, "tip", /*tip*/ ctx[3]);
    			toggle_class(i, "text-base", /*small*/ ctx[0]);
    			toggle_class(i, "text-xs", /*xs*/ ctx[1]);
    			add_location(i, file$3, 21, 0, 274);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, i, anchor);

    			if (default_slot) {
    				default_slot.m(i, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(i, "click", /*click_handler*/ ctx[8], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 64)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[6],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[6])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[6], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*$$props*/ 32 && i_class_value !== (i_class_value = "material-icons icon text-xl select-none " + /*$$props*/ ctx[5].class + " duration-200 ease-in" + " svelte-1bygq4a")) {
    				attr_dev(i, "class", i_class_value);
    			}

    			if (!current || dirty & /*color*/ 16 && i_style_value !== (i_style_value = /*color*/ ctx[4] ? `color: ${/*color*/ ctx[4]}` : '')) {
    				attr_dev(i, "style", i_style_value);
    			}

    			if (dirty & /*$$props, reverse*/ 36) {
    				toggle_class(i, "reverse", /*reverse*/ ctx[2]);
    			}

    			if (dirty & /*$$props, tip*/ 40) {
    				toggle_class(i, "tip", /*tip*/ ctx[3]);
    			}

    			if (dirty & /*$$props, small*/ 33) {
    				toggle_class(i, "text-base", /*small*/ ctx[0]);
    			}

    			if (dirty & /*$$props, xs*/ 34) {
    				toggle_class(i, "text-xs", /*xs*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Icon', slots, ['default']);
    	let { small = false } = $$props;
    	let { xs = false } = $$props;
    	let { reverse = false } = $$props;
    	let { tip = false } = $$props;
    	let { color = "default" } = $$props;

    	function click_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(5, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ('small' in $$new_props) $$invalidate(0, small = $$new_props.small);
    		if ('xs' in $$new_props) $$invalidate(1, xs = $$new_props.xs);
    		if ('reverse' in $$new_props) $$invalidate(2, reverse = $$new_props.reverse);
    		if ('tip' in $$new_props) $$invalidate(3, tip = $$new_props.tip);
    		if ('color' in $$new_props) $$invalidate(4, color = $$new_props.color);
    		if ('$$scope' in $$new_props) $$invalidate(6, $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => ({ small, xs, reverse, tip, color });

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(5, $$props = assign(assign({}, $$props), $$new_props));
    		if ('small' in $$props) $$invalidate(0, small = $$new_props.small);
    		if ('xs' in $$props) $$invalidate(1, xs = $$new_props.xs);
    		if ('reverse' in $$props) $$invalidate(2, reverse = $$new_props.reverse);
    		if ('tip' in $$props) $$invalidate(3, tip = $$new_props.tip);
    		if ('color' in $$props) $$invalidate(4, color = $$new_props.color);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [small, xs, reverse, tip, color, $$props, $$scope, slots, click_handler];
    }

    class Icon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			small: 0,
    			xs: 1,
    			reverse: 2,
    			tip: 3,
    			color: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Icon",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get small() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set small(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get xs() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set xs(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get reverse() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set reverse(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tip() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tip(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/common/Card.svelte generated by Svelte v3.46.2 */

    const file$2 = "src/common/Card.svelte";
    const get_body_slot_changes = dirty => ({});
    const get_body_slot_context = ctx => ({});
    const get_header_slot_changes = dirty => ({});
    const get_header_slot_context = ctx => ({});

    // (6:1) {#if $$slots.header}
    function create_if_block_1(ctx) {
    	let div;
    	let current;
    	const header_slot_template = /*#slots*/ ctx[3].header;
    	const header_slot = create_slot(header_slot_template, ctx, /*$$scope*/ ctx[2], get_header_slot_context);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (header_slot) header_slot.c();
    			attr_dev(div, "class", "header svelte-4ugsi9");
    			add_location(div, file$2, 6, 2, 175);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (header_slot) {
    				header_slot.m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (header_slot) {
    				if (header_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot_base(
    						header_slot,
    						header_slot_template,
    						ctx,
    						/*$$scope*/ ctx[2],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[2])
    						: get_slot_changes(header_slot_template, /*$$scope*/ ctx[2], dirty, get_header_slot_changes),
    						get_header_slot_context
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (header_slot) header_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(6:1) {#if $$slots.header}",
    		ctx
    	});

    	return block;
    }

    // (12:1) {#if $$slots.body}
    function create_if_block$1(ctx) {
    	let div;
    	let current;
    	const body_slot_template = /*#slots*/ ctx[3].body;
    	const body_slot = create_slot(body_slot_template, ctx, /*$$scope*/ ctx[2], get_body_slot_context);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (body_slot) body_slot.c();
    			attr_dev(div, "class", "body");
    			add_location(div, file$2, 12, 2, 261);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (body_slot) {
    				body_slot.m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (body_slot) {
    				if (body_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot_base(
    						body_slot,
    						body_slot_template,
    						ctx,
    						/*$$scope*/ ctx[2],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[2])
    						: get_slot_changes(body_slot_template, /*$$scope*/ ctx[2], dirty, get_body_slot_changes),
    						get_body_slot_context
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(body_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(body_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (body_slot) body_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(12:1) {#if $$slots.body}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div;
    	let t;
    	let div_class_value;
    	let current;
    	let if_block0 = /*$$slots*/ ctx[1].header && create_if_block_1(ctx);
    	let if_block1 = /*$$slots*/ ctx[1].body && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block0) if_block0.c();
    			t = space();
    			if (if_block1) if_block1.c();
    			attr_dev(div, "class", div_class_value = "bg-gray-300 p-2 m-2 max-w-2xl ml-auto mr-auto rounded-lg " + /*clazz*/ ctx[0] + " svelte-4ugsi9");
    			add_location(div, file$2, 4, 0, 72);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block0) if_block0.m(div, null);
    			append_dev(div, t);
    			if (if_block1) if_block1.m(div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*$$slots*/ ctx[1].header) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*$$slots*/ 2) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div, t);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*$$slots*/ ctx[1].body) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*$$slots*/ 2) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block$1(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*clazz*/ 1 && div_class_value !== (div_class_value = "bg-gray-300 p-2 m-2 max-w-2xl ml-auto mr-auto rounded-lg " + /*clazz*/ ctx[0] + " svelte-4ugsi9")) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Card', slots, ['header','body']);
    	const $$slots = compute_slots(slots);
    	let { class: clazz = "" } = $$props;
    	const writable_props = ['class'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Card> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('class' in $$props) $$invalidate(0, clazz = $$props.class);
    		if ('$$scope' in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ clazz });

    	$$self.$inject_state = $$props => {
    		if ('clazz' in $$props) $$invalidate(0, clazz = $$props.clazz);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [clazz, $$slots, $$scope, slots];
    }

    class Card extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { class: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Card",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get class() {
    		throw new Error("<Card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/WordCard.svelte generated by Svelte v3.46.2 */
    const file$1 = "src/components/WordCard.svelte";

    // (17:3) <Icon>
    function create_default_slot(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("refresh");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(17:3) <Icon>",
    		ctx
    	});

    	return block;
    }

    // (12:1) 
    function create_header_slot(ctx) {
    	let h5;
    	let div;
    	let icon;
    	let t0;
    	let span;
    	let t1_value = /*word*/ ctx[0].value + "";
    	let t1;
    	let current;
    	let mounted;
    	let dispose;

    	icon = new Icon({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			h5 = element("h5");
    			div = element("div");
    			create_component(icon.$$.fragment);
    			t0 = space();
    			span = element("span");
    			t1 = text(t1_value);
    			attr_dev(div, "class", "refresh-button cursor-pointer svelte-1yyd3qf");
    			add_location(div, file$1, 12, 2, 378);
    			attr_dev(span, "class", "text-secondary-600 font-bold");
    			add_location(span, file$1, 18, 2, 506);
    			attr_dev(h5, "slot", "header");
    			attr_dev(h5, "class", "text-center relative");
    			add_location(h5, file$1, 11, 1, 328);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h5, anchor);
    			append_dev(h5, div);
    			mount_component(icon, div, null);
    			append_dev(h5, t0);
    			append_dev(h5, span);
    			append_dev(span, t1);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div, "click", /*click_handler*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			const icon_changes = {};

    			if (dirty & /*$$scope*/ 32) {
    				icon_changes.$$scope = { dirty, ctx };
    			}

    			icon.$set(icon_changes);
    			if ((!current || dirty & /*word*/ 1) && t1_value !== (t1_value = /*word*/ ctx[0].value + "")) set_data_dev(t1, t1_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h5);
    			destroy_component(icon);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_header_slot.name,
    		type: "slot",
    		source: "(12:1) ",
    		ctx
    	});

    	return block;
    }

    // (32:2) {#if link}
    function create_if_block(ctx) {
    	let div;
    	let a;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			a = element("a");
    			t = text("still curious?");
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "href", /*link*/ ctx[1]);
    			add_location(a, file$1, 33, 4, 878);
    			attr_dev(div, "class", "text-right");
    			add_location(div, file$1, 32, 3, 849);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, a);
    			append_dev(a, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*link*/ 2) {
    				attr_dev(a, "href", /*link*/ ctx[1]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(32:2) {#if link}",
    		ctx
    	});

    	return block;
    }

    // (22:1) 
    function create_body_slot(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let t0_value = /*word*/ ctx[0].translation + "";
    	let t0;
    	let t1;
    	let if_block = /*link*/ ctx[1] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			if (if_block) if_block.c();
    			attr_dev(div0, "class", "p-5 opacity-0 hover:opacity-100 word svelte-1yyd3qf");
    			toggle_class(div0, "always-show", /*isTouch*/ ctx[3]);
    			add_location(div0, file$1, 23, 3, 699);
    			attr_dev(div1, "class", "bg-black my-2 text-center cursor-pointer");
    			add_location(div1, file$1, 22, 2, 641);
    			attr_dev(div2, "slot", "body");
    			attr_dev(div2, "class", "p-5 pb-0 pt-3 text-gray-700 body-2");
    			add_location(div2, file$1, 21, 1, 578);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, t0);
    			append_dev(div2, t1);
    			if (if_block) if_block.m(div2, null);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*word*/ 1 && t0_value !== (t0_value = /*word*/ ctx[0].translation + "")) set_data_dev(t0, t0_value);

    			if (/*link*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div2, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_body_slot.name,
    		type: "slot",
    		source: "(22:1) ",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let card;
    	let current;

    	card = new Card({
    			props: {
    				$$slots: {
    					body: [create_body_slot],
    					header: [create_header_slot]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(card.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(card, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const card_changes = {};

    			if (dirty & /*$$scope, link, word*/ 35) {
    				card_changes.$$scope = { dirty, ctx };
    			}

    			card.$set(card_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(card.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(card.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(card, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('WordCard', slots, []);
    	let dispatch = createEventDispatcher();
    	let { word } = $$props;
    	let { link } = $$props;
    	let isTouch = isTouchDevice();
    	const writable_props = ['word', 'link'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<WordCard> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => dispatch("randomWord");

    	$$self.$$set = $$props => {
    		if ('word' in $$props) $$invalidate(0, word = $$props.word);
    		if ('link' in $$props) $$invalidate(1, link = $$props.link);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		Icon,
    		Card,
    		isTouchDevice,
    		word,
    		link,
    		isTouch
    	});

    	$$self.$inject_state = $$props => {
    		if ('dispatch' in $$props) $$invalidate(2, dispatch = $$props.dispatch);
    		if ('word' in $$props) $$invalidate(0, word = $$props.word);
    		if ('link' in $$props) $$invalidate(1, link = $$props.link);
    		if ('isTouch' in $$props) $$invalidate(3, isTouch = $$props.isTouch);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [word, link, dispatch, isTouch, click_handler];
    }

    class WordCard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { word: 0, link: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "WordCard",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*word*/ ctx[0] === undefined && !('word' in props)) {
    			console.warn("<WordCard> was created without expected prop 'word'");
    		}

    		if (/*link*/ ctx[1] === undefined && !('link' in props)) {
    			console.warn("<WordCard> was created without expected prop 'link'");
    		}
    	}

    	get word() {
    		throw new Error("<WordCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set word(value) {
    		throw new Error("<WordCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get link() {
    		throw new Error("<WordCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set link(value) {
    		throw new Error("<WordCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var DataJSON = [{name:"spanish",words:[{value:"persona",translation:"person",part_of_speech:"cognates"},{value:"familia",translation:"family",part_of_speech:"cognates"},{value:"aeropuerto",translation:"airport",part_of_speech:"cognates"},{value:"tren",translation:"train",part_of_speech:"cognates"},{value:"restaurant",translation:"restaurant",part_of_speech:"cognates"},{value:"universidad",translation:"university",part_of_speech:"cognates"},{value:"visitar",translation:"to visit",part_of_speech:"cognates"},{value:"necesario",translation:"necessary",part_of_speech:"cognates"},{value:"público",translation:"public",part_of_speech:"cognates"},{value:"minuto",translation:"minute",part_of_speech:"cognates"},{value:"acción",translation:"action",part_of_speech:"cognates"},{value:"nación",translation:"nation",part_of_speech:"cognates"},{value:"ficción",translation:"fiction",part_of_speech:"cognates"},{value:"¿Cómo?",translation:"How?",part_of_speech:"interrogatives"},{value:"¿Cuál?",translation:"Which?",part_of_speech:"interrogatives"},{value:"¿Cuándo?",translation:"When?",part_of_speech:"interrogatives"},{value:"¿Dónde?",translation:"Where?",part_of_speech:"interrogatives"},{value:"¿Por qué?",translation:"Why?",part_of_speech:"interrogatives"},{value:"¿Qué?",translation:"What?",part_of_speech:"interrogatives"},{value:"¿Quién?",translation:"Who?",part_of_speech:"interrogatives"},{value:"la casa",translation:"the house",part_of_speech:"nouns"},{value:"la mesa",translation:"the table",part_of_speech:"nouns"},{value:"la ventana",translation:"the window",part_of_speech:"nouns"},{value:"la silla",translation:"the chair",part_of_speech:"nouns"},{value:"la puerta",translation:"the door",part_of_speech:"nouns"},{value:"el reloj",translation:"the clock",part_of_speech:"nouns"},{value:"el piso",translation:"the floor",part_of_speech:"nouns"},{value:"la mujer",translation:"the woman",part_of_speech:"nouns"},{value:"el hombre",translation:"the man",part_of_speech:"nouns"},{value:"la niña",translation:"the girl",part_of_speech:"nouns"},{value:"el niño",translation:"the boy",part_of_speech:"nouns"},{value:"el gato (m)",translation:"the cat",part_of_speech:"nouns"},{value:"la gata (f)",translation:"the cat",part_of_speech:"nouns"},{value:"el perro (m)",translation:"the dog",part_of_speech:"nouns"},{value:"la perra (f)",translation:"the dog",part_of_speech:"nouns"},{value:"el pájaro",translation:"the bird",part_of_speech:"nouns"},{value:"el elefante",translation:"the elephant",part_of_speech:"nouns"},{value:"el coche",translation:"the car",part_of_speech:"nouns"},{value:"la calle",translation:"the street",part_of_speech:"nouns"},{value:"la tienda",translation:"the store",part_of_speech:"nouns"},{value:"la biblioteca",translation:"the library",part_of_speech:"nouns"},{value:"el libro",translation:"the book",part_of_speech:"nouns"},{value:"la playa",translation:"the beach",part_of_speech:"nouns"},{value:"la montaña",translation:"the mountain",part_of_speech:"nouns"},{value:"café",translation:"coffee",part_of_speech:"nouns"},{value:"té",translation:"tea",part_of_speech:"nouns"},{value:"vino",translation:"wine",part_of_speech:"nouns"},{value:"cerveza",translation:"beer",part_of_speech:"nouns"},{value:"leche",translation:"milk",part_of_speech:"nouns"},{value:"agua",translation:"water",part_of_speech:"nouns"},{value:"la iglesia",translation:"the church",part_of_speech:"nouns"},{value:"el museo",translation:"the museum",part_of_speech:"nouns"},{value:"la nariz",translation:"the nose",part_of_speech:"nouns"},{value:"los ojos",translation:"the eyes",part_of_speech:"nouns"},{value:"la boca",translation:"the mouth",part_of_speech:"nouns"},{value:"la cabeza",translation:"the head",part_of_speech:"nouns"},{value:"el brazo",translation:"the arm",part_of_speech:"nouns"},{value:"las piernas",translation:"the legs",part_of_speech:"nouns"},{value:"las manos",translation:"the hands",part_of_speech:"nouns"},{value:"los pies",translation:"the feet",part_of_speech:"nouns"},{value:"Buenos días.",translation:"Good morning.",part_of_speech:"phrases"},{value:"Buenas tardes.",translation:"Good afternoon.",part_of_speech:"phrases"},{value:"Buenas noches.",translation:"Goodnight.",part_of_speech:"phrases"},{value:"Hola.",translation:"Hello.",part_of_speech:"phrases"},{value:"¿Cómo estás?",translation:"How are you?",part_of_speech:"phrases"},{value:"¿Cómo está usted?",translation:"How are you?",part_of_speech:"phrases"},{value:"Bien, gracias.",translation:"Fine, thank you.",part_of_speech:"phrases"},{value:"¿Y usted?",translation:"And you?",part_of_speech:"phrases"},{value:"¿Cómo te llamas?",translation:"What’s your name?",part_of_speech:"phrases"},{value:"Me llamo…",translation:"My name is…",part_of_speech:"phrases"},{value:"Estoy buscando un restaurante.",translation:"I’m looking for a restaurant.",part_of_speech:"phrases"},{value:"Estoy buscando una parada de autobús.",translation:"I’m looking for a bus stop.",part_of_speech:"phrases"},{value:"Estoy buscando un hospital.",translation:"I’m looking for a hospital.",part_of_speech:"phrases"},{value:"Gracias.",translation:"Thank you.",part_of_speech:"phrases"},{value:"De nada.",translation:"You’re welcome.",part_of_speech:"phrases"},{value:"Perdóneme.",translation:"Excuse me.",part_of_speech:"phrases"},{value:"Lo siento.",translation:"I’m sorry.",part_of_speech:"phrases"},{value:"Hasta luego.",translation:"See you later.",part_of_speech:"phrases"},{value:"abrir",translation:"to open",part_of_speech:"verbs"},{value:"ayudar",translation:"to help",part_of_speech:"verbs"},{value:"bailar",translation:"to dance",part_of_speech:"verbs"},{value:"cambiar",translation:"to change",part_of_speech:"verbs"},{value:"caminar",translation:"to walk",part_of_speech:"verbs"},{value:"cantar",translation:"to sing",part_of_speech:"verbs"},{value:"comenzar",translation:"to begin",part_of_speech:"verbs"},{value:"contar",translation:"to count",part_of_speech:"verbs"},{value:"correr",translation:"to run",part_of_speech:"verbs"},{value:"creer",translation:"to believe",part_of_speech:"verbs"},{value:"dar",translation:"to give",part_of_speech:"verbs"},{value:"deber",translation:"to owe",part_of_speech:"verbs"},{value:"decir",translation:"to say",part_of_speech:"verbs"},{value:"entender",translation:"to understand",part_of_speech:"verbs"},{value:"estar",translation:"to be",part_of_speech:"verbs"},{value:"estudiar",translation:"to study",part_of_speech:"verbs"},{value:"gustar",translation:"to like",part_of_speech:"verbs"},{value:"haber",translation:"to have",part_of_speech:"verbs"},{value:"hablar",translation:"to speak",part_of_speech:"verbs"},{value:"ir",translation:"to go",part_of_speech:"verbs"},{value:"jugar",translation:"to play",part_of_speech:"verbs"},{value:"llamar",translation:"to call",part_of_speech:"verbs"},{value:"pagar",translation:"to pay",part_of_speech:"verbs"},{value:"partir",translation:"to leave",part_of_speech:"verbs"},{value:"pedir",translation:"to ask for",part_of_speech:"verbs"},{value:"poner",translation:"to put",part_of_speech:"verbs"},{value:"preguntar",translation:"to ask",part_of_speech:"verbs"},{value:"querer",translation:"to want",part_of_speech:"verbs"},{value:"saber",translation:"to know",part_of_speech:"verbs"},{value:"ser",translation:"to be",part_of_speech:"verbs"},{value:"tener",translation:"to have",part_of_speech:"verbs"},{value:"vivir",translation:"to live",part_of_speech:"verbs"}]}];

    /* src/App.svelte generated by Svelte v3.46.2 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let link0;
    	let link1;
    	let link2;
    	let t0;
    	let main;
    	let githubcorner;
    	let t1;
    	let wordcard;
    	let current;

    	githubcorner = new GithubCorner({
    			props: {
    				href: "https://github.com/loremdipso/learn_a_lang",
    				position: "topRight",
    				small: true
    			},
    			$$inline: true
    		});

    	wordcard = new WordCard({
    			props: {
    				word: /*word*/ ctx[0],
    				link: /*link*/ ctx[1]
    			},
    			$$inline: true
    		});

    	wordcard.$on("randomWord", /*randomWord_handler*/ ctx[3]);

    	const block = {
    		c: function create() {
    			link0 = element("link");
    			link1 = element("link");
    			link2 = element("link");
    			t0 = space();
    			main = element("main");
    			create_component(githubcorner.$$.fragment);
    			t1 = space();
    			create_component(wordcard.$$.fragment);
    			attr_dev(link0, "rel", "stylesheet");
    			attr_dev(link0, "href", "https://fonts.googleapis.com/icon?family=Material+Icons");
    			add_location(link0, file, 18, 1, 545);
    			attr_dev(link1, "rel", "stylesheet");
    			attr_dev(link1, "href", "https://fonts.googleapis.com/css?family=Roboto:300,400,500,600,700");
    			add_location(link1, file, 23, 1, 657);
    			attr_dev(link2, "rel", "stylesheet");
    			attr_dev(link2, "href", "https://fonts.googleapis.com/css?family=Roboto+Mono");
    			add_location(link2, file, 28, 1, 785);
    			attr_dev(main, "class", "pb-32 fade-in svelte-fkyd8f");
    			add_location(main, file, 34, 0, 891);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document.head, link0);
    			append_dev(document.head, link1);
    			append_dev(document.head, link2);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			mount_component(githubcorner, main, null);
    			insert_dev(target, t1, anchor);
    			mount_component(wordcard, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const wordcard_changes = {};
    			if (dirty & /*word*/ 1) wordcard_changes.word = /*word*/ ctx[0];
    			if (dirty & /*link*/ 2) wordcard_changes.link = /*link*/ ctx[1];
    			wordcard.$set(wordcard_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(githubcorner.$$.fragment, local);
    			transition_in(wordcard.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(githubcorner.$$.fragment, local);
    			transition_out(wordcard.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			detach_dev(link0);
    			detach_dev(link1);
    			detach_dev(link2);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			destroy_component(githubcorner);
    			if (detaching) detach_dev(t1);
    			destroy_component(wordcard, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let language = DataJSON[0];
    	let word;
    	let link = null;

    	function setRandomWord() {
    		$$invalidate(0, word = getRandomElement(language.words));

    		if (language.name.toLocaleLowerCase() === "spanish") {
    			$$invalidate(1, link = `https://www.spanishdict.com/phrases/${word.value}`);
    		}
    	}

    	setRandomWord();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const randomWord_handler = () => setRandomWord();

    	$$self.$capture_state = () => ({
    		GithubCorner,
    		getRandomElement,
    		WordCard,
    		DataJSON,
    		language,
    		word,
    		link,
    		setRandomWord
    	});

    	$$self.$inject_state = $$props => {
    		if ('language' in $$props) language = $$props.language;
    		if ('word' in $$props) $$invalidate(0, word = $$props.word);
    		if ('link' in $$props) $$invalidate(1, link = $$props.link);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [word, link, setRandomWord, randomWord_handler];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
        target: document.body,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
