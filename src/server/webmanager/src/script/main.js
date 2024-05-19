window.exports = {};
window.exports["react"] = window.React;
window.exports["react-dom"] = window.ReactDOM;
window.exports["@mui/material"] = window.MaterialUI;
window.exports["@emotion/react"] = window.MaterialUI;
window.exports["@emotion/styled"] = window.MaterialUI;
window.exports["@mui/material/styles"] = window.MaterialUI;
window.exports["@mdi/js"] = window.mdi;
window.exports["ivipbase"] = window.ivipbase;

function extractClassNames(css) {
	const classNames = [];
	const regex = /\.([a-zA-Z0-9_-]+)\s*{/g;
	let match;
	while ((match = regex.exec(css)) !== null) {
		classNames.push(match[1]);
	}
	return classNames.filter((c, i, l) => l.indexOf(c) === i);
}

const resolvePath = (path, ...paths) => {
	return paths.reduce((acc, current) => {
		const basename = acc.split("/").pop();
		const dirname = acc.split("/").slice(0, -1).join("/");
		const [_, extname = ""] = basename.match(/(\.[a-z]+)$/i) ?? [];
		const path = extname === "" ? [dirname, basename].join("/") : dirname;
		return [path, current]
			.join("/")
			.replace(/\/+/g, "/")
			.replace(/\/\.\//g, "/")
			.replace(/\/[^/]+\/\.\.\//g, "/")
			.replace(/\/$/, "");
	}, path);
};

async function _require(momentPath, module) {
	if (!module.startsWith("http") && !module.startsWith("/") && /^((\.)+\/)+/gi.test(module)) {
		module = resolvePath(momentPath, module);
	}

	const posipleModule = [module, module + ".js", module + ".jsx", module + "/index.js", module + "/index.jsx"];
	const resolveModule = posipleModule.find((m) => m in window.exports);

	if (resolveModule) {
		const _default = window.exports[resolveModule]?.default ?? window.exports[resolveModule] ?? undefined;
		const __esModule = window.exports[resolveModule]?.__esModule ?? "default" in window.exports[resolveModule];
		return { __esModule, default: _default, ...(window.exports[resolveModule] ?? {}) };
	}

	let resolved = false;

	for (const m of posipleModule) {
		if (resolved) {
			break;
		}
		try {
			// Faz a requisição do módulo
			const response = await fetch(m);

			// Verifica se a requisição foi bem-sucedida
			if (!response.ok) {
				throw new Error(`Failed to load module script with URL ${m}`);
			}

			resolved = true;

			const scriptText = await response.text();

			let output = "";
			const require = async (module) => {
				return await _require(m, module);
			};

			if (/\.(css|scss|sass|less|styl)$/gi.test(m)) {
				const style = await new Promise((resolve, reject) => {
					let sassText = scriptText;
					if (sassText.trim() === "") {
						return resolve({});
					}

					const classNames = Object.fromEntries(extractClassNames(sassText).map((c) => [c, c]));

					if (/\.module\.(css|scss|sass|less|styl)$/gi.test(m)) {
						for (const c in classNames) {
							classNames[c] = `${c}_${Math.random().toString(36).substring(7)}`;

							sassText = sassText.replace(new RegExp(`\\.${c}`, "g"), `.${classNames[c]}`);
						}
					}

					sassText = sassText.replace(/\:global\((.+)\)/gi, (all, $1) => {
						return $1.replace(/\.([a-zA-Z0-9_-]+)/gi, (all, $1) => {
							return `.${Object.entries(classNames).find(([k, v]) => v === $1)?.[0] ?? $1}`;
						});
					});

					Sass.compile(sassText, function (result) {
						if (result.status === 0) {
							const style = document.createElement("style");
							style.innerHTML = result.text;
							document.head.appendChild(style);

							resolve(classNames);
						} else {
							reject(result);
						}
					});
				});

				output = `(async ()=>{
                    const exports = { __esModule: true };
                    exports.default = ${JSON.stringify(style)};
                    return exports;
                })();`;
			} else {
				output = Babel.transform(scriptText, { presets: ["env", "react"], plugins: ["transform-react-jsx"] }).code.replace(/require\(/gi, "await require(");

				output = `(async ()=>{
                    const exports = { __esModule: true };
                    ${output}
                    return exports;
                })();`;
			}

			// console.log(output);

			const exports = await eval(output);

			// console.log(m, exports);

			window.exports[m] = exports;
			return exports;
		} catch (e) {
			if (resolved) {
				console.error(e);
				throw new Error(`Error loading module from ${m}`);
			}
		}
	}
}

const initialize = (filePath) => {
	_require("./", filePath);
};
