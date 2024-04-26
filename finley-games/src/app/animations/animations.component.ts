import { Component,ViewChild, ElementRef, OnInit, AfterViewInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { elementAt } from 'rxjs';
import { radToDeg } from 'three/src/math/MathUtils';

let myCanvas:HTMLCanvasElement;
const myWidth = 500;
const myHeight = 500;
const numPoints = round(myWidth*myHeight/10000);
const blobSize = 500;

@Component({
  selector: 'app-animations',
  standalone: true,
  imports: [NgFor,NgIf],
  templateUrl: './animations.component.html',
  styleUrl: './animations.component.scss'
})
export class AnimationsComponent implements AfterViewInit {

  @ViewChild('myCanvas') myCanvas: ElementRef;

  canvas:HTMLCanvasElement;
  context:CanvasRenderingContext2D;
  width = myWidth;
  height = myHeight;
  blobRefreshTime = 2000;//ms

  originalSvg:string;
  svgPaths:string[];
  repeatCount = 0;
  blobPoints:Vector[];
  center:Vector;

  blobs:Blob[] = [];
  world:World;

  target: Vector;
  applyForce:boolean;
  automate:boolean;

  constructor() {
    this.applyForce = false;
    this.automate = false;
    this.svgPaths = [];
    this.blobPoints = [];
    this.world = new World();
  }

  ngAfterViewInit(): void {
    /**this.canvas = this.myCanvas.nativeElement as HTMLCanvasElement;
    myCanvas = this.canvas;
    this.canvas.width = 500;
    this.canvas.height = 500;

    const ctx = this.canvas.getContext("2d");

    if ( ctx != undefined ) {
      this.context = ctx;
    }*/
    /**this.canvas.onmousemove = (event) => {
      let x = event.offsetX;
      let y = event.offsetY;
      this.target = new Vector(x,y);
    };*/

    document.onkeydown = (event ) => {
      let key = event.key;

      if ( key == 'y') {
        this.applyForce = !this.applyForce;
      } else if ( key == ' ') {
        this.draw();
        this.doPhysics();
      } else if ( key == 't') {
        this.automate = !this.automate;
      } else if ( key == 'b') {
        this.world.points.push(new BlobPoint(this.target.x,this.target.y));
        this.draw();
      }
    }

    let interval = 60;
    let timesRefreshed = 0;
    setInterval(()=>{
      // resets the canvas
      if ( this.automate || true) {
        this.doPhysics();

        timesRefreshed++;
        /*if ( timesRefreshed * (1000/interval) >= this.blobRefreshTime ) {
          this.draw();
          timesRefreshed = 0;
        }*/
        this.draw();
      }
    },1000/interval);
  }

  doPhysics() {
    this.world.refreshForces();
    this.world.clearGenericForces();
    if ( this.applyForce ) {
      this.world.pointForces = [this.target];
    }
    this.world.refreshVertices();
  }

  draw() {
    // break world Points into blobs;
    let newBlobs:Blob[] = [];
    this.svgPaths = [];

    let colorCount = 50;
    let currentColor = 0;
    for(let p of this.world.points) {
      let dist = blobSize;
      let index = -1;
      for(let i = 0; i < newBlobs.length; i++) {
        let d = Vector.getDistance(p.position,newBlobs[i].center);
        if ( d < dist ) {
          index = i;
          dist = d;
        }
      }
      // if it wasn't added to a blob, create a new blob for this point
      if( index == -1 ) {
        
        let newBlob = new Blob(blobSize,[p]);
        newBlob.setColor(`hsl(${currentColor} 65% 40%)`);
        newBlobs.push(newBlob);
        currentColor += colorCount;
      } else {
        newBlobs[index].addPoint(p);
      }
    }
    let averageDistance = 0;
    let numPointsLocal = 0;
    newBlobs.forEach(b=>{
      b.refreshOrder();
      b.points.forEach((p,i)=>{
        let l = lineLength(p.position,b.center);
        averageDistance+=l;
        numPointsLocal++;
      });
      this.center = b.center;
    });
    averageDistance/=numPointsLocal;
    this.blobs = newBlobs;
    
    let blobPoints:BlobPoint[] = [];
    newBlobs.forEach(b=>{
      b.points.forEach((p,i)=>{
        let l = lineLength(p.position,b.center);
        if ( l > averageDistance ) {
          blobPoints.push(p);
        }
      });
    });

    let bTemp = new Blob(100,blobPoints);
    bTemp.refreshOrder();

    let blobVectors:Vector[] = [];
    for(let p of bTemp.points) {
      blobVectors.push(p.position);
    }

    this.blobPoints = blobVectors;
    blobVectors.push(blobVectors[0]);
    this.svgPaths.push(svgPath(blobVectors,bezierCommand));

    // resets the canvas
    /**this.context.reset();
    //this.world.display(this.context);
    newBlobs.forEach(b=>{
      b.refreshOrder();
      let svg = b.getSVG();
      let path = new Path2D(svg);
      this.context.strokeStyle = b.color;
      this.context.stroke(path);
    });*/
  }
}

class PointHelper {
  pos:Vector;
  length:number;
  index:number;

  constructor(pos:Vector,length:number,i:number) {
    this.pos = pos;
    this.length = length;
    this.index = i;
  }
}

function svgPath(points:Vector[],command:Function) {
  const d = points.reduce((acc:String,point:Vector,i:number,a:Vector[])=>{
    if ( i == 0 ) {
      return `M ${point.x},${point.y}`;
    }
    return `${acc} ${command(point, i, a)}`;
  },''); 
  return d;
}

function lineCommand(point:Vector) {
  return `L ${point.x} ${point.y}`;
}

function lineAngle(pointA:Vector,pointB:Vector) {
  const lengthX = pointB.x - pointA.x;
  const lengthY = pointB.y - pointA.y;
  return Math.atan2(lengthY, lengthX);
}
function lineLength(pointA:Vector,pointB:Vector) {
  const lengthX = pointB.x - pointA.x;
  const lengthY = pointB.y - pointA.y;
  return Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2));
}

