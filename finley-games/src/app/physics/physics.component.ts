import { Component, OnInit, ElementRef,ViewChild } from '@angular/core';
import { event } from 'jquery';
import { Engine, World, Bodies, Body,Runner,Render,Vector,Common,
  Mouse, MouseConstraint, Composite, Events, Constraint, Composites} from 'matter-js';
import p5 from 'p5';

let engine:Engine;
let world:World;
let p:p5;
let myCanvas:HTMLElement;

let myBoundaries:Creation[] = [];
let myElements:Map<number,Creation> = new Map<number,Creation>();

let averageSpeed = 0;
let maxSpeed = 0;
const colorKey = 1000;

@Component({
  selector: 'app-physics',
  standalone: true,
  imports: [],
  templateUrl: './physics.component.html',
  styleUrl: './physics.component.scss'
})
export class PhysicsComponent implements OnInit {
  @ViewChild('sketch') canvas: ElementRef;

  constructor() {}

  ngOnInit() {}

  ngAfterViewInit() {
    p = new p5(this.sketch, this.canvas.nativeElement);
    myCanvas = this.canvas.nativeElement;
  }

  sketch(p:p5) {
    p.preload = () => {};

    p.setup = () => {
      p.createCanvas(p.windowWidth, p.windowHeight * 0.75);

      // setup physics engine and world
      engine = Engine.create({
        gravity: {
          scale:0
        }
      });
      world = engine.world;

      var render = Render.create({
        element: document.getElementById("sketch2") as HTMLCanvasElement,
        engine: engine,
        options: {
            width: p.windowWidth/2,
            height: p.height,
            wireframes: true
        }
      });

      Render.run(render);

      // create runner
      var runner = Runner.create();
      Runner.run(runner, engine);
      
      // add mouse constraint to engine
      let mouseElement = Mouse.create(render.canvas);
      let mouseConstraint = MouseConstraint.create(engine, {
        mouse: mouseElement,
        constraint: {
            stiffness: 0.9,
            render: {
                visible: false
            }
        }
      });

      Composite.add(world,mouseConstraint);
      render.mouse = mouseElement;
      
      Render.lookAt(render, {
        min: { x: 0, y: 0 },
        max: { x: p.width, y: p.height }
      });

      var particleOptions = { 
        friction: 0.05,
        frictionStatic: 0.1,
        render: { visible: false } 
    };
      Composite.add(world,[
        softBody(250, 100, 5, 5, 5, 5, true, 25, particleOptions),
        Bodies.rectangle(p.width/2, 0, p.width, 50, { isStatic: true }),
        Bodies.rectangle(p.width/2, p.height, p.width, 50, { isStatic: true }),
        Bodies.rectangle(0, p.height/2, 50, p.height, { isStatic: true }),
        Bodies.rectangle(p.width, p.height/2, 50, p.height, { isStatic: true })
      ]);

      /*Events.on(engine,'collisionStart', function(event){
        let pairs = event.pairs;
        for(let p of event.pairs) {
          let b1 = myElements.get(p.bodyA.id);
          let b2 = myElements.get(p.bodyB.id);
          if ( b1 != undefined && b2 != undefined && b1.colorValue != undefined && b1.colorValue == b2.colorValue) {
            
          }
        }
      });*/


      /*myBoundaries.push(new Creation([new Boundary(BoundaryType.top,false)]));
      myBoundaries.push(new Creation([new Boundary(BoundaryType.right,false)]));
      myBoundaries.push(new Creation([new Boundary(BoundaryType.bottom,false)]));
      myBoundaries.push(new Creation([new Boundary(BoundaryType.left,false)]));
      let b = new Ball(p.width/2,p.height/2,p.random(25,25));
      myElements.set(b.body.id, new Creation([b]));*/
    }

    p.windowResized = () => {
      p.resizeCanvas(p.windowWidth, p.windowHeight);
    };

    p.keyPressed = () => {
      
    }

    p.draw = () => {
      return;
      // handles updating the physics engine by the appropriate change in time based on the frame rate
      let frameRate = p.frameRate();
      const oldDelta = p.deltaTime;
      let newDelta = 1000/frameRate;

      if ( p.keyIsDown(71)) {
        newDelta /= 2;
      }
      Engine.update(engine, newDelta, newDelta/oldDelta);

      p.background(360);
      
      if(p.keyIsDown(32) || myElements.size < 1000) {
        let b = new Ball(p.width/2,p.height/4,p.random(5,5));
        myElements.set(b.body.id, new Creation([b]));
      }

      let speedSum = 0;
      myElements.forEach( (value:Creation,key:number)=>{
        value.refreshPosition();
        value.show();
        speedSum += value.speed();
        maxSpeed = Math.max(maxSpeed, value.speed());
      });

      averageSpeed = speedSum / myElements.size;

      myBoundaries.forEach( (b:Creation)=>{
        b.show();
      });
    };
  }
}


