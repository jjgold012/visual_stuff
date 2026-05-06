const ident = [1,0,0,0,1,0];

let to_screen = [20, 0, 0, 0, -20, 0];
let lw_scale = 1;

let sys;

let scale_centre;
let scale_start;
let scale_ts;

let reset_but;
let tile_sel;
let colscheme_sel;

let ab_label;
let ab_slider;

let subst_button;
let translate_button;
let scale_button;
let dragging = false;
let uibox = true;

let a = 1.0;
let b = 1.7320508075688772;

const tile_names = [ 'H7', 'H8' ];

const colmap_orig = {
	'single' : [255, 255, 255],
	'unflipped' : [200, 200, 200],
	'flipped' : [150, 150, 150] };

let colmap = colmap_orig;

function chooseColour( label )
{
	return colmap[label];
}

// A 2D point

function pt( x, y )
{
	return { x : x, y : y };
}

// Create a representation for numbers of the form xa+yb, where x and y
// are coefficients and a and b are undefined (or symbolic) constants.

function makeAB( a, b )
{
	return { a : a, b : b };
}

function addAB( ab1, ab2 )
{
	return makeAB( ab1.a + ab2.a, ab1.b + ab2.b );
}

function subAB( ab1, ab2 )
{
	return makeAB( ab1.a - ab2.a, ab1.b - ab2.b );
}

function scaleAB( ab, alpha )
{
	return makeAB( ab.a * alpha, ab.b * alpha );
}

function evalAB( ab )
{
	return a*ab.a + b*ab.b;
}

function padd( P, Q )
{
	return pt( addAB( P.x, Q.x ), addAB( P.y, Q.y ) );
}

function psub( P, Q )
{
	return pt( subAB( P.x, Q.x ), subAB( P.y, Q.y ) );
}

// Add two values, both numbers or both ABs
function addAny( x, y )
{
	if( isNaN( x ) ) {
		return addAB( x, y );
	} else {
		return x + y;
	}
}

// Linear matrix inverse
function inv( T ) {
	const det = T[0]*T[3] - T[1]*T[2];
	return [T[3]/det, -T[1]/det, -T[2]/det, T[0]/det];
};

// Linear matrix multiply
function mul( A, B )
{
	return [A[0]*B[0] + A[1]*B[2], 
		A[0]*B[1] + A[1]*B[3],

		A[2]*B[0] + A[3]*B[2], 
		A[2]*B[1] + A[3]*B[3]];
}

// Rotation matrix
function trot( ang )
{
	const c = cos( ang );
	const s = sin( ang );
	return [c, -s, s, c];
}

function transAB( M, P )
{
	return pt(
		addAB( scaleAB( P.x, M[0] ), scaleAB( P.y, M[1] ) ), 
		addAB( scaleAB( P.x, M[2] ), scaleAB( P.y, M[3] ) ) );
}

// Affine matrix inverse
function invAffine( T ) {
	const det = T[0]*T[4] - T[1]*T[3];
	return [T[4]/det, -T[1]/det, (T[1]*T[5]-T[2]*T[4])/det,
		-T[3]/det, T[0]/det, (T[2]*T[3]-T[0]*T[5])/det];
};

// Affine matrix multiply
function mulAffine( A, B )
{
	return [A[0]*B[0] + A[1]*B[3], 
		A[0]*B[1] + A[1]*B[4],
		A[0]*B[2] + A[1]*B[5] + A[2],

		A[3]*B[0] + A[4]*B[3], 
		A[3]*B[1] + A[4]*B[4],
		A[3]*B[2] + A[4]*B[5] + A[5]];
}

// Translation matrix
function ttransAffine( tx, ty )
{
	return [1, 0, tx, 0, 1, ty];
}

// Matrix * point
function transAffine( M, P )
{
	return pt(M[0]*P.x + M[1]*P.y + M[2], M[3]*P.x + M[4]*P.y + M[5]);
}

function drawPolygon( shape, f, s, w )
{
	if( f != null ) {
		fill( ...f );
	} else {
		noFill();
	}
	if( s != null ) {
		stroke( 0 );
		strokeWeight( w ) ; // / lw_scale );
	} else {
		noStroke();
	}
	beginShape();
	for( let p of shape ) {
		const op = pt( evalAB( p.x ), evalAB( p.y ) );
		vertex( op.x, op.y );
	}
	endShape( CLOSE );
}

class Shape
{
	constructor( pts, quad, label )
	{
		this.pts = pts;
		this.quad = quad;
		this.label = label;
	}

