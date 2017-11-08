var fs = require("fs");
var path = require("path")
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

function textToHTML(text) {
	text = text.replace(/\n/g, "<br>");
	return text;
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


function jobToHTML(job) {
	return `
		<section>
			<h3>
				${job.company}
				<span class="location-date">
					${job.location} (${job.date_start} - ${job.date_end})
				</span>
			</h3>
			${jsonToUl(job.bullets)}
		</section>`;
}

function projectToHTML(project) {
	var title = project.link ? `<a href="${project.link}">${project.title}</a>` : project.title;
	return `
		<section>
			<h3>
				${title}
				<span class="github-link">
					<a href=${project.github}>
						View Source
					</a>
				</span>
			</h3>
			${jsonToUl(project.bullets)}
		</section>`;
}

function iconLinkToHTML(icon_link) {
	var text = icon_link.link ? `<a href="${icon_link.link}">${icon_link.text}</a>` : textToHTML(icon_link.text);
	return `
		<tr>
			<td>
				<img class="icon" src="images/${icon_link.icon}">
			</td>
			<td>
				${text}
			</td>
		</tr>`;
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

function addIconLinks(text, icon_links) {
	icon_links_text = "<table>";
	icon_links.forEach(icon_link => {
		icon_links_text += iconLinkToHTML(icon_link)
	});
	icon_links_text += "</table>"
	return text.replace("<!-- icon_links -->", icon_links_text);
}

function addLanguages(text, languages) {
	var lang_text = `
		<section>
			<h3>Proficient</h3>
			${jsonToUl(languages.proficient)}
		</section>
		<section>
			<h3>Familiar</h3>
			${jsonToUl(languages.familiar)}
		</section>`;
	return text.replace("<!-- languages -->", lang_text);
}

function addEducation(text, education) {
	var education_text = `
		<section>
			<h4>${education.title}</h4>
			<p>${textToHTML(education.text)}</p>
		</section>`;
	return text.replace("<!-- education -->", education_text);
}

function addAboutMe(text, about_me) {
	return text.replace("<!-- about_me -->", `<p>${about_me}</p>`);
}

// Load resume json data
var resume_json = JSON.parse(fs.readFileSync("resume.json", "utf8"));

// Copy over all relevant files

// resume.html
var html = fs.readFileSync("resume.html", "utf8");
html = addExperience(html, resume_json.experience, config);
html = addProjects(html, resume_json.projects, config);
html = addIconLinks(html, resume_json.icon_links);
html = addLanguages(html, resume_json.languages);
html = addEducation(html, resume_json.education);
html = addAboutMe(html, resume_json.about_me);
if (!config.hide_references) {
	html = html.replace("<!-- references -->", `<span id="references">References available upon request</span>`);
}

fs.writeFileSync(`${config.build_dir}/resume.html`, html);

// style.css
var css = fs.readFileSync("style.css", "utf8");
css = fixCSS(css);
fs.writeFileSync(`${config.build_dir}/style.css`, css);

// resume.json
var text = fs.readFileSync("resume.json", "utf8");
fs.writeFileSync(`${config.build_dir}/resume.json`, text);

// Image directory
copyRecursive("images", `${config.build_dir}/images`);

if (config.build_pdf == undefined || config.build_pdf) {
	// Build the html and css as a pdf
	child_process.exec(`wkhtmltopdf -B 0 -L 0 -R 0 -T 0 --page-width 8.5in --page-height 11in ${config.build_dir}/resume.html ${config.build_dir}/resume.pdf`, (err, stdout, stderr) => {
		if (err) {
			console.log("There was a problem running wkhtmltopdf. Make sure you have it installed");
			return;
		}
		if (stdout != "") {
			console.log(stdout);
		}
		console.log("done!");
	});
}
else {
	console.log("done!")
}