function softBody(xx:number, yy:number, columns:number, rows:number, columnGap:number, rowGap:number,
   crossBrace:boolean, particleRadius:number, particleOptions?:{}, constraintOptions?:{}) {

  particleOptions = Common.extend({ inertia: Infinity }, particleOptions!=undefined);
  constraintOptions = Common.extend({ stiffness: 0.2, render: { type: 'line', anchors: false } }, constraintOptions!=undefined);

  var softBody = Composites.stack(xx, yy, columns, rows, columnGap, rowGap, function(x:number, y:number) {
      return Bodies.circle(x, y, particleRadius, particleOptions);
  });

  Composites.mesh(softBody, columns, rows, crossBrace, constraintOptions);

  softBody.label = 'Soft Body';

  return softBody;
};

class Creation {
  shapes:Shape[];
  composite:Composite;

  private maxX = 0;
  private minX = 0;
  private maxY = 0;
  private minY = 0;

  constructor(shapes:Shape[]) {
    let bodies = [];
    for(let shape of shapes ) {
      bodies.push(shape.body);
    }

    this.composite = Composite.create({
      bodies:bodies
    })
    this.shapes = shapes;

    Composite.add(world,this.composite);
    this.refreshMaxesAndMins();
  }

  private refreshMaxesAndMins() {
    let shapes = this.shapes;

    let firstMaxAndMins = shapes[0].getMaxAndMin();
    let maxX = firstMaxAndMins.maxX;
    let minX = firstMaxAndMins.minX;
    let maxY = firstMaxAndMins.maxY;
    let minY = firstMaxAndMins.minY;

    for(let i = 1; i < shapes.length; i++) {
      let p = shapes[i].getMaxAndMin();
      maxX = Math.max(maxX,p.maxX);
      minX = Math.min(minX,p.minX);
      maxY = Math.max(maxY,p.maxY);
      minY = Math.min(minY,p.minY);
    }
    
    this.maxX = maxX;
    this.minX = minX;
    this.maxY = maxY;
    this.minY = minY;
  }

  // calculates it as the center between the width and height
  position() {
    return {x:(this.maxX + this.minX)/2,y:(this.maxY + this.minY)/2};
  }

  // calculates the size based on the max of the width or height
  size() {
    return Math.sqrt(Math.pow(this.maxX - this.minX,2) + Math.pow(this.maxY - this.minY,2));
  }

  // refreshes the position of the composite in the physics engine
  refreshPosition() {
    this.refreshMaxesAndMins();
    let size = this.size();
    let newX = this.position().x;
    let newY = this.position().y;

    // handle x position setting
    if ( this.maxX < (0 - size) ) {
      newX = 0;//p.width + size;
    } else if ( this.minX > (p.width + size)) {
      newX = p.width//0 - size;
    }

    // handle y position setting
    if ( this.maxY < (0 - size) ) {
      newY = 0;//p.height + size;
    } else if ( this.minY > (p.height + size) ) {
      newY = p.height//0 - size;
    }
    let pos = this.position();
    Composite.translate(this.composite,{x:newX - pos.x,y:newY - pos.y});
  }

