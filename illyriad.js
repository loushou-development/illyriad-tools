// ==UserScript==
// @name        HaxorOne's IllyTools
// @namespace   haxorone.illyriad.illytools
// @description Enables various tools for helping an Illyriad player inside the game.
// @version     0.9.0-beta
// @grant       none
// @author      HaxorOne
// ==/UserScript==
/* jshint -W097 */
'use strict';

try { ( function() {

// if there is no jQuery, bail now
if ( ! window.jQuery ) {
	console.log( 'jQuery is not present. Bailing' );
	return;
}

var HAX = window.HAX = $.extend( {}, window.HAX, { VERSION:'0.9.0' } );

/* Generic Required functionality */
( function( W, D, HAX ) {
	var H = 'hasOwnProperty';

	// generic tools
	HAX.H = H;
	HAX.is = function( v ) { return 'undefined' != typeof v && null !== v; };
	HAX.toInt = function(val) { var n = parseInt(val); return isNaN(n) ? 0 : n; };
	HAX.toFloat = function(val) { var n = parseFloat(val); return isNaN(n) ? 0 : n; };
	HAX.pl = function(n, p) { return HAX.toFloat(n).toFixed(p); };
	HAX.isString = function( v ) { return 'string' == typeof v; };
	HAX.log = function() { var args = [].slice.call( arguments ); args.unshift( 'HAX:' ); console.log.apply( console, args ); };
	HAX.isIlly = ( function() { return W.location.hostname.match( /illyriad/ ); } )();
	HAX.hasLocalStorage = ( function() { return !! W.localStorage; } )();

	// local storage wrapper
	HAX.LS = ( function() {
		function LS() {
			var T = this,
					LS = W.localStorage;
			T.ns = 'h1f-';

			// get the cache key from the cache element name
			T.k = function( name ) { return T.ns + name; };

			// function to fetch a value from local storage
			T.fetch = function( name, def ) { var def = HAX.is( def ) ? def : {}; return JSON.parse( LS.getItem( T.k( name ) ) ) || false; }

			// function to set a value in local storage
			T.store = function( name, val ) { return LS.setItem( T.k( name ), JSON.stringify( val ) ); }

			// remove an item from local storage
			T.purge = function( name ) { return LS.removeItem( T.k( name ) ); }
		}

		var instance;
		// get a new instance of the local storage wrapper
		LS.get_instance = function() {
			// if there is no instance yet, start one
			if ( ! HAX.is( instance ) )
				instance = new LS();

			return instance;
		};

		return LS.get_instance();
	} )();


	// a version comparison function
	HAX.version_compare = function( first, second ) {
		var prepareVersion = function( v ) { v = ( '' + v ).replace( /[\-\+_]/g, '.' ).replace( /([^\.\d]+)/, '.$1.' ).replace( /\.{2,}/, '.' ); return ! v.length ? [-8] : v.split( /\./ ); },
				vm = { 'dev': -6, 'alpha': -5, 'a': -5, 'beta': -4, 'b': -4, 'RC': -3, 'rc': -3, '#': -2, 'p': 1, 'pl': 1 },
				v2num = function( v ) { return ! v ? 0 : ( isNaN( v ) ? vm[ v ] || -7 : HAX.toInt( v ) ); },
				a_first = prepareVersion( first ),
				a_second = prepareVersion( second ),
				len = Math.max( a_first.length, a_second.length ),
				compare = 0, i;

		// cycle through the sections of the versions, and compare them
		for ( i = 0; i < len; i++ ) {
			// if the sections are the same, skip this section
			if ( a_first[ i ] == a_second[ i ] )
				continue;

			// normalize the section to a number
			a_first[ i ] = v2num( a_first[ i ] );
			a_second[ i ] = v2num( a_second[ i ] );

			// do the gt lt compare
			if ( a_first[ i ] < a_second[ i ] ) {
				compare = -1;
				break;
			} else if ( a_first[ i ] > a_second[ i ] ) {
				compare = 1;
				break;
			}
		}

		return compare;
	}

	// tool for fetching the XY map position of the current town
	HAX.town_pos = function() {
		// if the current town pos is available in the current scope, then use it
		if ( HAX.is( W[ 'townX' ] ) && HAX.is( W[ 'townY' ] ) )
			return { x:townX, y:townY };

		// if do not know the current town id, then we cannot do any other checks
		if ( ! HAX.is( W[ 'CurrentTown'] ) )
			return;

		var town_stats = HAX.LS.fetch( 'town-stats' );
		// otherwise try to look it up in our town stats list
		if ( HAX.is( town_stats[ 't' + CurrentTown ] ) && HAX.is( town_stats[ 't' + CurrentTown ].townX ) && HAX.is( town_stats[ 't' + CurrentTown ].townY ) )
			return { x:town_stats[ 't' + CurrentTown ].townX, y:town_stats[ 't' + CurrentTown ].townY };

		// otherwise, fail
		return;
	};

	// tool for measuring the distance from the current town to a specific map XY coordinate
	HAX.dist_cur_town = function( x, y ) {
		try {
			var town = HAX.town_pos(),
					dist_x = ( town.x - HAX.toInt( x ) ),
					dist_y = ( town.y - HAX.toInt( y ) );
			return HAX.pl( Math.sqrt( ( dist_x * dist_x ) + ( dist_y * dist_y ) ), 2 );
		} catch( e ) {
			return -1;
		}
	};

	// callback handler. allows registration and deregistration of callbacks. allow allows triggering of them
	HAX.callbacks = ( function() {
		// main class function to setup the callbacks object
		function cb() {
			var T = this,
					callbacks = {};

			// get all the callbacks for a given action, or all if no action is given
			T.get = function( action ) {
				var action = action || false;
				return false === action && HAX.is( callbacks[ action ] ) ? callbacks[ action ] : callbacks;
			};

			// allow a callback to be registered
			T.register = function( action, func, priority ) {
				// normalize the priority we will use for this callback
				var priority = priority || '10',
						func = func || function() {};

				// if the key does not exist for this action, then create it
				if ( ! HAX.is( callbacks[ action ] ) )
					callbacks[ action ] = {};

				// if this priority does not have a key, then create it
				if ( ! HAX.is( callbacks[ action ][ priority ] ) )
					callbacks[ action ][ priority ] = [];

				// add the callback to the list of callbacks for this action
				callbacks[ action ][ priority ].push( func );

				// return a function that allows the passer to redefine the priority
				return function( new_priority ) {
					var i;
					// remove the old entry
					for ( i = 0; i < callbacks[ action ][ priority ].length; i++ )
						if ( callbacks[ action ][ priority ][ i ] == func )
							delete callbacks[ action ][ priority ][ i ];

					// add it to the new priority
					return intrfc.register( action, func, new_priority );
				}
			};

			// allow a callback to be deregistered
			T.deregister = function( action, func, priority ) {
				var func = func || function() {};
				// if the priority is specified, then only remove the func if on that priority
				if ( HAX.is( priority ) ) {
					if ( HAX.is( callbacks[ loc ] ) && HAX.is( callbacks[ loc ][ priority ] ) ) {
						// find all instances of the function on that priority
						for ( i = 0; i < callbacks[ loc ][ priority ].length; i++ )
							if ( callbacks[ loc ][ priority ][ i ] == func )
								delete callbacks[ loc ][ priority ][ i ];

						// re key the list of that priority
						callbacks[ loc ][ priority ] = callbacks[ loc ][ priority ].slice( 0 );
					}
				// otherwise, find all instances of the function and remove it from the arrays
				} else {
					var pr;
					for ( pr in callbacks[ loc ] ) if ( callbacks[ loc ][ H ]( pr ) ) {
						// find all instances of the function on that priority
						for ( i = 0; i < callbacks[ loc ][ pr ].length; i++ )
							if ( callbacks[ loc ][ pr ][ i ] == func )
								delete callbacks[ loc ][ pr ][ i ];

						// re key the list of that priority
						callbacks[ loc ][ pr ] = callbacks[ loc ][ pr ].slice( 0 );
					}
				}
			};

			// return a sorted array of callbacks
			function get_sorted_callbacks( list ) {
				var sorted = [],
						keys = Object.keys( list ), i;

				// sort the priority keys
				keys.sort( function( a, b ) { return parseInt( a ) - parseInt( b ); } );

				// cycle through the sorted key list, and aggregate the sorted array of arrays of functions
				for ( i = 0; i < keys.length; i++ )
					sorted.push( list[ keys[ i ] ] );

				return sorted;
			}

			// function that handle all the responses to hash changes (page changes)
			T.run = function( action, args, context ) {
				// if there are no registered callbacks for this hash, skip the remaining logic
				if ( ! HAX.is( callbacks[ action ] ) )
					return;

				// sort the list of callbacks for this hash
				var sorted = get_sorted_callbacks( callbacks[ action ] ),
						args = args || [];

				var i, j;
				// cycle through the list, and call every function
				for ( i = 0; i < sorted.length; i++ ) {
					for ( j = 0; j < sorted[ i ].length; j++ ) {
						if ( $.isFunction( sorted[ i ][ j ] ) ) {
							var func = sorted[ i ][ j ];
							func.apply( context || func, args );
						}
					}
				}
			}
		}

		var instances = {}, ii = 1;
		// multiton handler
		cb.get_instance = function( name ) {
			var name = name || false;
			// if the name is empty, then try to grab the first one in the list
			if ( false === name )
				name = Object.keys( instances ).shift();

			// if the name is still empty, create a bullshit name
			if ( ! name )
				name = 'instance-' + ( ii++ );

			// if the instance does not exist, create it
			if ( ! HAX.is( instances[ name ] ) )
				instances[ name ] = new cb();

			return instances[ name ];
		}

		return cb;
	} )();

	// after any ajax transition, we may want to run a bit of code, based on the url hit
	HAX.Ajax = ( function() {
		var cb = HAX.callbacks.get_instance( 'ajax' );

		// function to action intercept the completed ajax event call, and handle the relevant callbacks
		function handle_complete( e, xhr, settings ) {
			var i, regexs = Object.keys( cb.get() );
			// cycle through the register ajax takeovers, and if any match, run their callbacks now
			for ( i = 0; i < regexs.length; i++ ) {
				if ( settings.url.match( new RegExp( regexs[ i ] ) ) ) {
					cb.run( regexs[ i ] );
				}
			}
		}

		// register the callback that intercepts the ajax complete requests
		$( D ).off( 'ajaxComplete', handle_complete ).on( 'ajaxComplete', handle_complete );

		var intrfc = {
			// allow the passer to register a function to be called when a given location is hit
			register: function( regex_str, func, priority ) {
				// normalize the priority we will use for this callback
				var priority = priority || '10',
						func = func || function() {};

				return cb.register( regex_str, func, priority );
			},

			// allow the passer to deregister a function
			deregister: function( regex_str, func, priority ) {
				var func = func || function() {};
				return cb.deregister( regex_str, func, priority );
			}
		};

		return intrfc;
	} )();

	// handle location changes when they occur. also allow registration of things to do when locations change
	HAX.Location = ( function() {
		// holder for functions to call when certain page locations are reached
		var cb = HAX.callbacks.get_instance( 'location' );

		// function to get the location hash of the page we are currently on
		function get_page_hash() {
			var parts = W.location.hash.substr( 1 ).toLowerCase().split( /\// ).filter( function( a ) { return '' != a; } );
			return { core:parts.slice( 0, 2 ), core_string:parts.slice( 0, 2 ).join( '/' ), params:parts.slice( 2 ), all:parts, raw:W.location.hash.substr( 1 ) };
		}

		// function that handle all the responses to hash changes (page changes)
		function on_hash_change() {
			var hash = get_page_hash();
			cb.run( hash.core_string );
			cb.run( '*' );
		}

		// add the handler to the window that detects the change in hash and calls the appropriate callbacks
		$( W ).on( 'hashchange', on_hash_change );

		// wrap the callback based on the supplied info
		function wrap_callback( regex, func ) {
			return function() {
				// function to handle grab the needed data out of the ajax response for the page load
				var from_ajax = function( e, xhr, settings ) {
					// if the ajax response we got is not for the prescribed url, then bail until we hit it
					if ( ! settings.url.match( regex ) )
						return;

					// call the function that does the work here
					if ( $.isFunction( func ) )
						func( settings, xhr );

					// remove this handler from the global ajax handler
					$( D ).off( 'ajaxComplete', from_ajax );
				}

				// add this function as the handler for the ajax complete function so that we can grab our rares lists
				$( D ).off( 'ajaxComplete', from_ajax ).on( 'ajaxComplete', from_ajax );
			}
		}

		var intrfc = {
			// allow the passer to register a function to be called when a given location is hit
			register: function( loc, regex, func, priority ) {
				// normalize the priority we will use for this callback
				var priority = priority || '10',
						func = wrap_callback( regex, func );

				return cb.register( loc, func, priority );
			},

			// allow the passer to deregister a function
			deregister: function( loc, func, priority ) {
				var func = wrap_callback( func );
				return cb.deregister( loc, func, priority );
			}
		};

		return intrfc;
	} )();

	/* generic function to override a defined global function */
	HAX._Override = function( func_name, run_func ) {
		var orig = W[ func_name ],
				cb = HAX.callbacks.get_instance( func_name );

		// override the global function called W[ func_name ]
		W[ func_name ] = function() {
			var args = [].slice.call( arguments ),
					call_args = args.slice( 0 );

			call_args.unshift( cb );
			// add the original function args to the list of args to send to the override function
			call_args.unshift( args );
			// add a function to the front of the args list, that the override function can call to run the cbs that are registered
			call_args.unshift( function() {
				var inner_args = [].slice.call( arguments );
				cb.run( 'override-' + func_name, inner_args );
			} );

			// call the override function
			run_func.apply( this, call_args );

			return orig.apply( this, args );
		};

		var intrfc = {
			// allow the passer to register a function to be called when a given location is hit
			register: function( func, priority ) {
				// normalize the priority we will use for this callback
				var priority = priority || '10',
						func = func || function() {};

				return cb.register( 'override-' + func_name, func, priority );
			},

			// allow the passer to deregister a function
			deregister: function( func, priority ) {
				var func = func || function() {};
				return cb.deregister( 'override-' + func_name, func, priority );
			}
		};

		return intrfc;
	}

	/* when the normal tooltip pops up, we may have overrides or additions to it. this code handles that manipulation */
	HAX.Tip = HAX._Override( 'Tip', function( run, args, cb ) {
		var html = $( '<div>' + args[0] + '</div>' );

		// run all attached callbacks
		run.apply( this, [ html ] );

		// convert the results back to an html string
		args[0] = html.html();
	} );

	/* takeover the function that updates all the basic resources on a tick. we need to inject a bit of code that updates all town counts stored in memory */
	HAX.SetRes = HAX._Override( 'setRes', function( run, args ) {
		run.apply( this, args );
	} );

	/* take over the function that updates the nextevents progressbars, and allow our code to inject functionality when that tick happens */
	HAX.SetNextEventsProgress = HAX._Override( 'setNextEventsProgress', function( run, args, cb ) {
		run.apply( this, args );
	} );

	// add a new menu near the top left of the page, which we can add icons to on a whim
	HAX.Menu = ( function() {
		// container for the menu items we have registered
		var menu_items = [],
				box,
				index = 0;

		// normalize the args sent for menu item registration
		function _normalize( args, key ) {
			return $.extend( true, {
				key: key,
				label: key,
				icon: '<div class="icon">' + key.substr( 0, 1 ).toUpperCase() + '</div>',
				order: index++,
				events: { click:function() { HAX.log( 'click' ); } }
			}, args );
		}

		// get the menu container
		function get_box() {
			// if the box is not yet defined, add it to the DOM
			if ( ! HAX.is( box ) || ! HAX.is( box.length ) || ! box.length || ! box.find( '.h1f-menu' ).length ) {
				box = $( '<div id="h1f-menu-wrap">'
						+ '<style>'
						+ '#h1f-menu-wrap { position:absolute; z-index:1000; top:110px; left:148px; overflow:visible; }'
						+ '#h1f-menu-wrap .h1f-menu-container { position:absolute; top:0; right:0; max-width:112px; height:auto; background-color:#08f; }'
						+ '#h1f-menu-wrap .h1f-menu { margin:2px 2px 0 0; font-size:9px; }'
						+ '#h1f-menu-wrap .h1f-menu:empty { margin:0; }'
						+ '#h1f-menu-wrap .ico { width:16px; height:16px; background-color:#000; color:#fff; font-weight:700; line-height:16px; text-align:center; margin:0 0 2px 2px; '
								+ 'cursor:pointer; float:right; clear:none; }'
						+ '#h1f-menu-wrap .ico:hover { background-color:#ccc; color:#000; }'
						+ '</style>'
						+ '<div class="h1f-menu-container">'
							+ '<div class="h1f-menu"></div>'
						+ '</div>'
						+ '<div class="h1f-clear"></div>'
					+ '</div>' ).appendTo( 'body' );
			}

			return box.find( '.h1f-menu' );
		}

		// sort the list of menu items, by their order, and return the sorted list
		function get_sorted_items() {
			return menu_items.slice( 0 ).sort( function( a, b ) { return a.order - b.order; } );
		}

		// refresh the mneu display
		function refresh_menu() {
			var menu = get_box().empty(),
					items = get_sorted_items(), i;
			for ( i = 0; i < items.length; i++ ) {
				var icon = $( '<div class="ico"></div>' ).attr( 'title', items[ i ].label ).appendTo( menu );
				$( items[ i ].icon ).clone( true ).appendTo( icon );
				if ( items[ i ].events )
					icon.on( items[ i ].events );
			}
		}

		// refresh the menu on every ajax call
		//HAX.Ajax.register( '.*', refresh_menu, 1 );
		HAX.Location.register( '*', /^.*/, refresh_menu );
		$( function() { refresh_menu() } );

		// public interface for registering and deregistering menu items
		var intrfc = {
			// add a menu item
			register: function( key, args ) {
				// normalize the input args
				var args = _normalize( args, key );

				// add the menu to the list
				menu_items.push( args );

				return args;
			},

			// remove a menu item
			deregister: function( key ) {
				var tmp_list = menu_items, i;
				menu_items = [];
				// if the menu item exists, remove it
				for ( i = 0; i < tmp_list.length; i++ )
					if ( tmp_list[ i ].key != key )
						menu_items.push( tmp_list[ i ] );

				return true;
			}
		};

		return intrfc;
	} )();

	// add the distance to the output of square popups
	HAX.Tip.register( function( html ) {
		// find all world map links
		var wm = html.find( 'a[href^="#/World/Map/"]' ),
				m = wm.closest( '.m' );

		// if there are any, then
		if ( wm.length ) {
			var pos;
			// find the location that this link points to
			var pos = wm.attr( 'href' ).split( /\// ).slice( 3, 5 ),
					dist = HAX.pl( $.isArray( pos ) && HAX.is( pos[0] ) && HAX.is( pos[1] ) ? HAX.dist_cur_town( pos[0], pos[1] ) : 0, 2 );
			if ( dist > 0 )
				$( '<div class="distance"><strong>Distance:</strong> <em>' + dist + 'sq.</em></div>' ).prependTo( m );
		}
	} );

	// on page load, perform the version check, and pop a message if the version is out of date
	$( function() {
		var last_version_check = HAX.LS.fetch( 'latest-version' ) || {},
				// function that runs the actual check. if the check fails, we pop a message saying to update
				check_version = function() {
					var latest = HAX.LS.fetch( 'latest-version' ),
							comparison = HAX.version_compare( latest.VERSION, HAX.VERSION );

					// if we are on a newer version or up to date, then do nothing
					if ( comparison <= 0 )
						return;

					// otherwise pop a message saying there is an update
					var msg = $( '<div>A new version of "<i><u>HaxorOne\'s Illyriad Tools</u></i>" is available. You currently have version <strong><em>['
							+ HAX.VERSION + ']</em></strong> and the latest version is <strong><em>[' + latest.VERSION + ']</em></strong>. '
							+ 'To install the update, simply replace the original code you copy and pasted, with the new code. '
							+ 'If you need the link to those instructions, <a href="https://github.com/haxorone/illyriad-tools" target="_blank">'
							+ 'you can find them here</a>. Enjoy.</div>' )
						.dialog( {
							title: "Haxorone's Illyriad Tools Update",
							modal: true,
							autoOpen: true,
							position: { my:'center', at:'center', of:W },
							maxWidth: '90%',
							width:450,
							minHeight:0,
							maxHeight:'none',
							buttons: {
								'Got It!': function() { msg.dialog( 'close' ); }
							},
							close: function() { msg.dialog( 'destroy' ); }
						} );
				},
				old = 604800000;

		// if the version has never been checked, or the it was last checked was a long time ago, check it now
		if ( ! HAX.is( last_version_check.last_check ) || ! HAX.is( last_version_check.VERSION ) || ( new Date() ) - ( new Date( last_version_check.last_check ) ) > old ) {
			$.get( 'https://raw.githubusercontent.com/haxorone/illyriad-tools/master/version.js', function( r ) {
				eval( r );
				check_version();
			}, 'text' );
		// otherwise, run the check now
		} else {
			check_version();
		}
	} );
} )( window, document, HAX );

// if this is not the Illy domain, bail
if ( ! HAX.isIlly )
	return;
HAX.log( 'Initializing HaxorOne\'s Tools' );

// local storage handler
if ( ! HAX.hasLocalStorage ) {
	HAX.log( 'HaxorOne\'s Tools requires the Local Storage Feature. You do not have it. Sorry. Bailing.' );
	return;
}

/* Bookmark UI handler */
( function( W, D, HAX ) {
	var H = HAX.H;

	// holder for all the loaded lists of data
	HAX.Lists = ( function() {
		var data = {},
				keys = [ 'select-rmins', 'select-rherbs', 'select-ranas' ], i;

		// load each data into the respective key
		for ( i = 0; i < keys.length; i++ ) {
			var val = HAX.LS.fetch( keys[ i ] );
			if ( false !== val )
				data[ keys[ i ] ] = val;
		}

		return data;
	} )();

	// register a location handler that updates the HAX.Lists when the trade page is loaded
	HAX.Location.register( 'trade/markets', /^\/Trade\/Markets/, ( function() {
    // when loading the markets page, we need to snag a copy of the rare items lists, for the ids and titles at least
    function save_rares( settings, xhr ) {
      var lists = HAX.LS.fetch( 'lists' ) || {}, added_one = false, i, j;
			// if there is no global treeData available, then bail
			if ( ! HAX.is( treeData ) )
				return;

      // cycle through the results, and find the ones we need
      for ( i = 0; i < treeData.length; i++ ) {
        // if there is no data for this node, skip it
        if ( ! HAX.is( treeData[ i ].data ) )
          continue;
        
        // if it does not have children, skip
        if ( ! HAX.is( treeData[ i ].children ) )
          continue;
        
        var slug = '';
        // find the node slug
        switch ( treeData[ i ].data.id ) {
          case '223': slug = 'select-rherbs'; break;
          case '192': slug = 'select-rmins'; break;
          case '185': slug = 'select-ranas'; break;
          case '289': slug = 'select-reles'; break;
        }
        if ( '' === slug )
          continue;
        
        lists[ slug ] = [];
        // add each child to the list, if it is not a known basic resource
        for ( j = 0; j < treeData[ i ].children.length; j++ ) {
          if ( -1 !== $.inArray( treeData[ i ].children[ j ].data.id, [ '416', '417', '186', '253' ] ) )
            continue;
          lists[ slug ].push( $.extend( {}, treeData[ i ].children[ j ].data ) );
          added_one = true;
        }
      }
      
      if ( added_one ) {
				HAX.log( 'Saving Lists: ', lists );
        HAX.LS.store( 'lists', lists );
			}
    };

		return save_rares;
	} )() );

	// class to handle the UI of the bookmarker, both the edit bookmark and bookmark list screens
	HAX.UI = ( function() {
		// handle bookmarker, data side
		HAX.BMs = ( function() {
			var filters = {
						text: function( v, bm, f ) {
							var regex = new RegExp( v.replace( /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&" ), 'i' );
							return regex.test( bm[ f.key ] );
						},
						truefalse: function( v, bm, f ) { return parseInt( bm[ f.key ] ) > 0; },
						select: function( v, bm, f ) { return bm[ f.key ] == v; }
					},
					display = {
						standard: function( bm, f ) { return f.format.replace( /%s/g, bm[ f.key ] ).replace( /%t/g, f.title ); }
					},
					types = {
						text: { type:'text', def:'', format:'%s', filter:filters.text, display:display.standard },
						truefalse: { type:'truefalse', def:0, format:'%t', filter:filters.truefalse, display:display.standard },
						select: { type:'select', def:'', format:'%s', filter:filters.select, display:display.standard }
					},
					fields = {
						title: $.extend( {}, types.text, { title:'Title', key:'title', def:function( bm ) {
							var mapData = mapData || {},
									loc = bm.x + '|' + bm.y, // create some lookup keys
									rloc = bm.y + '|' + bm.x,// "
									town = ( HAX.is( mapData ) && HAX.is( mapData.t ) && HAX.is( mapData.t[ rloc ] ) ? mapData.t[ rloc ].t : false ), // see if this square is a town, based on the global data array
									tile = ( HAX.is( mapData ) && HAX.is( mapData.data ) && HAX.is( mapData.data[ rloc ] ) ? mapData.data[ rloc ] : false ); // get the basic tile information frm the global data array
							// create a basic title
							return ( false !== town
									? '{Town} "' + town.TownName + '" (' + town.Player + ') [' + loc + '|' + Regions[ town.RegionId ] + ']'
									: 'Location [' + loc + ']' + ( false !== tile ? ' in ' + Regions[ tile.r ] : '' ) );
						} } ),
						town: $.extend( {}, types.truefalse, { title:'Town', key:'town' } ),
						new_town: $.extend( {}, types.truefalse, { title:'New Town', key:'new_town' } ),
						ally: $.extend( {}, types.truefalse, { title:'Ally', key:'ally' } ),
						war: $.extend( {}, types.truefalse, { title:'War', key:'war' } ),
						basic: $.extend( {}, types.select, { title:'Basic Rez', key:'basic' } ),
						rmins: $.extend( {}, types.select, { title:'Rare Mineral', key:'rmins' } ),
						rherbs: $.extend( {}, types.select, { title:'Rare Herbs', key:'rherbs' } ),
						ranas: $.extend( {}, types.select, { title:'Rare Anatomies', key:'ranas' } ),
						reles: $.extend( {}, types.select, { title:'Rare Elementals', key:'reles' } )
					},
					sorts = {
						when: {
							name: 'Date Bookmarked',
							sort: function( a, b ) { return -1; }
						},
						closest: {
							name: 'Closest to Current Town',
							sort: function( a, b ) { var dist_a = HAX.dist_cur_town( a.x, a.y ), dist_b = HAX.dist_cur_town( b.x, b.y ); return dist_a - dist_b; }
						},
						farthest: {
							name: 'Farthest from Current Town',
							sort: function( a, b ) { var dist_a = HAX.dist_cur_town( a.x, a.y ), dist_b = HAX.dist_cur_town( b.x, b.y ); return dist_b - dist_a; }
						},
						abc: {
							name: 'Alphabetical',
							sort: function( a, b ) { var lower_a = a.title.toLowerCase(), lower_b = b.title.toLowerCase(); return lower_a.localeCompare( lower_b ); }
						},
						cba: {
							name: 'Reverse - Alphabetical',
							sort: function( a, b ) { var lower_a = a.title.toLowerCase(), lower_b = b.title.toLowerCase(); return lower_b.localeCompare( lower_a ); }
						}
					};

			// create the bookmarks constructor
			function BMs( options ) {
				var T = this;
				T.options = {};

				// function to fetch the list of fields
				T.get_fields = function() { return fields; };

				// function to fetch the list of sorts available
				T.get_sorts = function() { return sorts; };

				// get all the bookmarks
				T.get_bookmarks = function() { return HAX.LS.fetch( 'bookmarks' ); };

				// get a specific bookmark
				T.get_bookmark = function( x, y ) {
					var all = T.get_bookmarks(),
							key = x + '|' + y;
					return normalize( HAX.is( all[ key ] ) ? all[ key ] : { x:x, y:y } );
				};

				// determine if a set of coordinates has a bookmark set
				T.has_bookmark = function( x, y ) {
					var bms = T.get_bookmarks(),
							key = x + '|' + y;
					return HAX.is( bms[ key ] );
				}

				// function to save the bookmarks
				T.save_bookmarks = function( new_bookmarks ) {
					if ( ! $.isPlainObject( new_bookmarks ) )
						return false;
					return HAX.LS.store( 'bookmarks', $.extend( T.get_bookmarks(), new_bookmarks ) );
				};

				// remove a single bookmark
				T.delete_bookmark = function( x, y ) {
					var key = x + '|' + y;
					return T.remove_bookmarks( [ key ] );
				};

				// remove some bookmarks, based on a list of passed coords
				T.remove_bookmarks = function( coords_list ) {
					var bms = T.get_bookmarks(), i;
					// cycle through the list of supplied coords, and remove the bookmarks for those coords
					for ( i = 0; i < coords_list.length; i++ )
						delete bms[ coords_list[ i ] ];

					HAX.LS.store( 'bookmarks', bms );

					return true;
				};

				// filter the bookmarks based off the supplied fields and values
				T.filter = function( pairs ) {
					var bms = T.get_bookmarks(), i, j;

					// cycle through the supplied pairs, and apply the filters of the fields we know about
					for ( i in pairs ) if ( pairs[ H ]( i ) ) {
						// if the field is not a known field to filter by, then skip it
						if ( ! HAX.is( fields[ i ] ) )
							continue;

						// if the comparison value is an empty string, skip it
						if ( ! HAX.is( pairs[ i ] ) || '' == pairs[ i ] )
							continue;

						var field = fields[ i ],
								holder = bms;
						bms = {};
						// apply the filter to the list of bookmarks
						for ( j in holder ) if ( holder[ H ]( j ) ) {
							//HAX.log( 'compare', i, pairs[ i ], j, holder[ j ], field.filter( pairs[ i ], field, holder[ j ] ), holder[ j ] );
							if ( field.filter( pairs[ i ], holder[ j ], field ) )
								bms[ j ] = holder[ j ];
						}
					}

					return bms;
				};

				// apply one of the sorts to the resultset
				T.sort = function( bms, sort ) {
					// if the supplied sort method is not a valid one, return the original list
					if ( ! HAX.is( sorts[ sort ] ) )
						return bms;

					var arr = [], i;
					// convert the results to an array, for sorting
					for ( i in bms ) if ( bms[ H ]( i ) ) {
						bms[ i ]._key = i;
						arr.push( bms[ i ] );
					}

					// sort them
					arr.sort( sorts[ sort ].sort );

					bms = {};
					// re 'objectize' the list of results
					for ( i = 0; i < arr.length; i++ ) {
						var key = arr[ i ]._key;
						delete arr[ i ]._key;
						bms[ key ] = arr[ i ];
					}

					return bms;
				}

				// set the options for this instance
				T.set_options = function( opts ) {
					T.options = $.extend( true, T.options, opts );
				}

				// normalize a bookmark, based on the know fields
				function normalize( bm ) {
					var args = { x:0, y:0 }, i;
					// cycle through the fields, and make the basic defaults for this bookmark
					for ( i in fields ) if ( fields[ H ]( i ) ) {
						var field = fields[ i ];
						if ( $.isFunction( field.def ) )
							args[ i ] = field.def( bm );
						else
							args[ i ] = field.def;
					}

					// return the normalized object
					return $.extend( args, bm );
				}

				// save a single bookmark
				T.save = function( data ) {
					// normalize the input data
					var data = normalize( data ),
							// get all the current bookmarks
							new_bookmarks = {},
							// create the key for this bookmark
							key = data.x + '|' + data.y;

					// update this bookmark in the list
					new_bookmarks[ key ] = data;
					HAX.log( 'Save Bookmark: ', data );

					// save the bookmarks
					T.save_bookmarks( new_bookmarks );

					return data;
				}
			};

			var instance;
			// spawn the BMs instance
			BMs.get_instance = function( options ) {
				// if the instance does not exist, then create it
				if ( ! HAX.is( instance ) )
					instance = new HAX.BMs();

				// set the options for the instance
				instance.set_options( options );

				return instance;
			};

			return BMs;
		} )();

		// when on the world map page, we need to add the bookmark list icon, and the actions that control the list
		HAX.Location.register( 'world/map', /^\/World\/MapCanvas/, ( function() {
			// function that actually adds the icon
			function add_bookmarker_icon( aj_settings, xhr ) {
				var T = HAX.UI.get_instance(),
						icon = $( '<div>B</div>' )
							.css( {
								width: '1.5em', height: '1.5em', lineHeight: '1.5em', position: 'absolute', zIndex: 100000, left: 0, top: 0, textAlign: 'center', fontWeight: '700',
								fontSize: '11px', backgroundColor: '#000', color: '#fff', cursor: 'pointer'
							} )
							.appendTo( $( '#mapDiv' ).wrap( '<div style="position:relative"></div>' ).parent() );
				
				icon.on( 'click', function() {
					var ui = HAX.UI.get_instance(),
							bms_obj = HAX.BMs.get_instance(),
							fields = bms_obj.get_fields();
					
					// add the filter events
					function add_filters() {
						// when elements of the filter form change, update the list
						T.UI.filters.off( 'change.h1f-filters', 'input, select' )
							.on( 'change.h1f-filters', 'input, select', function() { T.update_list(); } );
						
						var protect = '';
						// when the user types a search, delay until they stopped typing, and then perform the search
						T.UI.filters.off( 'keyup.h1f-filters', '#h1f-bm-title' )
							// delay keyup filtering until after 30ms after we stop typing. performance boost
							.on( 'keyup.h1f-filters', '#h1f-bm-title', function() {
								var mine = Math.random() * 10000000;
								protect = mine;
								setTimeout( function() {
									if ( mine !== protect )
										return;
									T.update_list();
								}, 300 );
							} );
					}
					
					// remove the filter events
					function remove_filters() {
						// when elements of the filter form change, update the list
						T.UI.filters.off( 'change.h1f-filters', 'input, select' );
						T.UI.filters.off( 'keyup.h1f-filters', '#h1f-bm-title' );
					}
					
					// when clicking a link int he dialog, close the dialog
					T.UI.list.on( 'click', 'a', function() {
						$("#LoadingOn").show();
						T.UI.ui.dialog( 'close' ).dialog( 'destroy' );
						remove_filters();
					} );

					// populate the list and add the event handlers for the filter triggers
					T.show_list();
					add_filters();
					
					// setup the dialog
					T.UI.ui.dialog( {
						modal: true,
						title: 'Bookmarks',
						maxWidth: '90%',
						width: 800,
						maxHeight: '90%',
						height: 500,
						buttons: {
							'Cancel': function() { T.UI.ui.dialog( 'close' ).dialog( 'destroy' ); remove_filters(); }
						}
					} );
				} );
			}

			return add_bookmarker_icon;
		} )() );

		function UI() {
			var T = this,
					bms_obj = HAX.BMs.get_instance(),
					sorts = bms_obj.get_sorts(),
					sorts_options = '', i;

			// build the options list for the sorts
			for ( i in sorts ) if ( sorts[ H ]( i ) )
				sorts_options += '<option value="' + escape( i ) + '">' + sorts[ i ].name + '</option>';

			// init the interface
			var bmui = $( '<div id="h1fbmui">'
						+ '<style>'
						+ '.h1fbm { display:none; }'
						+ '.h1f-clear { clear:both; }'
						+ '.h1f-clear::after { display:block; height:0; overflow:hidden; }'
						+ '.h1f-clear::after { clear:both; display:block; height:0; overflow:hidden; }'
						+ '.h1fbm h2 { margin-bottom:5px; }'
						+ '.h1fbm .h1fbl { max-width:60%; width:100%; overflow-x:hidden; overflow-y:auto; height:100%; float:left; clear:none; }'
						+ '.h1fbm .h1fbl a { display:block; width:100%; padding:0.5em 0.7em; line-height:1.3em; font-size:9px; float:left; clear:none; }'
						+ '.h1fbm .h1fbl a .inner { width:100%; overflow-x:hidden; box-sizing:border-box; padding-right:30px; position:relative; }'
						+ '.h1fbm .h1fbl a .title { white-space:nowrap; width:100%; overflow-x:hidden; }'
						+ '.h1fbm .h1fbl a .meta { font-style:italic; color:#888; }'
						+ '.h1fbm .h1fbl a .remove { font-weight:700; color:#800; background-color:#fff; border:1px solid #000; width:11px; height:11px; line-height:12px; text-align:center; '
							+ 'position:absolute; top:0; right:14px; }'
						+ '.h1fbm .h1fbl a .remove:hover { color:#f00; }'
						+ '.h1fbm .h1f-img { float:right; margin:0 0 5px 5px; }'
						+ '.h1fbm .h1fcb { font-size:9px; white-space:nowrap; width:100%; }'
						+ '.h1fbm .h1fcb img { display:none; }'
						+ '.h1fbm .h1fbe { max-width:40%; width:100%; overflow:auto; height:100%; box-sizing:border-box; padding-left:1em; }'
						+ '.h1fbm .h1fbe.h1fbef { max-width:100%; padding-left:0; }'
						+ '.h1fbm .h1f-section { padding-bottom:2em; }'
						+ '.h1fbm .h1ff { width:100%; margin:0; border:0; padding:0 5px 8px 0; box-sizing:border-box; }'
						+ '.h1fbm .h1ff select { max-width:100%; width:100%; }'
						+ '.h1fbm .h1ff input { max-width:100%; vertical-align:text-bottom; }'
						+ '.h1fbm .h1ffs .h1ff { float:left; }'
						+ '.h1fbm .h1ffs.h1ffw .h1ff { width:100%; padding-right:0; }'
						+ '.h1fbm .h1ffs.h1f2 .h1ff { width:50%; }'
						+ '.h1fbm .h1ffs.h1f3 .h1ff { width:33.3%; }'
						+ '.h1fbm .h1ffs.h1f4 .h1ff { width:25%; }'
						+ '.h1fbm label { display:block; font-size:11px; font-weight:700; margin:0 0 5px; padding:0; border:0; text-decoration:underline; }'
						+ '</style>'

						+ '<script type="text/html" id="h1fbm-link">'
							+ '<a href="">'
								+ '<div class="inner">'
									+ '<div class="title"></div>'
									+ '<div class="meta"></div>'
									+ '<div class="remove">X</div>'
								+ '</div>'
							+ '</a>'
						+ '</script>'

						+ '<div id="h1fbm" class="h1fbm">'
							+ '<div class="h1fbl"></div>'
							+ '<div class="h1fbe h1f-rs">'
								+ '<div class="h1f-section h1f-filters">'
									+ '<h2 class="h1f-heading">Filter By:</h2>'
									+ '<div class="h1f-meta"></div>'
									+ '<div class="h1ff"><label>Title</label><input type="text" id="h1f-bm-title" filter="title" value="" /></div>'
									+ '<div class="h1ffs h1f4">'
										+ '<div class="h1ff"><span class="h1fcb"><input type="checkbox" id="h1f-town" filter="town" value="1" /><span> Town</span></span></div>'
										+ '<div class="h1ff"><span class="h1fcb"><input type="checkbox" id="h1f-new-town" filter="new_town" value="1" /><span> New Town</span></span></div>'
										+ '<div class="h1ff"><span class="h1fcb"><input type="checkbox" id="h1f-ally" filter="ally" value="1" /><span> Ally Loc</span></span></div>'
										+ '<div class="h1ff"><span class="h1fcb"><input type="checkbox" id="h1f-war" filter="war" value="1" /><span> War Loc</span></span></div>'
										+ '<div class="h1f-clear"></div>'
									+ '</div>'
									+ '<div class="h1ffs h1ffw">'
										+ '<div class="h1ff"><label>Basic Resources</label><select id="h1f-basic" filter="basic">'
											+ '<option value="">- Select One -</option>'
											+ '<option value="Minerals">Minerals</option>'
											+ '<option value="Herbs">Herbs</option>'
											+ '<option value="Grapes">Grapes</option>'
											+ '<option value="Skins">Skins</option>'
										+ '</select></div>'
									+ '</div>'
									+ '<div class="h1ffs h1f2">'
										+ '<div class="h1ff"><label>Rare Mineral</label><select id="h1f-rmin" filter="rmins"></select></div>'
										+ '<div class="h1ff"><label>Rare Herb</label><select id="h1f-rherb" filter="rherbs"></select></div>'
										+ '<div class="h1ff"><label>Rare Anatomy</label><select id="h1f-rana" filter="ranas"></select></div>'
										+ '<div class="h1ff"><label>Rare Elements</label><select id="h1f-rele" filter="reles"></select></div>'
										+ '<div class="h1f-clear"></div>'
									+ '</div>'
									+ '<div class="h1ff h1fa ui-dialog-buttonpane">'
										+ '<button type="button" class="ui-button ui-widget ui-state-default ui-button-text-only h1f-right h1f-delete" role="button" aria-disabled="false">'
											+ '<span class="ui-button-text">Delete</span>'
										+ '</button>'
										+ '<button type="button" class="ui-button ui-widget ui-state-default ui-button-text-only h1f-cancel" role="button" aria-disabled="false">'
											+ '<span class="ui-button-text">Cancel</span>'
										+ '</button>'
										+ '<button type="button" class="ui-button ui-widget ui-state-default ui-button-text-only h1f-save" role="button" aria-disabled="false">'
											+ '<span class="ui-button-text">Save</span>'
										+ '</button>'
									+ '</div>'
								+ '</div>'
								+ '<div class="h1f-section h1f-sorting">'
									+ '<h2 class="h1f-heading">Sorting:</h2>'
									+ '<div class="h1ffs h1ffw">'
										+ '<div class="h1ff"><label>Sort By</label><select id="h1f-sort">'
											+ sorts_options
										+ '</select></div>'
									+ '</div>'
								+ '</div>'
							+ '</div>'
							+ '<div class="h1f-clear"></div>'
							+ '<div class="h1fsb h1f-rs">'
							+ '</div>'
							+ '<div class="h1f-clear"></div>'
						+ '</div>'
					+ '</div>' ).appendTo( 'body' );
			T.UI = {
				main: bmui,
				link: $( bmui.find( '#h1fbm-link' ).text() ),
				ui: bmui.find( '#h1fbm' ),
				list: bmui.find( '#h1fbm .h1fbl' ),
				filters: bmui.find( '#h1fbm .h1fbe' ),
				edit: bmui.find( '#h1fbm .h1fbe' ).clone().addClass( 'h1fbef' ).wrap( '<div class="h1fbm"></div>' ).parent()
			};
			T.UI.edit.find( '.h1f-section' ).not( '.h1f-filters' ).remove();
			T.UI.edit.find( '.h1f-heading' ).remove();

			// populate the rare resourec lists
			function populate_rares( context ) {
				// get the list of all the rare resources, if it exist
				var rares = HAX.LS.fetch( 'lists' ),
						lists = {
							'select-rmins': { sel:'#h1f-rmin' },
							'select-rherbs': { sel:'#h1f-rherb' },
							'select-ranas': { sel:'#h1f-rana' },
							'select-reles': { sel:'#h1f-rele' }
						}, lname, i, j;

				// cycle through the lists if rare items
				for ( lname in lists ) {
					var list = lists[ lname ];
					// if there are not any items in the list, then hide the field
					if ( ! $.isPlainObject( rares ) || ! HAX.is( rares[ lname ] ) || ! $.isArray( rares[ lname ] ) || ! rares[ lname ].length ) {
						context.find( list.sel ).closest( '.h1ff' ).hide();
					// otherwise update that list of rares
					} else {
						var ele = context.find( list.sel );
						ele.closest( '.h1ff' ).show();

						// clear out the list first
						ele.empty();

						// readd all the items to the list
						$( '<option value="">- Select One -</option>' ).appendTo( ele );
						for ( i = 0; i < rares[ lname ].length; i++ )
              $( '<option></option>' )
									.text( rares[ lname ][ i ].title )
									.val( rares[ lname ][ i ].title )
									.appendTo( ele );
					}
				}
			}

			// populate the links list and thier tags
			function populate_links( bookmarks ) {
				// get the list of fields we will display tags for
				var bms_obj = HAX.BMs.get_instance(),
						fields = bms_obj.get_fields();

				// clear out all bookmarks from the current list
				T.UI.list.empty();

				// cycle through the bookmarks, and create links inside the dialog for each
				for ( i in bookmarks ) if ( bookmarks.hasOwnProperty( i ) ) {
					// if the bookmark is not an object, then bail
					if ( ! $.isPlainObject( bookmarks[ i ] ) )
						continue;

					// otherwise, draw the item in the list
					var bm = bookmarks[ i ],
							distance = HAX.dist_cur_town( bm.x, bm.y ),
							url = '#/World/Map/' + bm.x + '/' + bm.y,
							link = T.UI.link.clone(), j;
					( function( bm, link ) {
						link.attr( { href:url, title:bm.title } ).appendTo( T.UI.list );
						link.find( '.title' ).text( '(' + distance + 'sq) ' + bm.title );
						link.find( '.remove' ).on( 'click', function( e ) {
							e.preventDefault();
							e.stopPropagation();
							if ( confirm( 'Are you sure you want to delete "' + bm.title + '"?' ) ) {
								bms_obj.delete_bookmark( bm.x, bm.y );
								T.update_list();
							}
						} )
					} )( bm, link );

					var text = [];
					// add bits for meta also
					for ( j in fields ) if ( fields[ H ]( j ) ) {
						// if this is the a non-displayed meta field, skip it
						if ( -1 != $.inArray( j, [ 'title' ] ) )
							continue;

						var field = fields[ j ],
								set = bm[ field.key ];
						if ( set )
							text.push( field.display( bm, field ) );
					}

					// actually add the tags to the meta section of the link
					link.find( '.meta' ).html( text.join( ', ' ) );
				}
			}

			// clear the filters in the given form
			function clear_form( form ) {
				form.find( '[filter]' ).each( function() {
					// accomplish this a different way, depending on the field type
					switch ( $( this ).attr( 'type' ) ) {
						case 'radio':
						case 'checkbox': $( this ).removeProp( 'checked' ); break;
						default: $( this ).val( '' );
					}
				} );
			}

			// fill out the edit form, based on the supplied bookmark
			function fill_form( bm ) {
				// first clear the form
				clear_form( T.UI.edit );

				// if there is no bookmark, then bail because there is nothing to set
				if ( ! HAX.is( bm ) )
					return;

				// for each field in the form, update the value to the value from the bm
				T.UI.edit.find( '[filter]' ).each( function() {
					var filter = $( this ).attr( 'filter' );

					// accomplish this a different way depending on the type of field
					switch ( $( this ).attr( 'type' ) ) {
						case 'radio':
						case 'checkbox': $( this )[ HAX.is( bm[ filter ] ) && bm[ filter ] ? 'prop' : 'removeProp' ]( 'checked', 'checked' ); break;
						default: $( this ).val( HAX.is( bm[ filter ] ) && bm[ filter ] ? bm[ filter ] : '' ); break;
					}
				} );
			}

			// add the town data to the edit bookmark popup
			function add_town_data( bm ) {
				var meta = T.UI.edit.find( '.h1f-meta' ).empty(),
						loc = bm.x + '|' + bm.y,
						rloc = bm.y + '|' + bm.x,
						mapData = mapData || {};
				
				// if the sqr is a town, then load the town data.
				// NOTE: the town has to have been loaded on the map recently for this to work
				if ( HAX.is( mapData ) && HAX.is( mapData.t ) && HAX.is( mapData.t[ rloc ] ) ) {
					var town = mapData.t[ rloc ],
							t = town.t,
							region = HAX.is( Regions ) && HAX.is( Regions[ t.RegionId ] )
									 ? Regions[ t.RegionId ]
									 : 'Region ' + t.RegionId;
					//$( '<div class="h1f-img">' + $( bm.i ).html() + '</div>' ).appendTo( meta );
					$( '<div><strong>Location:</strong> [' + loc + '] in ' + region + '</div>' ).appendTo( meta );
					$( '<div><strong>Town:</strong> ' + t.TownName + '</div>' ).appendTo( meta );
					$( '<div><strong>Population:</strong> ' + t.Population + '</div>' ).appendTo( meta );
				}
			}

			// show the bookmarks list
			T.show_list = function() {
				var bms_obj = HAX.BMs.get_instance();

				// populate the lists of rare resoures, as we know them to be currently
				populate_rares( T.UI.ui );

				// update the list of links
				T.update_list();
			};

			T.update_list = function() {
				var filters = {},
						bms_obj = HAX.BMs.get_instance(),
						sort_method = T.UI.filters.find( '#h1f-sort' ).val();

				// get a list of all the bookmarks, based on the filters we have set in our filter box
				T.UI.filters.find( '[filter]' ).each( function() {
					var filter = $( this ).attr( 'filter' ),
							val;

					// figure out the value to store, based on the type of field
					switch ( $( this ).attr( 'type' ) ) {
						case 'checkbox': filters[ filter ] = $( this ).is( ':checked' ) ? 1 : 0; break;
						case 'radio': if ( $( this ).is( ':checked' ) ) filters[ filter ] = $( this ).val(); break;
						default: filters[ filter ] = $( this ).val(); break;
					}
				} );

				//HAX.log( 'Filtering Bookmark List', filters );

				// populate the list based on the filtered bookmarks
				populate_links( bms_obj.sort( bms_obj.filter( filters ), sort_method ) );
			};

			// show the edit bookmark screen
			T.show_edit_bookmark = function( x, y ) {
				var bms_obj = HAX.BMs.get_instance(),
						bm = bms_obj.get_bookmark( x, y );

				// adjust the text of the bookmark dialog, based on the existence of the bookmark
				var dialog_title = ( HAX.is( bm ) ? 'Edit Bookmark' : 'New Bookmark' ) + ' at [' + x + '|' + y + ']';

				// populate the lists of rare resoures, as we know them to be currently
				populate_rares( T.UI.edit );

				// fill out the known bm data in the form
				fill_form( bm );
				add_town_data( bm );

				// open the dialog with the form
				T.UI.edit.dialog( {
					modal: true,
					title: dialog_title,
					buttons: {
						'Save': function() {
							// update the bookmark title
							bm.title = T.UI.edit.find( '#h1f-bm-title' ).val();
							
							// first clear out all values from the current bm. need to do this first, because radio buttons will have the same filter. think about it
							T.UI.edit.find( '[filter]' ).each( function() {
								var filter = $( this ).attr( 'filter' );
								bm[ filter ] = '';
							} );

							// update all the BM data
							T.UI.edit.find( '[filter]' ).each( function() {
								var filter = $( this ).attr( 'filter' );

								// update the bm data for this filter, based on the type of field
								switch ( $( this ).attr( 'type' ) ) {
									case 'checkbox': if ( $( this ).is( ':checked' ) ) bm[ filter ] = 1; else bm[ filter ] = 0; break;
									case 'radio': if ( $( this ).is( ':checked' ) ) bm[ filter ] = $( this ).val(); break;
									default: bm[ filter ] = $( this ).val(); break;
								}
							} );

							HAX.log( 'Saving Bookmark', bm );
							// save the bookmark
							bms_obj.save( bm );
							T.UI.edit.dialog( 'close' ).dialog( 'destroy' );
						},
						'Cancel': function() { T.UI.edit.dialog( 'close' ).dialog( 'destroy' ); },
						'Delete': function() {
							if ( confirm( 'Are you sure you want to delete the bookmark for [' + bm.x + '|' + bm.y + ']?' ) ) {
								bms_obj.delete_bookmark( bm.x, bm.y );
								T.UI.edit.dialog( 'close' ).dialog( 'destroy' );
							}
						}
					}
				} );
			};

			// handle clicks of the bookmark links
			$( document ).on( 'click.h1f', '.popup [role="bookmark"]', function() {
				// otherwise, load the edit dialog
				var me = $( this ),
						info = me.data( 'info' );
				T.show_edit_bookmark( info.x, info.y );
			} );
		};

		// register our tooltip mod
		HAX.Tip.register( function( html ) {
			// find all world map links
			var wm = html.find( 'a[href^="#/World/Map/"]' ),
					bms_obj = HAX.BMs.get_instance();

			// if there are any, then
			if ( wm.length ) {
				// if there is not already a bookmark link, then
				if ( ! html.find( '[role="bookmark"]' ).length ) {
					// find the location that this link points to
					var pos = wm.attr( 'href' ).split( /\// ).slice( 3, 5 ),
							loc = pos.join( '|' ),
							p = wm.parent(),
							// create the container for our new link
							div = $( '<div></div>' ).insertAfter( p ),
							// figure out the text of the new link
							text = bms_obj.has_bookmark( pos[0], pos[1] )
									? 'Edit this bookmark [' + loc + ']'
									: 'Bookmark this Square [' + loc + ']';

					// create the bookmark link with all the required information
					$( '<a href="javascript:;" role="bookmark">' + text + '</a>' )
							.attr( 'data-info', JSON.stringify( {
								x: pos[0],
								y: pos[1],
								i: '<div style="position:relative;">' + html.find( 'img' ).parent().html() + '</div>'
							} ) ).appendTo( div );
				}
			}
		} );

		var instance;
		UI.get_instance = function() {
			// if there is no instance yet, then make one
			if ( ! instance )
				instance = new HAX.UI();

			return instance;
		};

		return UI;
	} )();

	$( function() { HAX.UI.get_instance(); } );

} )( window, document, HAX );

/* Note taker UI handler */
( function( W, D, HAX ) {
	var H = HAX.H;

	// note taker ui namespace
	HAX.NoteTaker = ( function() {
		// handle the note taker functionality, data side
		HAX.NTs = ( function() {
			var defs = {};

			// class function for the Note Taker
			function NT( options ) {
				var T = this,
						LS = HAX.LS;

				// function to construct a note key based on an x and y
				function k( x, y ) { return 'note|' + x + '|' + y; };

				// normalize the note with some defaults
				function _normalize( data, extra ) {
					return $.extend( {
						x:0,
						y:0,
						note:''
					}, data, extra );
				}

				// function to setup the internal options for this object
				T.set_options = function( options ) {
					T.o = $.extend( true, {}, defs, options );
				};

				// determine if a suqare has a note
				T.has_note = function( x, y ) {
					var note = LS.fetch( k( x, y ) );
					return !! note;
				};

				// fetch the note from a square
				T.get_note = function( x, y ) {
					var raw = LS.fetch( k( x, y ) );
					return _normalize( raw, { x:x, y:y } );
				};

				// update a note for a given location
				T.save_note = function( x, y, data ) {
					var data = HAX.isString( data ) ? { note:data } : $.extend( {}, data );
					data.x = x;
					data.y = y;
					return LS.store( k( x, y ), data );
				};

				// remove a note from a give location
				T.delete_note = function( x, y ) {
					return LS.purge( k( x, y ) );
				};

				T.set_options( options );
			}

			var instance;
			// handle the singleton for this class
			NT.get_instance = function( options ) {
				// if the instance does not yet exist, create it
				if ( ! HAX.is( instance ) )
					instance = new NT();

				// set the options passed
				instance.set_options( options );

				return instance;
			};

			return NT;
		} )();

		// when on the world map page, we need to add the bookmark list icon, and the actions that control the list
		HAX.Location.register( 'world/map', /^\/World\/MapCanvas/, ( function() {
			// function that actually adds the note taker functionality
			function add_notetaker( aj_settings, xhr ) {
				var nts_obj = HAX.NTs.get_instance(),
						T = HAX.NoteTaker.get_instance();
			}

			return add_notetaker;
		} )() );

		// add a tip mod so that the notes can be displayed inside the tips
		HAX.Tip.register( function( html ) {
			// find all world map links
			var wm = html.find( 'a[href^="#/World/Map/"]' ),
					after = html.find( '[role="bookmark"]' );
			if ( ! after.length )
				after = wm;

			// if there are any, then
			if ( wm.length ) {
				var pos = wm.attr( 'href' ).split( /\// ).slice( 3, 5 ).filter( function( a ) { return 0 != a; } ),
						loc = pos.join( '|' ),
						nts_obj = HAX.NTs.get_instance();

				// if the position is corrupt, bail
				if ( ! $.isArray( pos ) || 2 !== pos.length )
					return;

				// if the edit note link does not yet exist, create it
				if ( ! html.find( '[role="edit-note"]' ).length ) {
					var text = nts_obj.has_note( pos[0], pos[1] ) ? 'Edit Notes' : 'Add Notes',
							p = after.parent(),
							// create the container for our new link
							div = $( '<div></div>' ).insertAfter( p );

					// create the edit note link with all the required information
					$( '<a href="javascript:;" role="edit-note">' + text + '</a>' )
							.attr( 'data-info', JSON.stringify( {
								x: pos[0],
								y: pos[1],
								i: '<div style="position:relative;">' + html.find( 'img' ).parent().html() + '</div>'
							} ) ).appendTo( div );
				}

				// if there is not already a bookmark link, then
				if ( ! html.find( '[role="notes"]' ).length ) {
					// find the location that this link points to
					var nt = nts_obj.get_note( pos[0], pos[1] ),
							msg = nt.note;

					// create the bookmark link with all the required information
					if ( msg ) {
						var cont = $( '<div class="note-block-wrap"></div>' ).appendTo( wm.closest( 'div.m' ) );
						$( '<strong>Notes:</strong><br/>' ).appendTo( cont );
						$( '<div role="notes" class="note-block"></div>' ).html( msg ).appendTo( cont );
					}
				}
			}
		} );

		// main function to handle the Note taker UI
		function NTUI() {
			var T = this;

			// create the ui elements
			T.UI = {
				ntui: ( $( '#h1fntui' ).length ? $( '#h1fntui' ) : $( '<div id="h1fntui">'
					+ '<style>'
					+ '.popup .note-block { font-style:italic; padding:0.5em 0; }'
					+ '.h1fnt { display:none; }'
					+ '.h1fnt h2 { margin-bottom:5px; }'
					+ '.h1fnt .h1f-section { padding-bottom:2em; }'
					+ '.h1fnt .h1ff { width:100%; margin:0; border:0; padding:0 5px 8px 0; box-sizing:border-box; }'
					+ '.h1fnt .h1ff select { max-width:100%; width:100%; }'
					+ '.h1fnt .h1ff textarea { max-width:100%; width:100%; max-height:100%; height:300px; box-sizing:border-box; }'
					+ '.h1fnt .h1ff input { max-width:100%; vertical-align:text-bottom; }'
					+ '.h1fnt .h1ffs .h1ff { float:left; }'
					+ '.h1fnt .h1ffs.h1ffw .h1ff { width:100%; padding-right:0; }'
					+ '.h1fnt .h1ffs.h1f2 .h1ff { width:50%; }'
					+ '.h1fnt .h1ffs.h1f3 .h1ff { width:33.3%; }'
					+ '.h1fnt .h1ffs.h1f4 .h1ff { width:25%; }'
					+ '.h1fnt label { display:block; font-size:11px; font-weight:700; margin:0 0 5px; padding:0; border:0; text-decoration:underline; }'
					+ '</style>'

					+ '<div id="h1fnt" class="h1fnt">'
						+ '<div class="h1ffs h1ffw">'
							+ '<div class="h1ff">'
								+ '<strong>Location:</strong> <span class="h1f-location"></span>'
							+ '</div>'
							+ '<div class="h1ff">'
								+ '<label>Notes</label>'
								+ '<textarea id="h1f-note"></textarea>'
							+ '</div>'
						+ '</div>'
					+ '</div>'
				+ '</div>' ).appendTo( 'body' ) )
			};
			T.UI.dia = T.UI.ntui.find( '#h1fnt' );

			// method to show the edit note box
			T.edit_note = function( x, y ) {
				var nts_obj = HAX.NTs.get_instance(),
						nt = nts_obj.get_note( x, y ),
						loc = '[' + x + '|' + y + ']',
						dialog_title = nts_obj.has_note( x, y ) ? 'Edit Note' : 'New Note';

				// empty the form
				T.UI.dia.find( 'input, select, textarea' ).val( '' );

				// fill out the data from the current note
				T.UI.dia.find( '.h1f-location' ).text( loc );
				T.UI.dia.find( '#h1f-note' ).val( nt.note );

				// open the dialog for the note editor
				T.UI.dia.dialog( {
					modal: true,
					title: dialog_title,
					maxWidth:'100%',
					width:450,
					buttons: {
						'Save': function() {
							// update the sqaure's note from the form
							nt.note = T.UI.dia.find( '#h1f-note' ).val();
							
							// save the bookmark
							HAX.log( 'Saving Note', nt );
							nts_obj.save_note( x, y, nt );
							T.UI.dia.dialog( 'close' ).dialog( 'destroy' );
						},
						'Cancel': function() { T.UI.dia.dialog( 'close' ).dialog( 'destroy' ); },
						'Delete': function() {
							if ( confirm( 'Are you sure you want to delete the note for [' + x + '|' + y + ']?' + "\n\n" + '"' + nt.note + '"' ) ) {
								nts_obj.delete_note( nt.x, nt.y );
								T.UI.dia.dialog( 'close' ).dialog( 'destroy' );
							}
						}
					}
				} );
			};

			// handle clicks of the edit note links
			$( document ).on( 'click.h1fnts', '.popup [role="edit-note"]', function() {
				// otherwise, load the edit dialog
				var me = $( this ),
						info = $.extend( {}, me.data( 'info' ) );
				delete info.i;
				T.edit_note( info.x, info.y );
			} );
		}

		var instance;
		NTUI.get_instance = function() {
			// if there is no instance yet, then make one
			if ( ! instance )
				instance = new HAX.NoteTaker();

			return instance;
		};

		return NTUI;
	} )();
} )( window, document, HAX );

// the feature that aggregates and displays a city overview
( function( W, D, HAX ) {
	var H = HAX.H;

	// keeps track of town resources, builds, and researches
	HAX.TownTrack = ( function() {
		var town_stats = {}, // eventually we want to load this from cache // HAX.LS.fetch( 'town-stats' ) || {},
				lvl_prod = {
					'L0': { lvl:0, food:0, rez:7, tick:7/3600 },
					'L1': { lvl:1, food:1, rez:7, tick:7/3600 },
					'L2': { lvl:2, food:1, rez:15, tick:15/3600 },
					'L3': { lvl:3, food:2, rez:26, tick:26/3600 },
					'L4': { lvl:4, food:3, rez:40, tick:40/3600 },
					'L5': { lvl:5, food:4, rez:57, tick:57/3600 },
					'L6': { lvl:6, food:5, rez:77, tick:77/3600 },
					'L7': { lvl:7, food:6, rez:100, tick:100/3600 },
					'L8': { lvl:8, food:7, rez:126, tick:126/3600 },
					'L9': { lvl:9, food:8, rez:155, tick:155/3600 },
					'L10': { lvl:10, food:9, rez:197, tick:197/3600 },
					'L11': { lvl:11, food:10, rez:281, tick:281/3600 },
					'L12': { lvl:12, food:12, rez:393, tick:393/3600 },
					'L13': { lvl:13, food:14, rez:538, tick:538/3600 },
					'L14': { lvl:14, food:16, rez:720, tick:720/3600 },
					'L15': { lvl:15, food:18, rez:943, tick:943/3600 },
					'L16': { lvl:16, food:21, rez:1207, tick:1207/3600 },
					'L17': { lvl:17, food:24, rez:1508, tick:1508/3600 },
					'L18': { lvl:18, food:28, rez:1839, tick:1839/3600 },
					'L19': { lvl:19, food:32, rez:2188, tick:2188/3600 },
					'L20': { lvl:20, food:37, rez:2538, tick:2538/3600 }
				},
				// headers for the basic resources table
				html_basic_headers = '<thead class="basic-headers"><tr class="headers hbasic">'
						+ '<th res="name"></th>' // Town Name header
						+ '<th res="[@i=4|1]"></th>' // gold
						+ '<th res="[@i=1|1]"></th>' // wood
						+ '<th res="[@i=1|2]"></th>' // clay
						+ '<th res="[@i=1|3]"></th>' // iron
						+ '<th res="[@i=1|4]"></th>' // stone
						+ '<th res="[@i=1|5]"></th>' // food
						+ '<th res="[@i=2|1]"></th>' // mana
						+ '<th res="[@i=2|2]"></th>' // research
					+ '</tr></thead>',
				// headers for the advanced resources table
				html_adv_headers = '<thead class="adv-headers"><tr class="headers hbasic">'
						+ '<th res="name"></th>' // Town Name header
						+ '<th class="resTxt" res="[@i=3|1]"></th>' // horses
						+ '<th class="resTxt" res="[@i=3|2]"></th>' // livestock
						+ '<th class="resTxt" res="[@i=3|12]"></th>' // beer
						+ '<th class="resTxt" res="[@i=3|7]"></th>' // books
						+ '<th class="resTxt" res="[@i=3|5]"></th>' // spears
						+ '<th class="resTxt" res="[@i=3|3]"></th>' // swords
						+ '<th class="resTxt" res="[@i=3|4]"></th>' // bows
						+ '<th class="resTxt" res="[@i=3|6]"></th>' // saddles
						+ '<th class="resTxt" res="[@i=3|8]"></th>' // leather armor
						+ '<th class="resTxt" res="[@i=3|9]"></th>' // chain armor
						+ '<th class="resTxt" res="[@i=3|10]"></th>' // plate armor
						+ '<th class="resTxt" res="[@i=3|11]"></th>' // siege blocks
					+ '</tr></thead>',
				// block template for the basic resources table
				html_basic_blocks = '<tbody><tr class="top vals">'
						+ '<td rowspan="3" class="name">' // town name
						+ '<td class="resTxt" res="[@i=4|1]"></td>' // gold
						+ '<td class="resTxt" res="[@i=1|1]"></td>' // wood
						+ '<td class="resTxt" res="[@i=1|2]"></td>' // clay
						+ '<td class="resTxt" res="[@i=1|3]"></td>' // iron
						+ '<td class="resTxt" res="[@i=1|4]"></td>' // stone
						+ '<td class="resTxt" res="[@i=1|5]"></td>' // food
						+ '<td class="resTxt" res="[@i=2|1]"></td>' // mana
						+ '<td class="resTxt" res="[@i=2|2]"></td>' // research
					+ '</tr><tr class="mid incs">'
						+ '<td class="resInc" res="[@i=4|1]"></td>' // gold
						+ '<td class="resInc" res="[@i=1|1]"></td>' // wood
						+ '<td class="resInc" res="[@i=1|2]"></td>' // clay
						+ '<td class="resInc" res="[@i=1|3]"></td>' // iron
						+ '<td class="resInc" res="[@i=1|4]"></td>' // stone
						+ '<td class="resInc" res="[@i=1|5]"></td>' // food
						+ '<td class="resInc" res="[@i=2|1]"></td>' // mana
						+ '<td class="resInc" res="[@i=2|2]"></td>' // research
					+ '</tr><tr class="mid times">'
						+ '<td class="resTime" res="[@i=4|1]"></td>' // gold
						+ '<td class="resTime" res="[@i=1|1]"></td>' // wood
						+ '<td class="resTime" res="[@i=1|2]"></td>' // clay
						+ '<td class="resTime" res="[@i=1|3]"></td>' // iron
						+ '<td class="resTime" res="[@i=1|4]"></td>' // stone
						+ '<td class="resTime" res="[@i=1|5]"></td>' // food
						+ '<td class="resTime" res="[@i=2|1]"></td>' // mana
						+ '<td class="resTime" res="[@i=2|2]"></td>' // research
					+ '</tr><tr class="build">'
						+ '<td >&nbsp;</td>' // spacer
						+ '<td colspan="8" class="builds"></td>' // builds and techs
					+ '</tr></tbody>',
				// block template for the advanced resources table
				html_adv_blocks = '<tbody><tr class="mid adv-vals advres top">'
						+ '<td rowspan="2" class="name">' // town name
						+ '<td class="resTxt" res="[@i=3|1]"></td>' // horses
						+ '<td class="resTxt" res="[@i=3|2]"></td>' // livestock
						+ '<td class="resTxt" res="[@i=3|12]"></td>' // beer
						+ '<td class="resTxt" res="[@i=3|7]"></td>' // books
						+ '<td class="resTxt" res="[@i=3|5]"></td>' // spears
						+ '<td class="resTxt" res="[@i=3|3]"></td>' // swords
						+ '<td class="resTxt" res="[@i=3|4]"></td>' // bows
						+ '<td class="resTxt" res="[@i=3|6]"></td>' // saddles
						+ '<td class="resTxt" res="[@i=3|8]"></td>' // leather armor
						+ '<td class="resTxt" res="[@i=3|9]"></td>' // chain armor
						+ '<td class="resTxt" res="[@i=3|10]"></td>' // plate armor
						+ '<td class="resTxt" res="[@i=3|11]"></td>' // siege blocks
					+ '</tr><tr class="bot adv-incs advres">'
						+ '<td class="resInc" res="[@i=3|1]"></td>' // horses
						+ '<td class="resInc" res="[@i=3|2]"></td>' // livestock
						+ '<td class="resInc" res="[@i=3|12]"></td>' // beer
						+ '<td class="resInc" res="[@i=3|7]"></td>' // books
						+ '<td class="resInc" res="[@i=3|5]"></td>' // spears
						+ '<td class="resInc" res="[@i=3|3]"></td>' // swords
						+ '<td class="resInc" res="[@i=3|4]"></td>' // bows
						+ '<td class="resInc" res="[@i=3|6]"></td>' // saddles
						+ '<td class="resInc" res="[@i=3|8]"></td>' // leather armor
						+ '<td class="resInc" res="[@i=3|9]"></td>' // chain armor
						+ '<td class="resInc" res="[@i=3|10]"></td>' // plate armor
						+ '<td class="resInc" res="[@i=3|11]"></td>' // siege blocks
					+ '</tr></tbody>';

		// we want to carry as much information as possible from session to session, so lets add a way to store all data about a town we can between sessions
		function save_town_stats() {
			// save the town stats
			var TS = $.extend( true, {}, town_stats ), i;
			// never store techs and builds in LS
			for ( i in TS ) {
				TS[ i ].build = [];
				TS[ i ].tech = [];
			}
			//HAX.log( 'Saving All Town Stats:', TS, town_stats );
			HAX.LS.store( 'town-stats', TS );
		}

		// update the loaded town res values based on the last tick time and change value
		function update_town_stats() {
			var now = ( new Date() ).getTime(), i, j, k;
			// cycle through the towns we have on file
			for ( i in town_stats ) if ( town_stats[ H ]( i ) ) {
				var stats = town_stats[ i ];
				// cycle through this town's resources, and run the updates
				if ( HAX.is( stats.res ) ) for ( j in stats.res ) if ( stats.res[ H ]( j ) )
					stats.res[ j ].val += ( Math.round( ( now - stats.last_tick ) / 1000 ) * stats.res[ j ].chg );

				// update the last tick timer
				stats.last_tick = now;
			}

			save_town_stats();
		};
		update_town_stats();

		// town track guts
		function TT() {
			var T = this,
					box;

			// update the resource amount text. we have to reinvent this function because the global one assumes that the maxStorage to compare is the global one
			var innerSetRes = function(a, b) {
				var c = (currentResTick - LastResTick) / 1e3,
						d = new goog.i18n.NumberFormat(goog.i18n.NumberFormat.Format.DECIMAL),
						e = parseFloat($(b).attr("data")) + parseFloat($(b).attr("inc")) * c,
						f = HAX.toInt( $(b).attr( 'maxval' ) );
				"true" == $(b).attr("hasmax") && f <= e && (e = f, $(b).addClass("resFull")), 0 > e && (e = 0), $(b).attr("data", e), e = e > 1e9 ? d.format((e / 1e7 | 0) / 100) + "Bn" : e > 1e6 ? d.format((e / 1e4 | 0) / 100) + "M" : d.format(0 | e), $(b).text(e), e = d = null
			}

			// override the setRes global function, so that we can update the memory stored res counts
			HAX.SetRes.register( function() {
				// update the town stats for this tick
				update_town_stats();

				var box = T.box(),
						maxw = HAX.toInt( ( box.outerWidth( true ) / 12 ) * .8 );
				// update the res counts in our overview
				box.find( 'td.resTxt' ).each( innerSetRes );
				// update the storage capacity estimators in our overview
				box.find( 'td.resTime' ).each( function() {
					var me = $( this ),
							end = new Date( HAX.toInt( me.attr( 'end' ) ) ),
							diff = Math.max( 0, end - HAX.toInt( ( new Date() ).getTime() / 1000 ) );
					me.find( '> div:eq(0)' ).css( 'width', maxw ).attr( 'title', SecToText( diff ) ).text( SecToText( diff ) );
				} );
			} );

			// Override the setNextEventsProgress function, to additionally update the progress bars in our overview
			HAX.SetNextEventsProgress.register( function() {
				var box = T.box();
				box.find( 'span.progTime' ).each( innerSetProgress2 );
				box.find( 'div.progBarNE' ).each( innerSetNextEventsProgressUpdate );

				// cycle through all the times, and find any that have expired. remove them if they expired more than 1 second ago
				box.find( 'span.progTime' ).each( function() {
					var c = $( this ).attr( "data" ).split( "|" ),
							e = new Date( HAX.toInt( c[1] ) ),
							f = ( e - progressNextEventsCurrentDate );

					// if the item has not expired, then skip it
					if ( f > 0 )
						return;

					// otherwise, remove the item
					var item = $( this ).closest( '.item-wrap' ),
							wrap_type = item.attr( 'wrap' ),
							tr = item.closest( 'tr[data-id]' ),
							tid = tr.data( 'id' );

					// remove the item from the town information, if the town information exists (it should)
					if ( HAX.is( town_stats[ 't' + tid ] ) ) {
						if ( $.inArray( wrap_type, [ 'build', 'tech' ] ) >= 0 ) {
							town_stats[ 't' + tid ][ wrap_type ] = town_stats[ 't' + tid ][ wrap_type ].slice( 1 );
							item.remove();
						}
					}

					// save the town data
					save_town_stats();

					// refresh the town list
					T.refresh_town_list();
				} );
			} );

			// get the box that holds the town overview stats
			T.box = function() {
				// if the box is not already present, create it
				if ( ! HAX.is( box ) || ! box || ! HAX.is( box.length ) || ! box.length ) {
					var pos = HAX.LS.fetch( 'city-overview-location' ) || false,
							html = '<div id="town-overview-ui">'
									+ '<style>'
										+ '.h1f-clear { clear:both; }'
										+ '.h1f-clear::after { display:block; height:0; overflow:hidden; }'
										+ '.h1f-clear::after { clear:both; display:block; height:0; overflow:hidden; }'
										+ '#town-overview-ui .helper { font-style:italic; color:#5c5c5c; font-size:9px; margin-bottom:0.7em; }'
										+ '#town-overview-ui table { width:100%; }'
										+ '#town-overview-ui table div { box-sizing:border-box; }'
										+ '#town-overview-ui table th { text-align:left; }'
										+ '#town-overview-ui table td.resInc,'
										+ '#town-overview-ui table td.resTxt { text-align:left; width:50px; max-width:50px; }'
										+ '#town-overview-ui table td.name div.wrap { position:relative; }'
										+ '#town-overview-ui table td.name { width:150px; }'
										+ '#town-overview-ui table td.name div.name { padding-left:15px; width:150px; max-height:33px; }'
										+ '#town-overview-ui table td.name div.show-hide { width:13px; height:11px; font-weight:700; color:#080; position:absolute; top:0; left:0; text-align:center; }'
										+ '#town-overview-ui table td.name div.show-hide:hover { background-color:#080; color:#fff; }'
										+ '#town-overview-ui table tr.top td { padding:3px 6px 0 4px; font-size:9px; border-top:1px solid #542d04; }'
										+ '#town-overview-ui table tr.build { display:none; }'
										+ '#town-overview-ui table tr.mid td { padding:1px 6px 0 4px; font-size:8.5px; }'
										+ '#town-overview-ui table tr.bot td { padding:1px 6px 3px 4px; font-size:9px; }'
										+ '#town-overview-ui table tr.build td { padding:0; margin:0; }'
										+ '#town-overview-ui table tr.build td div.build-list { padding:0 0 3px; font-size:9px; }'
										+ '#town-overview-ui table tr.build td .build-wrap { diaplay:block; float:left; clear:none; padding:0 10px 0 0; width:50%; position:relative; }'
										+ '#town-overview-ui table tr.build td .tech-wrap { diaplay:block; float:left; clear:none; padding:2px 10px 0 0; width:50%; position:relative; }'
										+ '#town-overview-ui table tr.build td .tech-wrap .ui-progressbar .ui-widget-header { background:#0f0; }'
										+ '#town-overview-ui table tr.build td .build-wrap .tytle,'
										+ '#town-overview-ui table tr.build td .tech-wrap .tytle { font-weight:bold; font-style:italic; text-overflow:hidden; overflow:hidden; white-space:nowrap; }'
										+ '#town-overview-ui table#town-overview tr td.resIco { padding:0 0 0 2px; }'
										+ '#town-overview-ui table td.resTime div { height:11px; text-overflow:hidden; overflow:hidden; width:50px; white-space:nowrap; }'
										+ '#town-overview-ui #advanced-overview .show-hide { display:none; }'
										+ '#town-overview-ui #advanced-overview td.name div.name { padding-left:0; }'
										+ '#town-overview-ui .tabs { font-size:9.5px; }'
										+ '#town-overview-ui .panels .panel { display:none; }'
										+ '#town-overview-ui .panels .panel:first-child { display:block; }'
									+ '</style>'
									+ '<div class="helper">Towns show in this list once they have been visited at least once, this page load.</div>'
									+ '<div id="town-overview">'
										+ '<div class="tabs">'
											+ '<a href="#basic-overview">basic</a> | '
											+ '<a href="#advanced-overview">advanced</a>'
										+ '</div>'
										+ '<div class="panels">'
											+ '<div id="basic-overview" class="panel">'
												+ '<table cellpadding="0" cellspacing="0"></table>'
											+ '</div>'
											+ '<div id="advanced-overview" class="panel">'
												+ '<table cellpadding="0" cellspacing="0"></table>'
											+ '</div>'
										+ '</div>'
									+ '</div>'
								+ '</div>',
							dia_args = {
								autoOpen: true,
								maxWidth: '100%',
								width: 720,
								title: 'Town Overview',
								draggable: true,
								resizeable: true,
								dragStop: function() { HAX.LS.store( 'city-overview-location', $( this ).offset() ); }
							},
							css = { position:'fixed' };

					// if the position was saved, then load it now
					if ( pos && $.isPlainObject( pos ) )
						css = $.extend( css, pos );

					// create the dialog
					box = $( html ).dialog( dia_args );

					// update the position of the dialog
					box.closest( '.ui-dialog' ).css( css );
				}

				return box;
			}

			// format a positive or negative number
			function posneg( num, icon, row ) {
				var sign = ( num > 0 ? '+' : ( num == 0 ? '' : '-' ) ),
						cls = ( num == 0 ? 'resZero' : ( num < 0 ? 'resFull' : 'resPos' ) ),
						ele = row.find( '[res="' + icon + '"]' );
				ele.addClass( cls ).text( sign + Math.abs( num ) );
			}

			// update the list of cities
			T.refresh_town_list = function() {
				var box = T.box(),
						maxw = HAX.toInt( ( box.outerWidth( true ) / 12 ) * .8 ),
						basic_table = box.find( '#basic-overview table' ),
						adv_table = box.find( '#advanced-overview table' );

				// first lest clear out the table completely
				basic_table.empty();
				adv_table.empty();

				// if there is no town data, then bail now
				if ( ! Object.keys( town_stats ).length )
					return;
				var first = town_stats[ Object.keys( town_stats ).shift() ], i, j, k, m;

				// first, lets refresh the headers
				if ( HAX.is( first ) && HAX.is( first.res ) && $.isPlainObject( first.res ) ) {
					var rows = $( html_basic_headers ).appendTo( basic_table );
					rows.find( '[res="name"]' ).text( 'Town - Basic' );
					for ( i in first.res ) if ( first.res[ H ]( i ) )
						rows.find( '[res="' + first.res[ i ].icon + '"]' ).html( popupifyChat( first.res[ i ].icon, CurRaceId, CurGenderId ) );
				}
				if ( HAX.is( first ) && HAX.is( first.advres ) && $.isPlainObject( first.advres ) ) {
					var rows = $( html_adv_headers ).appendTo( adv_table );
					rows.find( '[res="name"]' ).text( 'Town - Advanced' );
					for ( i in first.advres ) if ( first.advres[ H ]( i ) )
						rows.find( '[res="' + first.advres[ i ].icon + '"]' ).html( popupifyChat( first.advres[ i ].icon, CurRaceId, CurGenderId ) );
				}

				// next add the towns we know about to the list
				for ( i in town_stats ) if ( town_stats[ H ]( i ) ) {
					var stats = town_stats[ i ],
							d = new goog.i18n.NumberFormat(goog.i18n.NumberFormat.Format.DECIMAL),
							block = $( html_basic_blocks ).appendTo( basic_table ),
							block_adv = $( html_adv_blocks ).appendTo( adv_table ),
							tid = i.substr( 1 ),
							tr = block.find( 'tr.vals' ).attr( 'data-id', tid ).data( 'open', 0 ),
							tr2 = block.find( 'tr.incs' ).attr( 'data-id', tid ),
							tr3 = block.find( 'tr.times' ).attr( 'data-id', tid ),
							tra1 = block_adv.find( 'tr.adv-vals' ).attr( 'data-id', tid ),
							tra2 = block_adv.find( 'tr.adv-incs' ).attr( 'data-id', tid ),
							trb = block.find( 'tr.build' ).attr( 'data-id', tid ),
							bl = $( '<div class="build-list"></div>' ).appendTo( trb.find( 'td.builds' ) ),
							// add the name column
							name_col = block.add( block_adv ).find( '.name' ).html(
									'<div class="wrap">'
										+ '<div class="show-hide">[+]</div>'
										+ '<div class="name">' + stats.name + '</div>'
									+ '</div>'
								);

					// add the 'show/hide' toggle
					name_col.find( '.show-hide' ).click( function( e, cur ) {
						e.preventDefault();
						e.stopPropagation();
						var tr = $( this ).closest( 'tr' ),
								cur = cur || tr.data( 'open' );

						// if the lists are already open, close them
						if ( cur ) {
							tr.nextAll( /* 'tr.mid:eq(0),' + /* tr.bot:eq(0), */ 'tr.build:eq(0)' ).hide();
							tr.data( 'open', 0 );
							HAX.LS.store( 'open-' + tr.data( 'id' ), 0 );
						// otherwise open them
						} else {
							tr.nextAll( /* 'tr.mid:eq(0),' + /* tr.bot:eq(0), */ 'tr.build:eq(0)' ).show();
							tr.data( 'open', 1 );
							HAX.LS.store( 'open-' + tr.data( 'id' ), 1 );
						}
					} );
					name_col.find( '.show-hide' ).trigger( 'click', [ ! HAX.LS.fetch( 'open-' + i.substr( 1 ) ) ] );

					// add columns for each res/advres and res/advres inc
					var keys = {
						res: { vals:tr, incs:tr2, times:tr3 },
						advres: { vals:tra1, incs:tra2, times:$() }
					};
					// cycle through the various groups of reses to report on
					for ( k in keys ) {
						// cycle through the reses in this group
						for ( j in stats[ k ] ) if ( stats[ k ][ H ]( j ) && stats[ k ][ H ]( j ) ) {
							var e = stats[ k ][ j ].val,
									ico = stats[ k ][ j ].icon;

							// add the displayed current value
							keys[ k ].vals.find( '[res="' + ico + '"]' ).attr( {
								k:j,
								inc:stats[ k ][ j ].chg,
								data:stats[ k ][ j ].val,
								maxval: stats.maxStorage,
								hasmax: stats[ k ][ j ].hasmax ? 'true' : 'false'
							} ).filter( '.resTxt' ).each( innerSetRes );

							// add the amoutn increased per hour, for reference
							posneg( stats[ k ][ j ].inc, ico, keys[ k ].incs );


							if ( ! stats[ k ][ j ].hasmax || e < stats.maxStorage ) {
								// add the estimated time to hit the max
								if ( keys[ k ].times.length ) {
									if ( stats[ k ][ j ].hasmax && stats[ k ][ j ].inc > 0 ) {
										var diff = Math.max( 0, HAX.toInt( HAX.toFloat( stats.maxStorage - stats[ k ][ j ].val ) / stats[ k ][ j ].chg ) );
										keys[ k ].times.find( '[res="' + ico + '"]' ).html( '<div title="' + SecToText( diff ) + '" style="width:' + maxw + 'px">' + SecToText( diff ) + '</div>' )
												.attr( 'end', HAX.toInt( ( new Date() ).getTime() / 1000 ) + diff );
									} else if ( stats[ k ][ j ].inc < 0 ) {
										var diff = Math.max( 0, HAX.toInt( HAX.toFloat( stats[ k ][ j ].val ) / -stats[ k ][ j ].chg ) );
										keys[ k ].times.find( '[res="' + ico + '"]' ).html( '<div title="' + SecToText( diff ) + '" style="width:' + maxw + 'px">' + SecToText( diff ) + '</div>' )
												.attr( 'end', HAX.toInt( ( new Date() ).getTime() / 1000 ) + diff );
									}
								}
							} else {
								keys[ k ].vals.find( '[res="' + ico + '"]' ).addClass( 'resFull' );
								keys[ k ].times.find( '[res="' + ico + '"]' ).addClass( 'resFull' ).text( 'max' );
							}
						}
					}

					// add the builds to the list container
					for ( i = 0; i < stats.build.length; i++ ) {
						var build = stats.build[ i ],
								build_cont = $( '<div wrap="build" class="item-wrap build-wrap"></div>' ).appendTo( bl ),
								// when demolishing a building we need to mark that on our overview
								build_method = 'demolishing' == build.method ? 'DEMO: ' : '';

						// add the title to the overview
						$( '<div class="tytle"></div>' ).text( build_method + build.building + ' to LVL ' + build.level ).appendTo( build_cont );

						// add the timer to the overview
						build.time.clone( true ).css( { top:9 } ).appendTo( build_cont )

						// add the progress bar to the over view
						$( '<div class="progBarNE" style="' + build.prog.style + '" data="' + build.prog.data + '"></div>' ).appendTo( build_cont ).each( innerSetNextEventsProgressCreate );
					}
					$( '<div class="h1f-clear"></div>' ).appendTo( bl );

					// add the techs to the list container
					for ( i = 0; i < stats.tech.length; i++ ) {
						var tech = stats.tech[ i ],
								tech_cont = $( '<div wrap="tech" class="item-wrap tech-wrap"></div>' ).appendTo( bl );

						// add the tech title to the overview
						$( '<div class="tytle"></div>' ).text( tech.title ).appendTo( tech_cont );

						// add the tech research timer to the overview
						tech.time.clone().css( { top:11 } ).appendTo( tech_cont )

						// add the progressbar to the overview
						$( '<div class="progBarNE" style="' + tech.prog.style + '" data="' + tech.prog.data + '"></div>' ).appendTo( tech_cont ).each( innerSetNextEventsProgressCreate );
					}
					$( '<div class="h1f-clear"></div>' ).appendTo( bl );
				}
			};

			// update all data about the current town
			T.track_current_town = function() {
				var stats = {
					name: $( '#optTown option[value="' + CurrentTown + '"]' ).text(),
					last_tick: ( new Date() ).getTime(),
					res: {},
					advres: {},
					build: [],
					tech: []
				};

				// if the max storage is available, update it now
				if ( HAX.is( W[ 'maxStorage' ] ) )
					stats.maxStorage = W[ 'maxStorage' ];

				// if the town map coords are available, update them now
				if ( HAX.is( W[ 'townX' ] ) && HAX.is( W[ 'townY' ] ) ) {
					stats.townX = W[ 'townX' ];
					stats.townY = W[ 'townY' ];
				}

				// find all the basic res and store them
				$( '#tbRes td.resTxt' ).each( function() {
					var td = $( this ), inc_tr = td.closest( 'tr' ).next( 'tr' ),
							pos = td.prevAll( 'td.resTxt' ).length,
							icon = td.next( 'td.resIco' ).find( '> span.resIcon:eq(0)' );

					// fill out this stat
					stats.res[ icon.attr( 'title' ) ] = {
						val: HAX.toFloat( td.attr( 'data' ) ),
						hasmax: 'true' == td.attr( 'hasmax' ),
						chg: HAX.toFloat( td.attr( 'inc' ) ),
						inc: HAX.toInt( inc_tr.find( 'td.resInc:eq(' + pos + ')' ).attr( 'data' ) ),
						icon: '[@' + icon.attr( 'data' ) + ']'
					};
				} );

				// find all the advanced res and store them
				$( '#advRes td.resTxt' ).each( function() {
					var td = $( this ), inc_tr = td.closest( 'tr' ).next( 'tr' ),
							pos = td.prevAll( 'td.resTxt' ).length,
							icon = td.next( 'td.resIco' ).find( '> span.resIcon:eq(0)' );

					// fill out this stat
					stats.advres[ icon.attr( 'title' ) ] = {
						val: HAX.toFloat( td.attr( 'data' ) ),
						hasmax: 'true' == td.attr( 'hasmax' ),
						chg: HAX.toFloat( td.attr( 'inc' ) ),
						inc: HAX.toInt( inc_tr.find( 'td.resInc:eq(' + pos + ')' ).attr( 'data' ) ),
						icon: '[@' + icon.attr( 'data' ) + ']'
					};
				} );

				// find the builds and techs
				$( '#NextEvents' ).each( function() {
					var wrap = $( this );

					// builds rows
					var builds = [ 'tbody tr.middle:eq(2) td:eq(1) > div', 'tbody tr.middle:eq(3) td:eq(1) > div' ];
					$.each( builds, function( i, v ) {
						var build = wrap.find( v );
						if ( build.length ) {
							var prog = build.find( '.progBarNE' ),
									bargs = {
										title: build.find( '> span:eq(0)' ).text(),
										time: build.find( '.progTime' ).clone( true ),
										prog: { style:prog.attr( 'style' ), data:prog.attr( 'data' ) }
									},
									parts = bargs.title.match( /^\s*(Upgrading|Demolishing) (.*?) to Level (\d+)\s*$/ );
							bargs.method = $.isArray( parts ) && HAX.is( parts[1] ) ? parts[1].toLowerCase() : 'upgrading';
							bargs.building = $.isArray( parts ) && HAX.is( parts[2] ) ? parts[2] : '(Unknown)';
							bargs.level = $.isArray( parts ) && HAX.toInt( HAX.is( parts[3] ) ? parts[3] : 0 );

							// if we found an item here, then add it to our list
							if ( bargs.title && HAX.is( bargs.time.length ) )
								stats.build.push( bargs );
						}
					} );

					// tech rows
					var builds = [ 'tbody tr.middle:eq(4) td:eq(1) > div', 'tbody tr.middle:eq(5) td:eq(1) > div' ];
					$.each( builds, function( i, v ) {
						var tech = wrap.find( v );
						if ( tech.length ) {
							var prog = tech.find( '.progBarNE' )
							stats.tech.push( {
								title: tech.find( '> span:eq(0)' ).text(),
								time: tech.find( '.progTime' ).clone( true ),
								prog: { style:prog.attr( 'style' ), data:prog.attr( 'data' ) }
							} );
						}
					} );
				} );

				// update these stats for the current town
				town_stats[ 't' + CurrentTown ] = $.extend( true, {}, HAX.is( town_stats[ 't' + CurrentTown ] ) ? town_stats[ 't' + CurrentTown ] : {}, stats );
				save_town_stats();

				T.refresh_town_list();
			};

			// when the name of a town is clicked inside our overview, we need to update the current town programmatically
			$( D ).on( 'click', '#town-overview-ui td.name div.name', function() {
				var id = HAX.toInt( $( this ).closest( 'tr' ).data( 'id' ) );
				if ( id )
					ChangeTownFocus( id );
			} );

			// handle the tabs on the overview screen
			$( D ).on( 'click', '#town-overview .tabs a', function( e ) {
				e.preventDefault();
				var panels = $( this ).parent( '.tabs' ).nextAll( '.panels' );
				panels.find( $( this ).attr( 'href' ) ).siblings( '.panel' ).hide();
				panels.find( $( this ).attr( 'href' ) ).fadeIn( 250 );
			} );

			// register a menu item to display for toggling the dialog
			HAX.Menu.register( 'town-overview', {
				icon: '<div class="ov-icon">OV</div>',
				label: 'Town Overview',
				events: {
					click: function() {
						var dialog = T.box(),
								pos = HAX.LS.fetch( 'city-overview-location' ) || false,
								css = { position:'fixed' };

						// if the position was saved, then load it now
						if ( pos && $.isPlainObject( pos ) )
							css = $.extend( css, pos );

						// toggle the visibility of the dialog
						if ( dialog.dialog( 'isOpen' ) )
							dialog.dialog( 'close' );
						else
							dialog.dialog( 'open' ).closest( '.ui-dialog' ).css( css );
					}
				}
			} );
		}

		var instance;
		// handle the singleton for this class
		TT.get_instance = function( options ) {
			// if the instance does not yet exist, create it
			if ( ! HAX.is( instance ) )
				instance = new TT();

			return instance;
		};

		return TT;
	} )();

	// when on the world map page, we need to add the bookmark list icon, and the actions that control the list
	HAX.Ajax.register( '^\/Home\/UpdateResources', function() {
		HAX.TownTrack.get_instance().track_current_town();
	} );

	$( function() { HAX.TownTrack.get_instance().track_current_town(); } );
} )( window, document, HAX );
  
$( function() { $( window ).trigger( 'hashchange' ); } );

} )() } catch ( ERR ) {
  console.log( 'BOOKMARK ERROR:', ERR, ERR.stack );
}