function controlPoint(current:Vector, previous:Vector, next:Vector, reverse:boolean) {
  // When 'current' is the first or last point of the array
  // 'previous' or 'next' don't exist.
  // Replace with 'current'
  const p = previous || current;
  const n = next || current;  
  // The smoothing ratio
  const smoothing = 0.2;
  // Properties of the opposed-line
  const oLength = lineLength(p, n);
  const oAngle = lineAngle(p,n);
  // If is end-control-point, add PI to the angle to go backward
  const angle = oAngle + (reverse ? Math.PI : 0);
  const length = oLength * smoothing;
  // The control point position is relative to the current point
  const x = current.x + Math.cos(angle) * length;
  const y = current.y + Math.sin(angle) * length;
  return new Vector(x,y);
}

function bezierCommand(point:Vector, i:number, a:Vector[]) {
  // start control point
  const cp = controlPoint(a[i - 1], a[i - 2], point,false);
  // end control point
  const cpe = controlPoint(point, a[i - 1], a[i + 1], true)
  return `C ${cp.x},${cp.y} ${cpe.x},${cpe.y} ${point.x},${point.y}`
}

function random(min:number, max:number) {
  return Math.round(Math.random() * (max - min) + min);
}

function round(val:number) {
  return Math.round(val * Math.pow(10,5)) / Math.pow(10,5);
}

// describes a vector pointing from (0,0) to (x,y)
class Vector {
  x:number;
  y:number;

  constructor(x:number, y:number) {
    this.x = x;
    this.y = y;
  }

