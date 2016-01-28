// ==UserScript==
// @name        HaxorOne's Map Bookmarks and Notes
// @namespace   haxorone.illyriad.bandn
// @description Allows you to manage a list of bookmarks on Illyriad. Also enables the ability to add a note to any sqaure on the map.
// @version     0.9.0-beta
// @grant       none
// @author      HaxorOne
// @match       http://*.illyriad.co.uk/
// ==/UserScript==
/* jshint -W097 */
'use strict';

try { ( function() {

// if there is no jQuery, bail now
if ( ! window.jQuery ) {
	console.log( 'jQuery is not present. Bailing' );
	return;
}

var HAX = $.extend( {}, HAX );
window.HAX = HAX;

/* Generic Required functionality */
( function( W, D, HAX ) {
	var H = 'hasOwnProperty';

	// generic tools
	HAX.is = function( v ) { return 'undefined' != typeof v && null !== v; };
	HAX.toInt = function(val) { var n = parseInt(val); return isNaN(n) ? 0 : n; };
	HAX.toFloat = function(val) { var n = parseFloat(val); return isNaN(n) ? 0 : n; };
	HAX.pl = function(n, p) { return HAX.toFloat(n).toFixed(p); };
	HAX.dist_cur_town = function( x, y ) { var dist_x = ( townX - x ), dist_y = ( townY - y ); return HAX.pl( Math.sqrt( ( dist_x * dist_x ) + ( dist_y + dist_y ) ), 2 ); };
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

	// handle location changes when they occur. also allow registration of things to do when locations change
	HAX.Location = ( function() {
		// holder for functions to call when certain page locations are reached
		var cb = HAX.callbacks.get_instance( 'locatin' );

		// function to get the location hash of the page we are currently on
		function get_page_hash() {
			var parts = W.location.hash.substr( 1 ).toLowerCase().split( /\// ).filter( function( a ) { return '' != a; } );
			return { core:parts.slice( 0, 2 ), core_string:parts.slice( 0, 2 ).join( '/' ), params:parts.slice( 2 ), all:parts, raw:W.location.hash.substr( 1 ) };
		}

		// function that handle all the responses to hash changes (page changes)
		function on_hash_change() {
			var hash = get_page_hash();
			cb.run( hash.core_string );
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

	/* when the normal tooltip pops up, we may have overrides or additions to it. this code handles that manipulation */
	HAX.Tip = ( function() {
		var orig_tip = W.Tip,
				cb = HAX.callbacks.get_instance( 'tip' );

		// override the Tip() function so we can inject new links in the tooltips
		W.Tip = function() {
			var args = [].slice.call( arguments );

			// maybe augment the html
			if ( '' !== args[0] ) {
				var bms_obj = HAX.BMs.get_instance(),
						html = $( '<div>' + args[0] + '</div>' );

				// run all attached callbacks
				cb.run( 'draw-tip', [ html ] );

				// convert the results back to an html string
				args[0] = html.html();
			}

			// pass through to original function
			return orig_tip.apply( this, args );
		}

		var intrfc = {
			// allow the passer to register a function to be called when a given location is hit
			register: function( func, priority ) {
				// normalize the priority we will use for this callback
				var priority = priority || '10',
						func = func || function() {};

				return cb.register( 'draw-tip', func, priority );
			},

			// allow the passer to deregister a function
			deregister: function( func, priority ) {
				var func = func || function() {};
				return cb.deregister( 'draw-tip', func, priority );
			}
		};

		return intrfc;
	} )();
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
	var H = 'hasOwnProperty';

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
							HAX.log( 'compare', i, pairs[ i ], j, holder[ j ], field.filter( pairs[ i ], field, holder[ j ] ), holder[ j ] );
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
						+ '.h1fbm h2 { margin-bottom:5px; }'
						+ '.h1fbm .h1fbl { max-width:60%; width:100%; overflow-x:hidden; overflow-y:auto; height:100%; float:left; clear:none; }'
						+ '.h1fbm .h1fbl a { display:block; width:100%; padding:0.5em 0.7em; line-height:1.3em; font-size:9px; float:left; clear:none; }'
						+ '.h1fbm .h1fbl a .inner { width:100%; overflow-x:hidden; }'
						+ '.h1fbm .h1fbl a .title { white-space:nowrap; width:100%; overflow-x:hidden; }'
						+ '.h1fbm .h1fbl a .meta { font-style:italic; color:#888; }'
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
				var fields = HAX.BMs.get_instance().get_fields();

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
					link.attr( { href:url, title:bm.title } ).appendTo( T.UI.list );
					link.find( '.title' ).text( '(' + distance + 'sq) ' + bm.title );

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

				HAX.log( 'Filtering Bookmark List', filters );

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
	var H = 'hasOwnProperty';

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
  
$( function() { $( window ).trigger( 'hashchange' ); } );

} )() } catch ( ERR ) {
  console.log( 'BOOKMARK ERROR:', ERR, ERR.stack );
}
