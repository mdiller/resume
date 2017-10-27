var fs = require('fs');

var build_dir = "build/";
if (!fs.existsSync(build_dir)) {
	fs.mkdirSync(build_dir);
}

function escapeRegex(str) {
	return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function fixCSS(text) {
	var definitions = text.match(/:root {([^}]+)}/);
	var var_defs = {};
	if (definitions){
		definitions = definitions[1].match(/(--[^:]+): ([^;]+);/g);
		definitions.forEach(str => {
			match = str.match(/(--[^:]+): ([^;]+);/);
			var_defs[match[1]] = match[2];
		})
	}

	for (var name in var_defs) {
		text = text.replace(new RegExp(escapeRegex(`var(${name})`), 'g'), var_defs[name]);
	}
	return text;
}

function includeCSS(text) {
	var var_defs = getCSSVars(text.match(/:root {([^}]+)}/));


	$("html").append(`<style>${text}</style>`);
}



// Copy over all relevant files
var html = fs.readFileSync('index.html', 'utf8');
fs.writeFileSync(`${build_dir}index.html`, html);


var css = fs.readFileSync('style.css', 'utf8');
css = fixCSS(css);
fs.writeFileSync(`${build_dir}style.css`, css);