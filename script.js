// Hey there. This is a bit of javascript that loads my resume information from a json file, and inserts it into my website
// 
// While there are more complicated and perhaps more elegant ways of filling in an html template with json,
// I figured that this would be a nice, simple, easy to read format. 

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
	resume.projects.forEach(project => {
		$("section#projects").append(projectToHTML(project));
	});
	resume.experience.forEach(job => {
		$("section#experience").append(jobToHTML(job));
	});
}

$.ajax({
	dataType: "json",
	url: "./resume.json",
	success: processResume
});