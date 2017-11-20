# Resume

This is a project I created in order to build myself a resume. I am creating a resume in HTML / CSS, and then converting it to a pdf using [wkhtmltopdf](https://wkhtmltopdf.org/). Most of the content of the resume is stored in the resume.json file, which makes it easy for other application like [my website](http://dillerm.io) to use it.

## Why have a build script?

You might be wondering why I've decided to use a build script to construct my resume, instead of doing it in client-side javascript. The main reason for this is that wkhtmltopdf has some small quirks and issues with running javascript, and also with some parts of CSS. I solved these issues by building the data into the HTML file directly, and simplifying the CSS styling as well.