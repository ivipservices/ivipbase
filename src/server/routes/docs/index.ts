import * as swaggerJsdoc from "swagger-jsdoc";
const createSwaggerDocs = (swaggerJsdoc as any).default ?? swaggerJsdoc; // ESM and CJS compatible approach
import { LocalServer } from "../../";
import { packageRootPath } from "../../shared/rootpath";
import path from "path";
import fs from "fs";

const yamlPath = path.join(packageRootPath, "/server/routes/*/*.yaml");

export const addRoute = (env: LocalServer) => {
	// Generate docs from all yaml files
	const options: swaggerJsdoc.Options = {
		definition: {
			openapi: "3.0.0",
			info: {
				title: "iVipBase",
				description:
					"Documentação de endpoint e ambiente de teste da API iVipBase. Esta documentação está disponível no servidor porque está sendo executada em modo de desenvolvimento. Para desabilitar isso, defina sua variável de ambiente NODE_ENV para produção. Muitos endpoints exigem que você se autentique usando a autenticação Bearer. Use o endpoint _/auth/{dbname}/signin_ para obter um token de acesso, clique no botão _Authorize_ e cole seu token no campo de entrada. Para obter mais informações sobre iVipBase, consulte GitHub",
				version: "%SERVER_VERSION%",
				contact: {
					name: "iVipBase API Support",
					email: "desenvolvimento@ivipcoin.com",
					url: "https://github.com/ivipservices/ivipbase",
				},
			},
			servers: [{ url: env.url }],
			tags: [
				{
					name: "auth",
					description: "Pontos de extremidade de autenticação de usuário",
				},
				{
					name: "oauth2",
					description: "Autenticação de usuário usando provedores OAuth2 terceirizados",
				},
				{
					name: "data",
					description: "Manipulação de dados e endpoints de consulta",
				},
				{
					name: "schemas",
					description: "Pontos finais de gerenciamento de esquema de dados",
				},
				{
					name: "metadata",
					description: "Pontos de extremidade de metadados",
				},
			],
			components: {
				securitySchemes: {
					bearerAuth: {
						type: "http",
						scheme: "bearer",
						bearerFormat: "token", // switch to JWT in the future?
					},
				},
				schemas: {
					User: {
						type: "object",
						properties: {
							uid: { type: "string", example: "jpx0k53u0002ecr7s354c51l" },
							username: { type: "string", example: "someuser" },
							email: { type: "string", example: "email@domain.com" },
							displayName: { type: "string", example: "Some User" },
							picture: {
								type: "object",
								properties: {
									width: { type: "number", example: 500 },
									height: { type: "number", example: 500 },
									url: { type: "string", example: "https://profile.pic/user.jpg" },
								},
							},
							emailVerified: { type: "boolean", example: true },
							created: { type: "string", example: "2022-03-09T15:38:57.361Z" },
							prevSignin: { type: "string", example: "2022-03-09T15:38:57.361Z" },
							prevSigninIp: { type: "string", example: "127.0.0.1" },
							lastSignin: { type: "string", example: "2022-03-09T15:38:57.361Z" },
							lastSigninIp: { type: "string", example: "127.0.0.1" },
							changePassword: { type: "boolean", example: false },
							changePasswordRequested: { type: "boolean", example: false },
							changePasswordBefore: { type: "string", example: "2022-03-09T15:38:57.361Z" },
							settings: { type: "object" },
						},
					},
					Error: {
						type: "object",
						properties: {
							code: { type: "string", description: "error code", example: "invalid_request" },
							message: { type: "string", description: "The error message", example: "Invalid request for this endpoint" },
						},
					},
					UnexpectedError: {
						type: "object",
						properties: {
							code: { type: "string", value: "unexpected", description: 'The string `"unexpected"`' },
							message: { type: "string", description: "The server error message" },
						},
					},
					UnknownError: {
						type: "object",
						properties: {
							code: { type: "string", value: "unknown", description: 'The string `"unknown"`' },
							message: { type: "string", description: "The server error message" },
						},
					},
					SchemaValidationError: {
						type: "object",
						properties: {
							code: { type: "string", description: 'The string `"schema_validation_failed"`', example: "schema_validation_failed" },
							message: { type: "string", description: "The server error message", example: 'Property at path "path/property" is of the wrong type' },
						},
					},
					RuleValidationError: {
						type: "object",
						properties: {
							code: { type: "string", description: 'The string `"rule"`', example: "rule" },
							message: { type: "string", description: "The server error message", example: 'write operation denied to path "path/property" by set rule' },
						},
					},
					SerializedValue: {
						type: "object",
						properties: {
							val: {
								description: "Any value (serialized for transport)",
								oneOf: [{ type: "string" }, { type: "number" }, { type: "integer" }, { type: "boolean" }, { type: "object" }, { type: "array" }],
								example: "2022-04-07T16:36:21Z",
								required: true,
							},
							map: {
								description:
									'If the value has been serialized for transport, contains a string defining `val`s data type (eg `"date"` or `"binary"`), or an object with deep property mappings for an object value in `val`',
								oneOf: [
									{ type: "string", example: "date" },
									{ type: "object", example: { "stats/created": "date" } },
								],
								example: "date",
								required: false,
							},
						},
						required: ["val"],
						example: {
							val: { name: "My todo list", stats: { size: 216, created: "2022-04-07T15:11:42Z", modified: "2022-03-08T12:24:05Z" } },
							map: { "stats/created": "date", "stats/modified": "date" },
						},
					},
					ReflectionNodeInfo: {
						type: "object",
						required: ["key", "exists", "type"],
						properties: {
							key: {
								description: "Key or index of the node",
								oneOf: [
									{
										type: "string",
										description: "key of the node",
										example: "jld2cjxh0000qzrmn831i7rn",
									},
									{
										type: "number",
										description: "index of the node (parent node is an array)",
										example: 12,
									},
								],
							},
							exists: {
								type: "boolean",
								description: "whether the target path exists",
								example: true,
							},
							type: {
								type: "string",
								enum: ["unknown", "object", "array", "number", "boolean", "string", "date", "binary", "reference"],
								description: "data type of the target path",
								example: "object",
							},
							value: {
								oneOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }, { type: "array" }, { type: "object" }],
								description: `target node's stored value if it is a boolean, number or date, a small string or binary value (less than configured max inline value size), or an empty object or array`,
								example: {},
							},
							address: {
								type: "object",
								description: "The physical location of the node in the database",
								required: ["pageNr", "recordNr"],
								properties: {
									pageNr: { type: "integer" },
									recordNr: { type: "integer" },
								},
							},
							children: {
								type: "object",
								description: `Information about the node's children (if requested)`,
								required: ["more", "list"],
								properties: {
									count: {
										type: "integer",
										description: "The total number of children",
										example: 2865,
									},
									more: {
										type: "boolean",
										description: "If there are more children than the ones in list",
										example: true,
									},
									list: {
										type: "array",
										description: "Reflection info about the requested children",
										items: {
											$ref: "#/components/schemas/ReflectionNodeInfo",
										},
										example: [
											{
												key: "name",
												type: "string",
												value: "My name",
											},
										],
									},
								},
							},
						},
						example: {
							key: "jld2cjxh0000qzrmn831i7rn",
							exists: true,
							type: "object",
							address: { pageNr: 0, recordNr: 234 },
							children: {
								count: 2865,
								more: true,
								list: [
									{
										key: "l260qein000009jy3yjig8h9",
										type: "object",
										address: { pageNr: 1, recordNr: 25 },
									},
									{
										key: "l260rp5b000109jy98ykf7x2",
										type: "object",
										address: { pageNr: 1, recordNr: 54 },
									},
								],
							},
						},
					},
				},
			},
			security: [
				// Enable bearer auth globally
				{ bearerAuth: [] },
			],
		},
		apis: [yamlPath],
	};

	const swaggerDocs = createSwaggerDocs(options);

	const content = `<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>${swaggerDocs.info.title} (${swaggerDocs.info.version})</title>
        <style>
            body {
                margin:0;
            }

            .kJndnU {
                display: none;
            }
        </style>
    </head>
    <body>
    <div id="redoc-container"></div>
    <script src="/docs/resources/js-yaml.js"></script>
    <script src="/docs/resources/openapisnippet.min.js"></script>
    <script src="/docs/resources/redoc.standalone.js"></script>
    <script>
        const schema = ${JSON.stringify(swaggerDocs)};

        const targets = {
            "shell_curl": "Shell", 
            "shell_httpie": "Shell",
            "node_request": "JavaScript", 
            "python_python3": "Python", 
            "php_curl": "PHP",
            "php_http1": "PHP", 
            "php_http2": "PHP"
        };
  
        for(var path in schema.paths){
            for(var method in schema.paths[path]){
                var generatedCode = OpenAPISnippets.getEndpointSnippets(schema, path, method, Object.keys(targets));
                schema.paths[path][method]["x-codeSamples"] = [];
                for(var snippetIdx in generatedCode.snippets){
                    var snippet = generatedCode.snippets[snippetIdx];
                    schema.paths[path][method]["x-codeSamples"][snippetIdx] = { "lang": targets[snippet.id], "label": snippet.title, "source": snippet.content };
                }
            }
        }

        Redoc.init(
            schema,
            {
                scrollYOffset: 'nav',
                hideDownloadButton: true,
                schemaExpansionLevel: 3,
                showObjectSchemaExamples: true
            },
            document.getElementById('redoc-container')
        );
    </script>
    </body>
</html>`;

	env.router.use("/docs/resources/*", (req, res, next) => {
		try {
			let filePath = path.join(packageRootPath, "/server/routes", req.originalUrl);

			if (!fs.existsSync(filePath)) {
				return next();
			}

			const content = fs.readFileSync(filePath);

			res.writeHead(200, {
				"Content-Length": content.length,
			});

			return res.end(content, "binary");
		} catch {
			return next();
		}
	});

	env.router.use("/docs", (req, res) => {
		res.setHeader("Content-type", "text/html");
		res.send(content);
	});
	//env.router.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));
};

export default addRoute;
