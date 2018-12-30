
/**
 * Class for emitting lethal particles such as lava drops
 */
class Emitter {
  constructor(scene, objectConfig){
    this.x = objectConfig.x;
    this.y = objectConfig.y;
    this.scene = scene;
    this.destroyed = false;
    this.timer = 0
    this.objectConfig = objectConfig

    this.properties = {
      "angle": 0,
      "force": 0,
      "lifetime": 100,
      "period": 100,
      "size": 10
    };

    for (var i = 0; i < objectConfig.properties.length; i++){
      var key = objectConfig.properties[i];
      this.properties[key["name"]] = key["value"];
    }

    this.scene.events.on("update", this.update, this);
    this.scene.events.on("shutdown", this.destroy, this);
    this.scene.events.on("destroy", this.destroy, this);
  }

  destroy() {
    this.destroyed = true;
    this.scene.events.off("update", this.update, this);
    this.scene.events.off("shutdown", this.destroy, this);
    this.scene.events.off("destroy", this.destroy, this);
  }

  update() {
    if (this.destroyed) {
      return;
    }

    if (this.timer === parseFloat(this.properties["period"])) {
      this.timer = 0;
      this.scene.add.existing(new Projectile_emitted(this.scene, this.x, this.y, "projectile_large", this.objectConfig))
    } else {
      this.timer ++;
    }
  }
}
