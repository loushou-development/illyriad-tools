( function( W, D ) {
	var CURRENT_VERSION = '0.1.0',
			CHANGELOG = [
				{ version:'0.1.0', changes:[
					'Added "Distance" to popups.',
					'Fixed maxStorage display bug, based on tips from Millia36.',
					'Fixed "completed" build and tech bug, where they were not removed from city overview.'
				] }
			];

	// if the HAX lib is not present or if LS wrapper is not present, then bail
	if ( 'object' != typeof HAX || 'undefined' == typeof HAX.LS || null == HAX.LS ) {
		console.log( 'HAX: Version check failed. Could not find required code. Bail' );
		return;
	}

	// update the last checked version and the date it was checked. also update the changelog
	HAX.LS.store( 'latest-version', { VERSION:CURRENT_VERSION, last_check:( new Date() ).toString() } );
	HAX.LS.store( 'latest-changelog', CHANGELOG );
} )( window, document );
