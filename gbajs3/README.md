# Getting started

## Optional env variables

```
VITE_GBA_SERVER_LOCATION=https://localhost
```

The env above is used to communicate with the authorization server.

## Install dependencies

```
npm install;
```

## Development

To run the development server locally:

```
npm run dev;
```

Visit the url output after running the command above in your browser to see the application.

## Build

To build the application for production:

```
npm run build;
```

The build output will be in the `./dist` directory.

## Linting

To run the linter:

```
npm run lint;
```

To fix linting issues:

```
npm run lint -- --fix;
```

To assess vulnerabilities, run:

```
npm audit
```

## Additional commands

Use:

```
npm run;
```

to list available scripts