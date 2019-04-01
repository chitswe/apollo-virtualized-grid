const execa = require("execa");
const secret = require("./example/secret.json");
execa.sync("apollo-codegen", [
  "introspect-schema",
  "https://api.github.com/graphql",
  "--output",
  "schema.json",
   "--header",
  `Authorization: Bearer ${secret.githubUserToken}` 
]);

const files = [
  [
    "example/graphql.ts",
    "example/types.ts"
  ]
];

const promises = files.map(f => {
  const [source, output] = f;
  return execa("apollo-codegen", [
    "generate",
    source,
    "--schema",
    "schema.json",
    "--target",
    "typescript",
    "--tag-name",
    "gql",
    "--output",
    output,
    "--add-typename"
  ]);
});

Promise.all(promises).then(() => {
  console.log("Types has been generated");
});