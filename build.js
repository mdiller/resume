var fs = require("fs");
var child_process = require("child_process");

var build_dir = "build/";
if (!fs.existsSync(build_dir)) {
	fs.mkdirSync(build_dir);
}

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


function jobToHTML(job) {
	return `
		<section class="job">
			<h3>${job.company}</h3>
			<p>
				${job.description}
			</p>
		</section>`;
}

function projectToHTML(project) {
	return `
		<section class="project">
			<h3>
				<a href=${project.github}>
					${project.title}
				</a>
			</h3>
			<p>
				${project.description}
			</p>
		</section>`;
}

// Just inserting these as strings because it isn't worth loading js-dom
function addExperience(text, jobs) {
	jobs_text = "";
	jobs.forEach(job => {
		jobs_text += jobToHTML(job)
	});
	return text.replace("<!-- experience -->", jobs_text);
}

function addProjects(text, projects) {
	projects_text = "";
	projects.forEach(project => {
		projects_text += projectToHTML(project)
	});
	return text.replace("<!-- projects -->", projects_text);
}

// Load resume json data
var resume_json = JSON.parse(fs.readFileSync("resume.json", "utf8"));

// Copy over all relevant files
var html = fs.readFileSync("index.html", "utf8");
html = addExperience(html, resume_json.experience);
html = addProjects(html, resume_json.projects);
fs.writeFileSync(`${build_dir}index.html`, html);


var css = fs.readFileSync("style.css", "utf8");
css = fixCSS(css);
fs.writeFileSync(`${build_dir}style.css`, css);


// Build the html and css as a pdf
child_process.exec(`wkhtmltopdf -B 0 -L 0 -R 0 -T 0 --page-width 8.5in --page-height 11in ${build_dir}index.html ${build_dir}resume.pdf`, (err, stdout, stderr) => {
	if (err) {
		console.log("There was a problem running wkhtmltopdf. Make sure you have it installed");
		return;
	}
	if (stdout != "") {
		console.log(stdout);
	}
	console.log("done!");
});