  // a function for only display this creation in p5
  show() {
    for(let shape of this.shapes ) {
      shape.show();
    }
  }

  speed() {
    let speed = 0;
    for(let s of this.composite.bodies) {
      speed += s.speed;
    }

    return speed/this.composite.bodies.length;
  }
}

abstract class Shape {
  // display properties
  color:p5.Color;
  colorValue?:number;
  // physics properties
  body:Body;

  abstract draw():void;

  constructor(body:Body,color?:p5.Color) {
    if ( color == undefined ) {
      this.colorValue = Math.round(p.random(0,colorKey));
    } else {
      this.color = color;
    }
    
    this.body = body;
  }

  show() {
    p.push();

    if ( this.colorValue != undefined ) {
      p.colorMode(p.HSL,colorKey);
      // 0 - colorKey
      let val = (this.body.speed / (maxSpeed==0?1:maxSpeed)) * colorKey;
      p.fill(p.color(val,colorKey,colorKey*0.5));
    } else {
      p.fill(this.color);
    }
    
    p.translate(this.body.position.x,this.body.position.y);
    p.rotate(this.body.angle);
    this.draw();
    p.pop();
  }

  getMaxAndMin() {
    let vertices = this.body.vertices;
    let maxX = vertices[0].x;
    let minX = vertices[0].x;
    let maxY = vertices[0].y;
    let minY = vertices[0].y;
    for(let v of vertices) {
      maxX = Math.max(maxX,v.x);
      minX = Math.min(minX,v.x);
      maxY = Math.max(maxY,v.y);
      minY = Math.min(minY,v.y);
    }
    return {
      maxX:maxX,
      minX:minX,
      maxY:maxY,
      minY:minY
    };
  };
}

class Rectangle extends Shape{
  // display properties
  width:number;
  height:number;

  constructor(x:number,y:number,w:number,h:number,isStatic:boolean,color?:p5.Color) {
    // create physics body and add to world
    let body = Bodies.rectangle(x,y, w, h,{
      isStatic:isStatic
    })
    super(body,color);
    this.width = w;
    this.height = h;
  }

  draw() {
    p.rectMode(p.CENTER);
    p.rect(0, 0, this.width,this.height);
  }
}
enum BoundaryType {
  top,
  right,
  bottom,
  left
}
class Boundary extends Rectangle {
  type:BoundaryType;
  visible:boolean;
  thickness:number = 100;
  
  constructor(type:BoundaryType,visible?:boolean) {
    let thickness = 100;

    let x = 0;
    let y = 0;
    let width = p.width;
    let height = p.height;

    visible = visible == undefined?true:visible;

    if ( type == BoundaryType.top ) {
      x = p.width/2;
      y = 0 + (visible?1:-1) * thickness/2;
      height = thickness;
      width = p.width;
    } else if ( type == BoundaryType.right) {
      x = p.width + (visible?-1:1) * thickness/2;
      y = p.height/2;
      height = p.height;
      width = thickness;
    } else if ( type == BoundaryType.bottom) {
      x = p.width/2;
      y = p.height + (visible?-1:1) * thickness/2;
      height = thickness;
      width = p.width;
    } else if ( type == BoundaryType.left) {
      x = 0 + (visible?1:-1) * thickness/2;
      y = p.height/2;
      height = p.height;
      width = thickness;
    }
    
    super(x,y,width,height,true);
    this.type = type;
    this.thickness = thickness;
    this.visible = visible;
  }
}

class Ball extends Shape {
  radius:number;

  constructor(x:number,y:number,r:number,color?:p5.Color) {
    let body = Bodies.circle(x,y,r,{
      friction:0,
      restitution:0,
      frictionAir:0,
      frictionStatic:0
    });
    super(body,color);
    this.radius = r;
  }

  draw() {
    p.noStroke();
    p.circle(0,0,this.radius * 2);
  }

  size() {
    return this.radius * 2;
  }
}