class Star {
    constructor(x, y, z) {
        this.x = random(-width, width)
        this.y = random(-height, height)
        this.pz = this.z = random(width)
    }

    update() {
        this.pz = this.z

        this.z = this.z-speed
        if (this.z < 1) {
            this.pz = this.z = width;
            this.x = random(-width, width)
            this.y = random(-height, height)
        }
    }

    show() {
        fill(255)
        noStroke()

        let sx = map(this.x / this.z, 0, 1, 0, width);
        let sy = map(this.y / this.z, 0, 1, 0, height)

        let px = map(this.x / this.pz, 0, 1, 0, width);
        let py = map(this.y / this.pz, 0, 1, 0, height)

  
        let r = map(this.z, 0, width, 16, 0)
        // ellipse(sx, sy, r, r)
        stroke(255)
        line(px, py, sx, sy)
    }
}

let speed
let stars = []
let starsLength = 800

function setup() {
    createCanvas(800, 800)
    for (let i = 0; i < starsLength; i++) {
        stars[i] = new Star()
    }
}

function draw() {
    speed = map(mouseX, 0, width, 10, 40)
    background(0)
    translate(width/2, height/2)
    for (let i = 0; i < starsLength; i++) {
        stars[i].update()
        stars[i].show()
    }
}
