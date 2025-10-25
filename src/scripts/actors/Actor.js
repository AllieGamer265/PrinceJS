import { convertX } from '../Utils';
import GameState from '../ui/GameState';

class Actor extends Phaser.GameObjects.Sprite {

    constructor(scene, charX, charY, charFace, key, animKey) {
        super(scene, 0, 0, key);

        if (typeof animKey === 'undefined') { animKey = key; }
    
        this.charX = charX;
        this.charY = charY;
        this.charFace = charFace;
        this.charName = key;
        
        this.charFrame;
        this.charFdx = 0;
        this.charFdy = 0;
        this.charFcheck = false;
        this.charFfoot = 0;
        this.charFood = false;
        this.charFthin = false;
        
        this.scaleX *= -charFace;
        this.setOrigin(0,1);
        
        this._action = 'stand';
        this._seqpointer = 0;
        
        scene.add.existing(this);
        
        this.depth = 20;
        
        this.baseX = 0;
        this.baseY = 0;
        
        this.animation = scene.cache.json.get(animKey + '-anims');
        
        this.commands = [];
        
        for (var i=0; i < 256; i++) {
            
            this.registerCommand(i,this.CMD_NOOP);
            
        }
        
        this.registerCommand(0xFF,this.CMD_GOTO);
        this.registerCommand(0xFE,this.CMD_ABOUTFACE);
        this.registerCommand(0xFB,this.CMD_CHX);
        this.registerCommand(0xFA,this.CMD_CHY);
        this.registerCommand(0xF2,this.CMD_TAP);
        this.registerCommand(0x00,this.CMD_FRAME);

        // Shoe layer (separate sprite used to render shoes so we can tint or swap frames)
        try {
            // prefer an atlas named `${charName}-shoes`, fall back to 'kid-shoes' for compatibility
            var shoeAtlas = this.charName + '-shoes';
            var atlasKey = scene.textures.exists(shoeAtlas) ? shoeAtlas : (scene.textures.exists('kid-shoes') ? 'kid-shoes' : null);
            if (atlasKey) {
                this.shoe = scene.add.sprite(0,0, atlasKey).setOrigin(0,1);
                this.shoe.setDepth(this.depth - 0.5);
                this.shoe.setVisible(false);
                // default color
                this.shoeColor = (typeof GameState.kidShoeColor !== 'undefined') ? GameState.kidShoeColor : 0;
            } else {
                this.shoe = null;
                this.shoeColor = 0;
            }
        } catch (e) {
            this.shoe = null;
            this.shoeColor = 0;
        }

    }

    registerCommand(value, fn) {

        this.commands[value] = fn.bind(this);
        
    }

    updateCharFrame() {
    
        var framedef = this.animation.framedef[this.charFrame];
        this.charFdx = framedef.fdx;
        this.charFdy = framedef.fdy;
        
        var fcheck = parseInt( framedef.fcheck, 16 );
        this.charFfoot = fcheck & 0x1F;
        this.charFood = (fcheck & 0x80) == 0x80;
        this.charFcheck = (fcheck & 0x40) == 0x40;
        this.charFthin = (fcheck & 0x20) == 0x20;
        
    }

    updateActor() {
    
        this.processCommand();
        this.updateCharPosition();
        
    }

    CMD_NOOP(data) {
    
        console.warn('Command ' + data.cmd + ' not implemented!!!');
        
    }

    CMD_GOTO(data) {
    
        this._action = data.p1;
        this._seqpointer = data.p2 - 1;
        
    }

    CMD_ABOUTFACE(data) {
    
        this.charFace *= -1;
        this.scaleX *= -1;
        if (this.shoe) this.shoe.scaleX *= -1;
        
    }
    
    CMD_CHX(data) {
        
        this.charX += data.p1 * this.charFace;
        
    }
    
    CMD_CHY(data) {
        
        this.charY += data.p1;
        
    }
    
    CMD_TAP() {
        
        
    }
    
    CMD_FRAME(data) {
        
        this.charFrame = data.p1;
        this.updateCharFrame();
        this.processing = false;
        
    }
    
    
    processCommand() {
            
        this.processing = true;
        
        while (this.processing) {
            
            var data = this.animation.sequence[this._action][this._seqpointer];
            this.commands[data.cmd](data);
            
            this._seqpointer++;
            
        }
    
    }
    
    updateCharPosition() {
         
        this.setFrame(this.charName + '-' + this.charFrame);
        this.setOrigin(0,1);
        
        var tempx = this.charX + (this.charFdx * this.charFace);
        
        if ((this.charFood && this.faceL()) || (!this.charFood && this.faceR())) {
            
            tempx += 0.5;
            
        }
        
        this.x = this.baseX + convertX( tempx );
        this.y = this.baseY + this.charY + this.charFdy;

        // update shoe position/frame if available
        if (this.shoe) {
            // position shoe at same origin as actor; fine-tune offsets later if needed
            this.shoe.x = this.x;
            this.shoe.y = this.y;
            this.shoe.setOrigin(this.originX || 0, this.originY || 1);
            // try to pick a matching frame from the shoe atlas; if not present, ignore errors
            try {
                var shoeFrame = this.charName + '-' + this.charFrame;
                if (this.shoe.texture.get(shoeFrame)) {
                    this.shoe.setFrame(shoeFrame);
                } else if (this.shoe.texture.get(shoeFrame + '-shoe-' + this.shoeColor)) {
                    this.shoe.setFrame(shoeFrame + '-shoe-' + this.shoeColor);
                } else {
                    // fallback: leave current shoe frame
                }
                this.shoe.setVisible(this.visible);
            } catch (e) {
                // ignore missing frames
            }
        }
          
    };
    
    faceL() {
        
        return ( this.charFace == -1 );
        
    }
    
    faceR() {
        
        return ( this.charFace == 1 );
        
    }
    
    frameID(from, to) {
        
        if (typeof to === 'undefined') {
            
            return ( this.charFrame == from );
            
        } else {
            
            return ( this.charFrame >= from ) && ( this.charFrame <= to);
            
        }
        
    }

    getAction() {
        return this._action;
    }

    setAction(value) {
        this._action = value;
        this._seqpointer = 0;
    }

    setShoeColor(colorIndex) {
        this.shoeColor = colorIndex;
        if (this.shoe) {
            // if shoe frames encode color in name, attempt to update frame immediately
            try {
                var shoeFrame = this.charName + '-' + this.charFrame + '-shoe-' + this.shoeColor;
                if (this.shoe.texture.get(shoeFrame)) this.shoe.setFrame(shoeFrame);
                else if (this.shoe.texture.get(this.charName + '-' + this.charFrame)) this.shoe.setFrame(this.charName + '-' + this.charFrame);
            } catch (e) {}
        }
        // persist to GameState when possible
        try { if (typeof GameState !== 'undefined') { GameState.kidShoeColor = colorIndex; if (typeof GameState.save === 'function') GameState.save(); } } catch(e) {}
    }

    remove() {
        this.setVisible(false);
    }
}

export default Actor;




