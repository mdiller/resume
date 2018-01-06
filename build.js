var fs = require("fs");
var path = require("path")
var child_process = require("child_process");
var Handlebars = require("handlebars")
var wkhtmltopdf = require("wkhtmltopdf");
var PDFMerge = require("pdf-merge");
var async = require("async");

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
	if (!text) {
		return text;
	}
	text = text.replace(/\n/g, "<br>");
	text = text.replace(/\[([^\]]*)\]\(([^\)]*)\)/g, `<a href="$2">$1</a>`);
	return text;
}

function jsonToUl(data) {
	var lines = [];
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

function jsonToListMD(data, depth=0) {
	var lines = [];
	var indent = "\t".repeat(depth);
	for(var i = 0; i < data.length; i++) {
		if ((i + 1) < data.length && typeof data[i + 1] !== "string"){
			lines.push(`${indent}- ${data[i]}\n${jsonToListMD(data[i + 1], depth + 1)}`);
			i += 1;
		}
		else {
			lines.push(`${indent}- ${data[i]}`);
		}
	}
	return `${lines.join("\n")}`;
}

function simpleLinkMD(text, link) {
	var text = (link && link.startsWith("http")) ? link : text;
	if (link && (link.startsWith("http") || link.includes("@"))) {
		text = `[${text}](${link})`;
	}
	return text;
}

function simpleLink(text, link) {
	text = simpleLinkMD(text, link)
	text = text.replace(/\n/g, " ");
	return textToHTML(text);
}

Handlebars.registerHelper("textToHTML", textToHTML);
Handlebars.registerHelper("jsonToUl", jsonToUl);
Handlebars.registerHelper("jsonToListMD", data => jsonToListMD(data)); // do this so no extra arguments get passed
Handlebars.registerHelper("simpleLink", simpleLink);
Handlebars.registerHelper("simpleLinkMD", simpleLinkMD);
Handlebars.registerHelper("linkText", function(link, text) {
	return link ? `<a href="${link}">${text}</a>` : textToHTML(text);
});
Handlebars.registerHelper("getSVG", function(filename) {
	if (filename.endsWith("png")) {
		return "<svg></svg>";
	}
	return fs.readFileSync(`images/${filename}`, "utf8")
});
Handlebars.registerHelper("dateFormat", function(datestring) {
	var date = new Date(datestring);
	return `${date.toLocaleString("en-us", { month: "long" })}(${date.getMonth() + 1}) ${date.getFullYear()}`
});

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

resume_json.icon_links_contact = [ "address", "email", "phone" ].map(name => {
	return resume_json.icon_links.find(link => link.name === name);
});

resume_json.icon_links_web = [ "website", "github", "linkedin" ].map(name => {
	return resume_json.icon_links.find(link => link.name === name);
});

var options = {
	B: 0,
	L: 0,
	R: 0,
	T: 0,
	disableJavascript: true,
	pageWidth: "8.5in",
	pageHeight: "11in",
	output: `${build_directory}/resume_simple.pdf`
};

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

var template = fs.readFileSync("resume_simple.handlebars", "utf8");
template = Handlebars.compile(template);
var html_simple = template(resume_json);
fs.writeFileSync(`${build_directory}/resume_simple.html`, html_simple);

// resume.md
var template = fs.readFileSync("resume_markdown.handlebars", "utf8");
template = Handlebars.compile(template);
var markdown_text = template(resume_json);
fs.writeFileSync(`${build_directory}/resume.md`, markdown_text);

// resume.json
var text = fs.readFileSync("resume.json", "utf8");
fs.writeFileSync(`${build_directory}/resume.json`, text);

// Image directory
copyRecursive("images", `${build_directory}/images`);

function finish() {
	// Copy all the files to other directory
	if (config.build_dir) {
		copyRecursive(build_directory, config.build_dir);
	}
	console.log("done!");
}

// Generate pdfs and finish
async.series([
	callback => {
		options.output = `${build_directory}/resume.pdf`;
		wkhtmltopdf(html, options, function (err, stream) {
			callback();
		});
	},
	callback => {
		options.output = `${build_directory}/resume_simple.pdf`;
		wkhtmltopdf(html_simple, options, function (err, stream) {
			callback();
		});
	},
	callback => {
		PDFMerge([
			`${build_directory}/resume.pdf`,
			`${build_directory}/resume_simple.pdf`
		], {output: `${build_directory}/resume_combined.pdf`}).then(buffer => {
			callback();
		});
	}
], finish);