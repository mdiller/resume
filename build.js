var fs = require("fs");
var path = require("path")
var child_process = require("child_process");
var Handlebars = require("handlebars");

var config_file = "config.json";

// Default config values
var config = {};
// Load config json data
if (fs.existsSync(config_file)) {
	Object.assign(config, JSON.parse(fs.readFileSync(config_file, "utf8")));
}

if (config.build_dir && !fs.existsSync(config.build_dir)) {
	fs.mkdirSync(config.build_dir);
}

// Build to here and then copy to config.build_dir
var build_directory = "build/";
if (!fs.existsSync(build_directory)) {
	fs.mkdirSync(build_directory);
}

function textToHTML(text) {
	return text ? text.replace(/\n/g, "<br>") : text;
}

function jsonToUl(data) {
	var lines = []
	for(var i = 0; i < data.length; i++) {
		if ((i + 1) < data.length && typeof data[i + 1] !== "string"){
			lines.push(`<li>${data[i]}\n${jsonToUl(data[i + 1])}</li>`);
			i += 1;
		}
		else {
			lines.push(`<li>${data[i]}</li>`);
		}
	}
	return `<ul>\n${lines.join("\n")}\n</ul>`;
}

Handlebars.registerHelper("textToHTML", textToHTML);
Handlebars.registerHelper("jsonToUl", jsonToUl);
Handlebars.registerHelper("linkText", function(link, text) {
	return link ? `<a href="${link}">${text}</a>` : textToHTML(text);
});
Handlebars.registerHelper("simpleLink", function() {
	return (this.link && this.link.startsWith("http")) ? this.link : this.text;
})

function copyRecursive(src, dest) {
	if (fs.existsSync(src) && fs.statSync(src).isDirectory()) {
		if (!fs.existsSync(dest)) {
			fs.mkdirSync(dest);
		}
		fs.readdirSync(src).forEach(child => {
			copyRecursive(
				path.join(src, child), 
				path.join(dest, child));
		});
	}
	else {
		fs.createReadStream(src).pipe(fs.createWriteStream(dest));
	}
};


function fixCSS(text) {
	var defs_pattern = /:root {([^}]+)}/;
	var definitions = text.match(defs_pattern);
	var var_defs = {};
	if (definitions){
		definitions = definitions[1].match(/(--[^:]+): ([^;]+);/g);
		definitions.forEach(str => {
			match = str.match(/(--[^:]+): ([^;]+);/);
			var_defs[match[1]] = match[2];
		})
	}

	text = text.replace(defs_pattern, "");

	for (var name in var_defs) {
		text = text.replace(new RegExp(`var\\(${name}\\)`, "g"), var_defs[name]);
	}
	return text;
}

// Load resume json data
var resume_json = JSON.parse(fs.readFileSync("resume.json", "utf8"));

if (config.projects) {
	resume_json.projects = config.projects.map(name => {
		return resume_json.projects.find(project => project.title.toLowerCase() === name.toLowerCase());
	});
}
if (config.experience) {
	resume_json.experience = config.experience.map(name => {
		return resume_json.experience.find(job => job.company.toLowerCase() === name.toLowerCase());
	});
}

// Copy over all relevant files

// resume.html
var css = fs.readFileSync("resume.css", "utf8");
resume_json.style = `<style>${fixCSS(css)}</style>`;

var template = fs.readFileSync("resume.handlebars", "utf8");
template = Handlebars.compile(template);
var html = template(resume_json);
fs.writeFileSync(`${build_directory}/resume.html`, html);

// resume_simple.html
css = fs.readFileSync("resume_simple.css", "utf8");
resume_json.style = `<style>${fixCSS(css)}</style>`;

template = fs.readFileSync("resume_simple.handlebars", "utf8");
template = Handlebars.compile(template);
html = template(resume_json);
fs.writeFileSync(`${build_directory}/resume_simple.html`, html);


// resume.json
var text = fs.readFileSync("resume.json", "utf8");
fs.writeFileSync(`${build_directory}/resume.json`, text);

// Image directory
copyRecursive("images", `${build_directory}/images`);

function finish_build() {
	if (config.build_dir) {
		copyRecursive(build_directory, config.build_dir);
	}
	console.log("done!");
}

if (config.build_pdf == undefined || config.build_pdf) {
	// Build the html and css as a pdf
	child_process.exec(`wkhtmltopdf -B 0 -L 0 -R 0 -T 0 --disable-javascript --page-width 8.5in --page-height 11in ${build_directory}/resume.html ${build_directory}/resume.pdf`, (err, stdout, stderr) => {
		if (err) {
			console.log("There was a problem running wkhtmltopdf. Make sure you have it installed");
			return;
		}
		if (stdout != "") {
			console.log(stdout);
		}
		// finish_build();
	});
	child_process.exec(`wkhtmltopdf -B 0 -L 0 -R 0 -T 0 --disable-javascript --page-width 8.5in --page-height 11in ${build_directory}/resume_simple.html ${build_directory}/resume_simple.pdf`, (err, stdout, stderr) => {
		if (err) {
			console.log("There was a problem running wkhtmltopdf. Make sure you have it installed");
			return;
		}
		if (stdout != "") {
			console.log(stdout);
		}
		// finish_build();
	});
}
else {
	// finish_build();
}