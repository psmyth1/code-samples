// ==UserScript==

// @name Dump current HTML

// @when Pages Match

// @description writes html of current page to a local file

// @include *

// ==/UserScript==

 
include("fileio.js");
include("prototype.js");
include("scriptaculous/builder.js");

function dump(){
	base = Builder.node("base",
	  {href : document.location.toString().match(/(.*\/)[^\/]*/)[1]});
	head = document.getElementsByTagName("head")[0];
	head.insertBefore(base, head.firstChild);

	for (var tbox in find("textbox")) {
		tbox.element.setAttribute("value", tbox.element.value)
	}

	for (var pbox in find("password")) {
		pbox.element.setAttribute("value", pbox.element.value)
	}

	var html = document.documentElement.innerHTML;
	html = html.stripScripts();
	var dt = document.doctype;
	var doctypeDef = (dt) ? '<!DOCTYPE ' + dt.name + ' PUBLIC "' +
		dt.publicId + '" "' + dt.systemId + '">' : "";
	html = doctypeDef + '<html>' + html + '</html>';
    return html;
}





