"use strict";

/* global XXH */
/* exported --
    p3_preload
    p3_setup
    p3_worldKeyChanged
    p3_tileWidth
    p3_tileHeight
    p3_tileClicked
    p3_drawBefore
    p3_drawTile
    p3_drawSelectedTile
    p3_drawAfter
*/

// on mazes http://people.cs.ksu.edu/~ashley78/wiki.ashleycoleman.me/index.php/Perfect_Maze_Generators.html
// todo
// - add animals animals grazing, maybe they also cause ripples. im thinking we need a spawned array that checks if spawn like w placeTile
// vegetation https://pablogamedev.itch.io/free-isometric-ature-voxel-enviroment
// https://finalbossblues.itch.io/animals-sprite-pack
// https://seliel-the-shaper.itch.io/monsterbattlerset
// isometric items https://ssugmi.itch.io/16x16-pixel-kitchenwareingredients-pack
// https://withering-systems.itch.io/city-game-tileset
// viking ship https://helianthus-games.itch.io/pixel-art-viking-ship-16-directions
//

class Sprite {
  constructor(animation, option, speed) {
    this.animation = animation;
    this.option = option;
    this.speed = speed;
    this.index = 0;
    this.wO = 42;
    this.hO = 36;
    this.totalFrames = 3;
  }

  show(x, y) {
    let index = floor(this.index) % this.totalFrames;
    image(
      this.animation,
      0,0,
      40,
      40,
      index * this.wO,
      this.option * this.hO,
      this.wO,
      this.hO
    );
  }

  animate() {
    this.index += this.speed;
  }
}

let tilesetImage;
let animalImage;
let lighthouseImage;
let pigImage;
let pigs = [];
let pig;
function p3_preload() {
  tilesetImage = loadImage(
    "https://cdn.glitch.com/c3daddd3-de7a-49cd-bbfa-e749378a8fbf%2Ftilesheet_complete.png?v=1612566704408"
  ); // from Kenney.nl
  animalImage = loadImage(
    "https://cdn.glitch.com/c3daddd3-de7a-49cd-bbfa-e749378a8fbf%2Fanimals3.png?v=1612548365370"
  );
  lighthouseImage = loadImage("https://cdn.glitch.com/c3daddd3-de7a-49cd-bbfa-e749378a8fbf%2Flighthouse.png?v=1612566005585");
  pig = new Sprite(animalImage, 5, 0.01);
}

function p3_setup() { }

let worldSeed;

function p3_worldKeyChanged(key) {
  worldSeed = XXH.h32(key, 0);
  noiseSeed(worldSeed);
  randomSeed(worldSeed);

  tileSprites = {};
}

function p3_tileWidth() {
  return 32;
}
function p3_tileHeight() {
  return 16;
}

let [tw, th] = [p3_tileWidth(), p3_tileHeight()];

let clicks = {};
let rippleSources = [];
let tileSprites = {};

let path = [];
let goal = [0,0];


function heuristic(a1, a2, b1, b2) {
  return dist(a1, a2, b1, b2);
}

let pigP = [0,0]
let idx;
function p3_tileClicked(i, j) {
  idx = 0;
  let key = [i, j];
  let goal = [i, j]
  let start = pigP;
  clicks[key] = 1 + (clicks[key] | 0); // increment clicks
  // rippleSources.push([i, j, millis()]);

  if (tileType[key] != nodeType) {
    print("Cannot move there!");
    return;
  }

  function neighbors(a, b) {
    let x = a, y = b;
    let ret = [
      [x - 1, y],
      [x + 1, y],
      [x, y + 1],
      [x, y - 1]
    ];
    return ret;
  }

  function cost() {
    return 1;
  }

  function aStarSearch(a, b, x, y) {
    let open = new Heapify();
    let start = [a, b]
    let goal = [x, y]
    let closed = {};
    open.push(start, 0);
    let openLookup = {}
    openLookup[start] = 1;
    let costs = {};
    costs[start] = 0;
    let cameFrom = {};
    let isFound = false;

    while (open.length > 0 && idx < 100) {
      idx++;
      let c = open.pop();
      if (c[0] == goal[0] && c[1] == goal[1]) {
        isFound = true;
        break;
      }
      closed[c] = 1;// how we got here
      for (let i = 0, arr = neighbors(c[0], c[1]); i < arr.length; i++) {
        let neighbor = arr[i]
        if (!tileType[neighbor]){
          isFound = false;
          break;
          print("Too far away!")
        }
        if (tileType[neighbor] != nodeType) {
          continue;
        }
        if (closed[neighbor]) {
          continue;
        }
        let newPath = false;
        let currCost = costs[c] + heuristic(neighbor[0], neighbor[1], goal[0], goal[1]);
        if (openLookup[neighbor]) {
          if (currCost < costs[neighbor]) {
            costs[neighbor] = currCost
            newPath = true;
          }
        } else {
          costs[neighbor] = currCost
          open.push(neighbor, currCost);
          openLookup[neighbor] = 1;
          newPath = true;
        }

        //best found
        if (newPath) {
          cameFrom[neighbor] = c;
          costs[neighbor] = currCost;
        }
      }
    }
    if(!isFound) {
      print("Location is too far away!")
    }
    return cameFrom;
  }

  if (goal) {
    let cameFrom = aStarSearch(pigP[0], pigP[1], i, j); // needa update pig coords

    function getPath(cameFrom) {
      path = [goal];
      let curr = goal;
      let b = 0;
      while (curr[0] != start[0] || curr[1] != start[1]) {
        b++
        curr = cameFrom[curr]
        path.unshift(curr)
      }
    }
    getPath(cameFrom);
    pigP = path.shift();
  }
}


