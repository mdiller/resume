// Hey there. This is a bit of javascript that loads my resume information from a json file, and inserts it into my website
// 
// While there are more complicated and perhaps more elegant ways of filling in an html template with json,
// I figured that this would be a nice, simple, easy to read format. 

function getCSSVars(var_defs) {
	result = {};
	if (!var_defs){
		return result;
	}
	var_defs = var_defs[1].match(/(--[^:]+): ([^;]+);/g);
	var_defs.forEach(str => {
		match = str.match(/(--[^:]+): ([^;]+);/);
		result[match[1]] = match[2];
	})

	console.log(result);

	return result
}

function includeCSS(text) {
	var var_defs = getCSSVars(text.match(/:root {([^}]+)}/));

	for (var name in var_defs) {
		text = text.replace(`var(${name})`, var_defs[name]);
	}

	$("html").append(`<style>${text}</style>`);
}


function projectToHTML(project) {
	return `
		<section class="project">
			<div class="title">
				<a href=${project.github}>
					${project.title}
				</a>
			</div>
			<p>
				${project.description}
			</p>
		</section>`;
}

function jobToHTML(job) {
	return `
		<section class="job">
			<div class="title">
				${job.company}
			</div>
			<p>
				${job.description}
			</p>
		</section>`;
}

function processResume(resume) {
	// resume.projects.forEach(project => {
	// 	$("section#projects").append(projectToHTML(project));
	// });
	// resume.experience.forEach(job => {
	// 	$("section#experience").append(jobToHTML(job));
	// });
}

$.ajax({
	dataType: "json",
	url: "./resume.json",
	success: processResume
});

$.ajax({
	dataType: "text",
	url: "./style.css",
	success: includeCSS
});