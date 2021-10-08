#!/usr/bin/env node
const chokidar = require("chokidar")
const { spawn, execSync } = require("child_process")
var args = process.argv.slice(2)

let spawned
let spawning = false

function debounce(func, wait, immediate = false) {
  var timeout
  return function () {
    var context = this,
      args = arguments
    var later = function () {
      timeout = null
      if (!immediate) func.apply(context, args)
    }
    var callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) func.apply(context, args)
  }
}

const restartChild = debounce(async () => {
  if (spawning) {
    return
  }
  spawning = true
  function spawnNext() {
    const toSpawn = args.slice(1).join(" ")
    console.log(`Running "${toSpawn}"`)
    // execSync(`kill $(lsof -t -i:3000) | exit 0`)
    // console.log(process.cwd())
    spawned = spawn(args[1], args.slice(2), {
      stdio: [0, 1, 2],
    })
    spawning = false
    // console.log(`Child process id is ${spawned.pid}`)
  }
  if (spawned) {
    spawned.on("exit", () => {
      spawnNext()
    })
    spawned.kill()
  } else {
    spawnNext()
  }
}, 1000)

const toWatch = args[0]
console.log(`Watching ${toWatch}`)

chokidar
  .watch(toWatch, {
    ignoreInitial: true,
  })
  .on("all", (event, path) => {
    console.log(`Restarting because of "${path}"`)
    restartChild()
  })

restartChild()
