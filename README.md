#how to run

start temporal dev server

`sh ./start-temporal.sh`

`sh ./setup-temporal-search.sh`

install dependencies

`pnpm run install-clean-deps`

run frontend
`pnpm run dev`

run worker
`pnpm run worker`

requires

- `temporal` [cli](https://docs.temporal.io/cli/)

- `pnpm` (if you have nodejs installed already you can run `corepack enable` to install pnpm see [corepack](https://nodejs.org/dist/latest-v20.x/docs/api/corepack.html) )
