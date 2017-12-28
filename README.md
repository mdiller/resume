# Resume

This is a project I created in order to build myself a resume. I am creating a resume in HTML / CSS, and then converting it to a pdf using [wkhtmltopdf](https://wkhtmltopdf.org/). Most of the content of the resume is stored in the resume.json file, which makes it easy for other application like [my website](http://dillerm.io) to use it.

See the current build of my resume [here](http://dillerm.io/resume/resume.pdf)

## Handlebars

If you've never used handlebars before, you might be wondering, *Why does he have files called `resume.handlebars` and `resume_simple.handlebars`, and what are they for?* In short, these files are the templates that will be filled in with the data from my `resume.json` document. These files were originally html files, and I was inserting the resume data into the html directly by replacing certain strings. I decided to move to a templating system which would be much cleaner and allow for a more readable and easy to understand original document. I decided to go with [Handlebars](http://handlebarsjs.com/) because I liked the simple syntax of Mustache, but needed the additional functionality that Handlebars provides.

## Why have a build script?

One question you might have is why am I building my resume server-side and not client-side? The main reason for this is that wkhtmltopdf has some small quirks and issues with running javascript, and also with some parts of CSS. I solved these issues by building the data into the HTML file directly, and simplifying the CSS styling as well.

## resume_simple?

When I originally started this project, I was only building one version of my resume, which is the fancy colorful version. I realized after a while that while it is nice to have, it can also be distracting or annoying for some people, and could also be difficult to read when printed out. To solve these issues, I created [resume_simple](http://dillerm.io/resume/resume_simple.pdf), which is a simpler version of my resume, optimized for viewing on paper. I also created a third document, which has both versions together. This [resume_combined](http://dillerm.io/resume/resume_combined.pdf) document is constructed for printing on the front and back of a single piece of paper.