  // decreases with distance, linearly. F = d2-d1. If d2 - d1 < minDistance, force becomes attractive
  static getBlobPointForce(a:Vector, b:Vector, expectedDistance:number, elasticity:number) {
    let dx = Math.abs(b.x - a.x);
    let dy = Math.abs(b.y - a.y);
    let dt = Math.sqrt(dx*dx + dy * dy);

    let o = 15;
    let w = 30;
    let f1 = -1 * Math.pow(w,2) * Math.atan(dt-w)/Math.pow(Math.abs(dt+o),3);
    let f2 = dt - w + o;
    let force = f1;
    if ( f1 < 0 && f2 < f1 ) {
      force = f2;
    }
    // prevents deviding by 0
    if ( Math.abs(force) <= 0) {
      return new Vector(0,0);
    }
    let percentX = dx/(Math.abs(dy)+Math.abs(dx));
    let percentY = dy/(Math.abs(dy)+Math.abs(dx));
     
    let mfx = percentX * force; // decrease by the overall distance^2
    let mfy = percentY * force; // decrease by the overall distance^2
    return new Vector(round(mfx),round(mfy));
  }

  static getBlobPointForceOnA(a:Vector,b:Vector,minDistance:number, elasticity:number) {
    let f = Vector.getBlobPointForce(a,b, minDistance,elasticity);

    f.x *= Math.sign(a.x - b.x);
    f.y *= Math.sign(a.y - b.y);

    return f;
  }

  static getDistance(a:Vector,b:Vector) {
    let xDiff = a.x - b.x;
    let yDiff = a.y - b.y;
    return Math.sqrt(xDiff*xDiff + yDiff*yDiff);
  }
}

class Point {
  position:Vector;
  mass:number;
  length:number;

  constructor(x:number,y:number,length:number) {
    this.position = new Vector(x,y);
    this.length = length;
  }
}

class BlobPoint extends Point {
  force:Vector;
  elasticity:number;
  inertia:number;

  //used when sorting the BlobPoints in a blob
  angleFromCenter:number;
  color:string;

  constructor(x:number,y:number) {
    super(x,y,1);
    this.elasticity = 1;
    this.inertia = 1;//how quickly it wants to move when a force is applied
    this.force = new Vector(0,0);
    this.color = '';
  }

  move() {
    let f = this.force;
    if ( Math.abs(f.x) + Math.abs(f.y) == 0 ) {
      return;
    }
    
    let cx = round(this.inertia * f.x);
    let cy = round(this.inertia * f.y);
    this.position.x = round((Math.abs(cx))*Math.sign(cx) + this.position.x);
    this.position.y = round((Math.abs(cy))*Math.sign(cy) + this.position.y);
  }
}

class World {
  points:BlobPoint[] = [];

  genericForces:Vector[] = [];
  pointForces:Vector[] = [];

  constructor() {
    for(let i = 0; i < numPoints; i++) {
      this.points.push(new BlobPoint(random(0,myWidth/2)+myWidth/4,random(0,myHeight/2)+myHeight/4));
    }
  }

  applyForce(force:Vector) {
    this.genericForces.push(force);
  }

  clearGenericForces() {
    this.genericForces = [];
  }

  // generates the forces applied to each point by the other points in the blob
  refreshForces() {
    for(let pi = 0; pi < this.points.length; pi++) {
      this.points[pi].force.x = 0;
      this.points[pi].force.y = 0;
      
      for(let i = 1; i < this.points.length; i++) {
        let index = (pi + i) % this.points.length;
        if ( index == pi ) {
          continue;
        }
        let dx = this.points[index].position.x - this.points[pi].position.x;
        let dy = this.points[index].position.y - this.points[pi].position.y;

        let d = Math.sqrt(dx * dx + dy * dy);
        if ( d == 0 ) {
          console.log('error');
          continue;
        }

        let expectedLength = 10;//this.radius * (-1 * Math.cos((2 * Math.PI*i)/this.points.length) + 1);

        let pF = Vector.getBlobPointForceOnA(this.points[pi].position,this.points[index].position,expectedLength,this.points[pi].elasticity);
        this.points[pi].force.x = round(pF.x + this.points[pi].force.x);
        this.points[pi].force.y = round(pF.y + this.points[pi].force.y);
      }

      // Calculate point forces in the world applied to this blob
      for(let point of this.pointForces) {
        let pForce = Vector.getBlobPointForceOnA(this.points[pi].position,point,200,1);
        this.points[pi].force.x += pForce.x * 10;
        this.points[pi].force.y += pForce.y * 10;
      }

      // Calculate generic forces applied to all points
      for(let f of this.genericForces) {
        this.points[pi].force.x += f.x;
        this.points[pi].force.y += f.y;
      }
    }
  }