function p3_drawBefore() { }

let tileType = {};
let nodeType = "n";
let edgeType = "+";
let wallType = "w";
let nodes = [], edges = [], walls = [];
let isDone = {}

let N = 1,
  S = 2,
  E = 4,
  W = 8;
let dX = { E: 1, W: -1, N: 0, S: 0 }
let dY = { E: 0, W: 0, N: 1, S: -1 }
let opposite = { E: "W", W: "E", N: "S", S: "N" }

let time = 0;
let moveTimer = 0;
function p3_drawTile(i, j) {
  noStroke();

  let key = [i, j];

  //   01234567
  // 0 N+N+N+N+
  // 1 +W+W+W+W
  // 2 N+N+N+N+
  function genBaseGrid(i, j) {  // http://weblog.jamisbuck.org/2011/2/1/maze-generation-binary-tree-algorithm
    if (!tileType[key]) {
      if (!(i & 1)) { // even col
        if (!(j & 1)) { // even row
          tileType[key] = nodeType;
          nodes.push[key]
        }
        else {      // odd row
          tileType[key] = edgeType;
          edges.push[key]
        }
      }
      else {  // odd col
        if (!(j & 1)) { // even row
          tileType[key] = edgeType;
          edges.push[key]
        }
        else {      // odd row
          tileType[key] = wallType;
          walls.push[key]
        }
      }
    }
  }

  genBaseGrid(i, j);

  function binaryTreeMaze(i, j) {
    if (!(i & 1) && !(j & 1) && !isDone[key]) {
      time = 0;
      if (tileType[key] == nodeType) {
        let dirs = ["N", "W"];
        let index = random(0, dirs.length) | 0;
        let dir = dirs[index]
        let ni = i + dX[dir];
        let nj = j + dY[dir];
        tileType[[ni, nj]] = nodeType;
        nodes.push([ni, nj])
        isDone[key] = 1;
      }
    }
  }

  binaryTreeMaze(i, j);

  if (!tileSprites[key]) {
    // let subtypeSeed = worldSeed + i + "," + j;  // TODO is this correct?
    let n = (noise(i, j) * 4) + 17 | 0;  // pick tile here
    // let n = 18;
    tileSprites[key] = n;
  }

  // expensive
  // if (XXH.h32("tile:" + [i, j], worldSeed) % 4 == 0) {
  //   fill(240, 200);
  // } else {
  //   fill(255, 200);
  // }

  function r(i, j) {
    let now = millis() / 1000.0;
    let h = 1 * noise(i / 10 + 1.0 * now, j / 10 - 0.5 * now, now / 5);
    for (let [ri, rj, t] of rippleSources) {
      let di = i - ri;
      let dj = j - rj;
      let r = sqrt(di * di + dj * dj) + 1; // + 1 iot make tile with radius == 0 not be erased
      let timePassed = abs(t - millis());
      let easeOut = exp(-timePassed / 500.0);
      h += 0.5 * ((sin(r - timePassed / 100.0) / r) * r) * easeOut;
      if (timePassed > 5000) rippleSources.shift();
    }
    return h * p3_tileWidth();
  }
  push(); // start new drawing state
  // let o = r(i, j);
  placeTile(i, j, 0)

  let moveThresh = 300;
  if(path.length > 0 && millis() - moveTimer > moveThresh) {
    pigP = path.shift();
    moveTimer = millis();
  }

  let c = clicks[[i, j]] | 0;
  if (c % 2 == 1) {
    // image(lighthouseImage, 0, o / 9);
    fill(0, 0, 0, 32);
    ellipse(0, 0, 10, 5); // how does it know to create it at the tile? push(), and prolly the engine.js draw()
    fill(255, 255, 100, 128);
    ellipse(0, 0, 10, 10); // shadow
  }

  // draw pig
  if (key[0] == pigP[0] && key[1] == pigP[1]) {
     p3_drawAnimal(pigP[0], pigP[1]);}
  pop();
}

function placeTile(i, j, hOff) {
  // ti and tj determine tile used
  let key = [i, j];
  let ti = 0
  let tj = 0;
  if (tileType[key] == nodeType) {
    ti = 10;
  }
  else if (tileType[key] == edgeType) {
    ti = 11;
    tj = 1.15
  }
  else if (tileType[key] == wallType) {
    ti = 11;
    tj = 1.1
  }
  // if(i == 0 && j == 0) {
  //   ti = 20;
  // }
  image(tilesetImage, -32, -16, 64, 64, ti * 111, tj * 128, 111, 128); // take offset from lookup(code)
}

function p3_drawAnimal(i, j) {
    push();
    let tr = -20;
    translate(tr, 1.5*tr);
    pig.show(i, j);
    pig.animate();
    translate(-tr, -tr*1.5);
    pop();
}

function p3_drawSelectedTile(i, j) {
  noFill();
  stroke(0, 255, 0, 128);

  beginShape();
  vertex(-tw, 0);
  vertex(0, th);
  vertex(tw, 0);
  vertex(0, -th);
  endShape(CLOSE);

  noStroke();
  fill(0);
  text("tile " + [i, j], 0, 0);
}

function p3_drawAfter() { }
