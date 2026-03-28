const distGlob = new Bun.Glob('dist/**/*.d.ts');

for await (const filePath of distGlob.scan({ cwd: '.' })) {
	const file = Bun.file(filePath);
	const content = await file.text();
	const nextContent = content.replace(/(['"])(\.[^'"]*)\.tsx?\1/g, '$1$2.js$1');

	if (nextContent === content) {
		continue;
	}

	await Bun.write(file, nextContent);
}
