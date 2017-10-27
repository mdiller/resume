var fs = require("fs");
var child_process = require("child_process");

var config_file = "config.json"

// Default config values
var config = {
	build_dir: "build"
}
// Load config json data
if (fs.existsSync(config_file)) {
	Object.assign(config, JSON.parse(fs.readFileSync(config_file, "utf8")));
}

if (!fs.existsSync(config.build_dir)) {
	fs.mkdirSync(config.build_dir);
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
function addExperience(text, jobs, config) {
	jobs_text = "";
	if (config.experience) {
		var new_jobs = [];
		config.experience.forEach(company => {
			var job = jobs.find(job => job.company.toLowerCase() === company.toLowerCase());
			if (job) {
				new_jobs.push(job);
			}
			else {
				console.log(`couldn't find company: ${company}`);
			}
		});
		jobs = new_jobs;
	}

	jobs.forEach(job => {
		jobs_text += jobToHTML(job)
	});
	return text.replace("<!-- experience -->", jobs_text);
}

function addProjects(text, projects, config) {
	projects_text = "";
	if (config.projects) {
		var new_projects = [];
		config.projects.forEach(title => {
			var project = projects.find(project => project.title.toLowerCase() === title.toLowerCase());
			if (project) {
				new_projects.push(project);
			}
			else {
				console.log(`couldn't find project: ${title}`);
			}
		});
		projects = new_projects;
	}

	projects.forEach(project => {
		projects_text += projectToHTML(project)
	});
	return text.replace("<!-- projects -->", projects_text);
}

// Load resume json data
var resume_json = JSON.parse(fs.readFileSync("resume.json", "utf8"));

// Copy over all relevant files
var html = fs.readFileSync("index.html", "utf8");
html = addExperience(html, resume_json.experience, config);
html = addProjects(html, resume_json.projects, config);
fs.writeFileSync(`${config.build_dir}/index.html`, html);


var css = fs.readFileSync("style.css", "utf8");
css = fixCSS(css);
fs.writeFileSync(`${config.build_dir}/style.css`, css);


// Build the html and css as a pdf
child_process.exec(`wkhtmltopdf -B 0 -L 0 -R 0 -T 0 --page-width 8.5in --page-height 11in ${config.build_dir}/index.html ${config.build_dir}/resume.pdf`, (err, stdout, stderr) => {
	if (err) {
		console.log("There was a problem running wkhtmltopdf. Make sure you have it installed");
		return;
	}
	if (stdout != "") {
		console.log(stdout);
	}
	console.log("done!");
});