	draw()
	{
		drawPolygon( this.pts, chooseColour( this.label ), [0,0,0], 0.1 );
	}

	streamSVG( S, stream )
	{
		var s = '<polygon points="';
		var at_start = true;
		for( let p of this.pts ) {
			const op = pt( evalAB( p.x ), evalAB( p.y ) );
			const sp = transAffine( S, op );
			if( at_start ) {
				at_start = false;
			} else {
				s = s + ' ';
			}
			s = s + `${sp.x},${sp.y}`;
		}
		const col = chooseColour( this.label );

		s = s + `" stroke="black" stroke-weight="0.1" fill="rgb(${col[0]}
,${col[1]},${col[2]})" />`;
		stream.push( s );
	}

	translateInPlace( dp )
	{
		for( let idx = 0; idx < this.pts.length; ++idx ) {
			this.pts[idx] = padd( this.pts[idx], dp );
		}
		for( let idx = 0; idx < 4; ++idx ) {
			this.quad[idx] = padd( this.quad[idx], dp );
		}
	}

	rotateAndMatch( T, qidx, P )
	{
		// First, construct a copy with all points transformed by the linear
		// operation T.
		const pts = this.pts.map( p => transAB( T, p ) );
		const quad = this.quad.map( p => transAB( T, p ) );
		const ret = new Shape( pts, quad, this.label );
		if( qidx >= 0 ) {
			ret.translateInPlace( psub( P, quad[qidx] ) );
		}
		return ret;
	}
}

class Meta
{
	constructor()
	{
		this.geoms = [];
		this.quad = [];
	}

	addChild( g )
	{
		this.geoms.push( g );
	}

	draw() 
	{
		for( let g of this.geoms ) {
			g.draw();
		}
	}

	streamSVG( S, stream )
	{
		for( let g of this.geoms ) {
			g.streamSVG( S, stream );
		}
	}

	translateInPlace( dp )
	{
		for( let g of this.geoms ) {
			g.translateInPlace( dp );
		}
		for( let idx = 0; idx < 4; ++idx ) {
			this.quad[idx] = padd( this.quad[idx], dp );
		}
	}

	rotateAndMatch( T, qidx, P )
	{
		const ret = new Meta();
		ret.geoms = this.geoms.map( g => g.rotateAndMatch( T, -1 ) );
		ret.quad = this.quad.map( p => transAB( T, p ) );
		if( qidx >= 0 ) {
			ret.translateInPlace( psub( P, ret.quad[qidx] ) );
		}
		return ret;
	}
}

function buildBaseTiles()
{
	// Schematic description of the edges of a shape in the hat
	// continuum.  Each edge's length is one of 'a' or 'b', and the
	// direction d gives the orientation of d*30 degrees relative to
	// the positive X axis.
	const edges = [
		['a',0], ['a',2], ['b',11], ['b',1], ['a',4], ['a',2],
		['b',5], ['b',3], ['a',6], ['a',8], ['a',8], ['a',10], ['b',7] ];
	const hr3 = 0.5*1.7320508075688772;
	const dirs = [pt(1,0), pt(hr3,0.5), pt(0.5,hr3), 
		pt(0,1), pt(-0.5,hr3), pt(-hr3,0.5),
		pt(-1,0), pt(-hr3,-0.5), pt(-0.5,-hr3),
		pt(0,-1), pt(0.5,-hr3), pt(hr3,-0.5)];
		
	let prev = pt(makeAB(0,0),makeAB(0,0));
	const pts = [prev];

	for( let e of edges ) {
		if( e[0] == 'a' ) {
			prev = pt( 
				addAB( prev.x, makeAB( dirs[e[1]].x, 0 ) ),
				addAB( prev.y, makeAB( dirs[e[1]].y, 0 ) ) );
		} else {
			prev = pt( 
				addAB( prev.x, makeAB( 0, dirs[e[1]].x ) ),
				addAB( prev.y, makeAB( 0, dirs[e[1]].y ) ) );
		}

		pts.push( prev );
	}

	const quad = [pts[1], pts[3], pts[9], pts[13]];
	const ret = {};

	ret['H8'] = new Shape( pts, quad, 'single' );

	const fpts = [];
	const len = pts.length;
	for( let idx = 0; idx < len; ++idx ) {
		const p = pts[len-1-idx];
		fpts.push( pt( p.x, scaleAB( p.y, -1 ) ) );
	}
	const dp = psub( pts[0], fpts[5] );
	for( let idx = 0; idx < len; ++idx ) {
		fpts[idx] = padd( fpts[idx], dp );
	}

	const comp = new Meta();
	comp.addChild( new Shape( pts, quad, 'unflipped' ) );
	comp.addChild( new Shape( fpts, quad , 'flipped' ) );
	comp.quad = quad;
	ret['H7'] = comp;

	return ret;
}

