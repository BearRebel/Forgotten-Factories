
/**
 * Structure are objects in the environment that are not tiles
 */
class Structure extends Phaser.Physics.Matter.Image{

  constructor(scene, x, y, texture, objectConfig){
    var length = Math.sqrt( objectConfig.width**2 + objectConfig.height**2) /2.
    var angle = Math.atan(objectConfig.height/objectConfig.width)* 180./Math.PI
    if (objectConfig.gid !== undefined) {
      x = x + (length )*Math.cos( (objectConfig.rotation-angle)*Math.PI/180.);
      y = y + (length )*Math.sin( (objectConfig.rotation-angle)*Math.PI/180.);
    } else {
      x = x + (length )*Math.cos( (objectConfig.rotation+angle)*Math.PI/180.);
      y = y + (length )*Math.sin( (objectConfig.rotation+angle)*Math.PI/180.);
    }


    super(scene.matter.world, x, y, texture);
    this.scene = scene;
    this.destroyed = false;

    this.activated = false;
    this.displayWidth = objectConfig["width"];
    this.displayHeight = objectConfig["height"];

    this.setBody({
      type: "rectangle",
      width: objectConfig["width"],
      height: objectConfig["height"]})

    this.setAngle(objectConfig.rotation);
    this.setIgnoreGravity(true)

    this.properties = {};

    for (var i = 0; i < objectConfig.properties.length; i++){
      var key = objectConfig.properties[i];
      this.properties[key["name"]] = key["value"];
    }

    this.setCollisionCategory(collision_block);
    //this.setCollidesWith([collision_block, collision_player]);
    //
    scene.matterCollision.addOnCollideStart({
      objectA: [this],
      callback: function(eventData) {
        const { bodyB, gameObjectB, pair} = eventData;
        if (pair.gameObjectA === this) {
          pair.onlyB = true;
        } else {
          pair.onlyA = true;
        }

      },
      context: this
    });

    this.scene.events.on("shutdown", this.destroy, this);
    this.scene.events.on("destroy", this.destroy, this);
  }

  destroy() {
    this.destroyed = true;
    this.scene.matterCollision.removeOnCollideStart({objectA: [this]})
    this.scene.events.off("shutdown", this.destroy, this);
    this.scene.events.off("destroy", this.destroy, this);
    super.destroy()
  }
}

class Door extends Structure {
  constructor(scene, x, y, texture, objectConfig){
    super(scene, x, y, texture, objectConfig)

    this.setStatic(true);
    this.inMotion = 0;

    this.scene.events.on("lever", function(key, moveX, moveY, lever) {
      if (this.properties["leverKey"] === key) {

        //levers deactivate while motion completes
        if(this.inMotion) {
          this.scene.events.emit("cancelLever", lever, key);
          return 0;
        }
        this.activate(moveX, moveY, lever);
      }
    }, this);

    this.scene.events.on("preupdate", this.update, this);
  }

  /**
   * activate - move the door. slow property defines whether instant or not
   *     if slow is non-zero this gives the amount of time for motion to complete
   */
  activate(moveX, moveY, lever) {
    var slow = lever.properties["slow"];
    if(!slow) {
      if (lever.flipX) {
        this.y += 32 * moveY;
        this.x += 32 * moveX;
      } else {
        this.y -= 32 * moveY;
        this.x -= 32 * moveX;
      }
    }
    else if(slow) {
      this.inMotion = slow;
      if (lever.flipX) {
        this.yMotion = 32 * moveY / this.inMotion;
        this.xMotion = 32 * moveX / this.inMotion;
      } else {
        this.yMotion = - 32 * moveY / this.inMotion;
        this.xMotion =  -32 * moveX / this.inMotion;
      }
    }

  }

  /**
   * update - if slow motion needed, update the door
   *
   * @return {type}  return 1 if not in motion
   */
  update() {
    if(!this.inMotion) {
      return 1;
    }

    this.y += this.yMotion;
    this.x += this.xMotion;
    this.inMotion -= 1;

  }
}

class Mover extends Structure {
  constructor(scene, x, y, texture, objectConfig){
    super(scene, x, y, texture, objectConfig)
    this.up = true
    this.right = true

    this.xMax = this.x
    this.xMin = this.x
    this.yMax = this.y
    this.yMin = this.y
    this.xSpeedMax = 0
    this.xSpeedMin = 0
    this.ySpeedMax = 0
    this.ySpeedMin = 0

    if (this.properties["x"]) {
      this.xMax += parseFloat(this.properties["x"].split(" ")[0])*32
      this.xMin += parseFloat(this.properties["x"].split(" ")[1])*32
    }
    if (this.properties["y"]) {
      this.yMax += parseFloat(this.properties["y"].split(" ")[0])*32
      this.yMin += parseFloat(this.properties["y"].split(" ")[1])*32
    }

    if (this.properties["xSpeed"]) {
      this.xSpeedMax += parseFloat(this.properties["xSpeed"].split(" ")[0])
      this.xSpeedMin += parseFloat(this.properties["xSpeed"].split(" ")[1])
    }
    if (this.properties["ySpeed"]) {
      this.ySpeedMax += parseFloat(this.properties["ySpeed"].split(" ")[0])
      this.ySpeedMin += parseFloat( this.properties["ySpeed"].split(" ")[1])
    }

    this.scene.events.on("preupdate", this.update, this);


  }

  update() {
    if (this.destroyed) {
      return;
    }
    var moveForce = 0.01;
    if (this.up) {
      if(this.body.velocity.y > this.ySpeedMin){
        this.applyForce({x:0, y:-moveForce})
      }
      else {
        this.setVelocityY(this.ySpeedMin)
      }
    } else {
      if(this.body.velocity.y < this.ySpeedMin) {
        this.applyForce({x:0, y:moveForce})
      }
      else {
        this.setVelocityY(this.ySpeedMax)
      }
    }

    if (this.right) {
      if (this.body.velocity.x < this.xSpeedMax) {
        this.applyForce({x:moveForce, y:0})
      } else {
        this.setVelocityX(this.xSpeedMax)
      }

    } else {
      if (this.body.velocity.x > this.xSpeedMin) {
        this.applyForce({x:-moveForce, y:0})
      } else {
        this.setVelocityX(this.xSpeedMin)
      }
    }

    this.checkDirection()

  }

  checkDirection() {
    if (this.up && this.y <= this.yMin) {
      this.setVelocityY(0)
      this.up = !this.up
    } else if(!this.up && this.y >= this.yMax) {
      this.setVelocityY(0)
      this.up = !this.up
    }
    if (this.right && this.x >= this.xMax) {
      this.setVelocityX(0)
      this.right = !this.right
    } else if(!this.right && this.x <= this.xMin) {
      this.setVelocityX(0)
      this.right = !this.right
    }
  }

  destroy() {
    this.scene.events.off("preupdate", this.update, this);

    super.destroy()
  }
}


/**
 * class for barrier spell structure that physically blocks particles and the player
 */
class Barrier extends Structure {
  constructor(scene, x, y, texture, objectConfig){
    super(scene, x, y, texture, objectConfig)
    this.age = 0;
    this.maxAge = 300;
    this.setTint(0x60fcff);

    this.scene.events.on("preupdate", this.update, this);
  }

  update() {
    this.age += 1;
    this.alpha = (this.maxAge - this.age)/this.maxAge;
    if(this.age > this.maxAge) {
      this.destroy()
    }
  }

  destroy() {
    this.scene.events.off("preupdate", this.update, this);
    super.destroy()
  }
}