  refreshVertices() {
    for(let p of this.points ) {
      p.move();
    }
  }

  // Prints out lines connecting all the vertices
  display(context:CanvasRenderingContext2D) {
    context.beginPath();

    context.moveTo(this.points[0].position.x,this.points[0].position.y);
    for(let p of this.points) {
      //context.lineTo(p.position.x, p.position.y);
      //context.stroke();
      context.beginPath();
      context.arc(p.position.x, p.position.y, 5, 0, 2 * Math.PI);
      context.stroke();
    }
    
    //context.lineWidth = 10;
    //context.strokeStyle = "red";
    //context.fillStyle = "orange";
    context.closePath();
    //context.fill();
    context.stroke();
  }
}

class Blob {
  points:BlobPoint[];

  center:Vector;
  blobSize:number;

  color:string;

  constructor(bs:number,startingPoints:BlobPoint[]) {
    this.points = startingPoints;
    this.blobSize = bs;
    this.recalculateCenter();

    let val = random(0,360);

    this.color = `hsl(${val} 65% 40%)`;

    this.points.forEach(p=>p.color = this.color);
  }

  setColor(col:string) {
    this.color = col;
    this.points.forEach(p=>p.color = this.color);
  }

  addPoint(p:BlobPoint) {

    let d = Vector.getDistance(this.center,p.position);

    if ( d <= this.blobSize ) {
      p.color = this.color;
      this.points.push(p);
      this.recalculateCenter();
      return true;
    }
    return false;
  }

  recalculateCenter() {
    let xSum = 0;
    let ySum = 0;
    for(let p of this.points) {
      xSum += p.position.x;
      ySum += p.position.y;
    }
    if ( this.points.length == 0 ) {
      return;
    }
    this.center = new Vector(xSum/this.points.length,ySum/this.points.length);
  }

  // based on the angle from the center
  refreshOrder() {
    // gets the angle of each value
    for(let i = 0; i < this.points.length; i++) {
      let diffX = this.points[i].position.x - this.center.x;
      let diffY = this.points[i].position.y - this.center.y;

      let angle = Math.PI/2;
      if ( diffX != 0 ) {
        angle = Math.atan(diffY/diffX);
      }

      if ( diffX < 0 ) {
        angle += Math.PI;
      }

      this.points[i].angleFromCenter = angle;
    }

    this.points.sort((a:BlobPoint,b:BlobPoint)=>a.angleFromCenter-b.angleFromCenter);
  }

  getSVG() {
    let s = '';
    for(let i = 0; i < this.points.length; i+=1) {
      let p1 = this.points[i].position;
      // add circle dot
      //s += `M ${p1.x} ${p1.y} A 2 2 0 1 0 ${p1.x-5} ${p1.y} `;
      //s += `M ${p1.x} ${p1.y} A 2 2 0 1 1 ${p1.x-5} ${p1.y} `;

      if ( this.points.length > 2 ) {
        let p0 = this.points[i - 1 < 0?this.points.length-1:i - 1].position;
        let p2 = this.points[(i+1)%this.points.length].position;

        let pm1 = new Vector((p0.x+p1.x)/2,(p0.y + p1.y)/2);
        let pm2 = new Vector((p1.x+p2.x)/2,(p1.y + p2.y)/2);
        // add arc
        s += `M ${pm1.x} ${pm1.y} Q ${p1.x} ${p1.y} ${pm2.x} ${pm2.y}`;
      }
      
    }
    return s;
  }
}