function buildSupertiles( sys )
{
	const sing = sys['H8'];
	const comp = sys['H7'];

	const quad = sys['H8'].quad;

	const smeta = new Meta();
	const rules = [
		[PI/3, 2, 0, false],
		[2*PI/3, 2, 0, false],
		[0, 1, 1, true],
		[-2*PI/3, 2, 2, false],
		[-PI/3, 2, 0, false], 
		[0, 2, 0, false] ];

	smeta.addChild( sing );
	for( let r of rules ) {
		if( r[3] ) {
			smeta.addChild( comp.rotateAndMatch( trot( r[0] ), r[1], 
				smeta.geoms[smeta.geoms.length-1].quad[r[2]] ) );
		} else {
			smeta.addChild( sing.rotateAndMatch( trot( r[0] ), r[1], 
				smeta.geoms[smeta.geoms.length-1].quad[r[2]] ) );
		}
	}
	
	smeta.quad = [
		smeta.geoms[1].quad[3], smeta.geoms[2].quad[0], 
		smeta.geoms[4].quad[3], smeta.geoms[6].quad[0] ];
	
	const cmeta = new Meta();
	cmeta.geoms = smeta.geoms.slice( 0, smeta.geoms.length - 1 );
	cmeta.quad = smeta.quad;

	return { 'H8' : smeta, 'H7' : cmeta };
}

function isButtonActive( but )
{
	return but.elt.style.border.length > 0;
}

function setButtonActive( but, b )
{
	but.elt.style.border = (b ? "3px solid black" : "");
}

function setup() {
	createCanvas( windowWidth, windowHeight );

	sys = buildBaseTiles();

	reset_but = createButton( "Reset" );
	reset_but.position( 10, 10 );
	reset_but.size( 125, 25 );
	reset_but.mousePressed( function() {
		sys = buildBaseTiles();
		to_screen = [20, 0, 0, 0, -20, 0];
		lw_scale = 0.2;
		ab_slider.value( 100 / (1+sqrt(3)), 0 );
		tile_sel.value( 'H8' );
		loop();
	} );

	subst_button = createButton( "Build Supertiles" );
	subst_button.position( 10, 60 );
	subst_button.size( 125, 25 );
	subst_button.mousePressed( function() {
		sys = buildSupertiles( sys );	
		loop();
	} );

	lab = createSpan( 'Category' );
	lab.position( 10, 100 );
	lab.size( 125, 15 );

	tile_sel = createSelect();
	tile_sel.position( 10, 120 );
	tile_sel.size( 125, 25 );
	tile_sel.option( 'H7' );
	tile_sel.option( 'H8' );
	tile_sel.value( 'H8' );
	tile_sel.changed( loop );

	ab_label = createSpan( 'Tile(1,1.732)' );
	ab_label.position( 10, 155 );
	ab_label.size( 125, 15 );

	ab_slider = createSlider( 0, 100, 100 / (1+sqrt(3)), 0 );
	ab_slider.position( 10, 170 );
	ab_slider.size( 125, 25 );
	ab_slider.input( 
		function() {
			loop();
		} );
	
	let but = createButton( 'Chevrons' );
	but.position( 10, 210 );
	but.size( 125, 25 );
	but.mousePressed( function() {
		ab_slider.value( 0 );
		loop();
	} );
	but = createButton( 'Hats' );
	but.position( 10, 240 );
	but.size( 125, 25 );
	but.mousePressed( function() {
		ab_slider.value( 100 / (1+sqrt(3)) );
		loop();
	} );
	but = createButton( 'Tile(1,1)' );
	but.position( 10, 270 );
	but.size( 125, 25 );
	but.mousePressed( function() {
		ab_slider.value( 50 );
		loop();
	} );
	but = createButton( 'Turtles' );
	but.position( 10, 300 );
	but.size( 125, 25 );
	but.mousePressed( function() {
		ab_slider.value( 100 * sqrt(3) / (1+sqrt(3)) );
		loop();
	} );
	but = createButton( 'Comets' );
	but.position( 10, 330 );
	but.size( 125, 25 );
	but.mousePressed( function() {
		ab_slider.value( 100 );
		loop();
	} );

	/*

	lab = createSpan( 'Colours' );
	lab.position( 10, 150 );
	lab.size( 125, 15 );

	colscheme_sel = createSelect();
	colscheme_sel.position( 10, 170 );
	colscheme_sel.size( 125, 25 );
	colscheme_sel.option( 'Pride' );
	colscheme_sel.option( 'Mystics' );
	colscheme_sel.option( 'Figure 5.3' );
	colscheme_sel.option( 'Bright' );
	colscheme_sel.option( '4' );
	colscheme_sel.changed( loop );
	*/

	translate_button = createButton( "Translate" );
	setButtonActive( translate_button, true );
	translate_button.position( 10, 370 );
	translate_button.size( 125, 25 );
	translate_button.mousePressed( function() {
		setButtonActive( translate_button, true );
		setButtonActive( scale_button, false );
		loop();
	} );

	scale_button = createButton( "Scale" );
	scale_button.position( 10, 400 );
	scale_button.size( 125, 25 );
	scale_button.mousePressed( function() {
		setButtonActive( translate_button, false );
		setButtonActive( scale_button, true );
		loop();
	} );
	
	let save_button = createButton( "Save PNG" );
	save_button.position( 10, 430 );
	save_button.size( 125, 25 );
	save_button.mousePressed( function () {
		uibox = false;
		draw();
		save( "output.png" );
		uibox = true;
		draw();
	} );

	let svg_button = createButton( "Save SVG" );
	svg_button.position( 10, 460 );
	svg_button.size( 125, 25 );
    svg_button.mousePressed( function () {
        const stream = [];
        stream.push( `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">` );
		stream.push( `<g transform="translate(${width/2},${height/2})">` );

		sys[tile_sel.value()].streamSVG( to_screen, stream );

        stream.push( '</g>' );
        stream.push( '</svg>' );

        saveStrings( stream, 'output', 'svg' );
    } );
}

function draw()
{
	background( 255 );

	push();
	translate( width/2, height/2 );

	applyMatrix( 
		to_screen[0], to_screen[3], 
		to_screen[1], to_screen[4], 
		to_screen[2], to_screen[5] );

/*
	const s = colscheme_sel.value();
	if( s == 'Figure 5.3' ) {
		colmap = colmap53;
	} else if( s == 'Bright' ) {
		colmap = colmap_orig;
	} else if( s == 'Pride' ) {
		colmap = colmap_pride;
	} else if( s == 'Mystics' ) {
		colmap = colmap_mystics;
	}
*/

	v = ab_slider.value() / 100.0;
	alpha = (1+sqrt(3));
	a = alpha * v;
	b = alpha * (1 - v);
	ab_label.html( `Tile( ${a.toFixed(2)}, ${b.toFixed(2)} )` );

	sys[tile_sel.value()].draw();

	pop();

	if( uibox ) {
		stroke( 0 );
		strokeWeight( 0.5 );
		fill( 255, 220 );
		rect( 5, 5, 135, 490 );
	}

	noLoop();
}

function windowResized() 
{
	resizeCanvas( windowWidth, windowHeight );
}

function mousePressed()
{
	if( (mouseX >= 5) && (mouseX <= 140) ) { // && (mouseY >= 5) && (mouseY < 340) ) {
		return true;
	}

	dragging = true;
	if( isButtonActive( scale_button ) ) {
		scale_centre = transAffine(
			invAffine( to_screen ), pt( width/2, height/2 ) );
		scale_start = pt( mouseX, mouseY );
		scale_ts = [...to_screen];
	}
	loop();
	return false;
}

function mouseDragged()
{
	if( dragging ) {
		if( isButtonActive( translate_button ) ) {
			to_screen = mulAffine( 
				ttransAffine( mouseX - pmouseX, mouseY - pmouseY ), to_screen );
		} else if( isButtonActive( scale_button ) ) {
			let sc = dist( mouseX, mouseY, width/2, height/2 ) / 
				dist( scale_start.x, scale_start.y, width/2, height/2 );
			to_screen = mulAffine( 
				mulAffine( ttransAffine( scale_centre.x, scale_centre.y ),
					mulAffine( [sc, 0, 0, 0, sc, 0],
						ttransAffine( -scale_centre.x, -scale_centre.y ) ) ),
				scale_ts );
			lw_scale = mag( to_screen[0], to_screen[1] ) / 20.0;
		}
		loop();
		return false;
	} else {
		return true;
	}
}

function mouseReleased()
{
	dragging = false;
	loop();
}
