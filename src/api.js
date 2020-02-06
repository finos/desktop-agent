/**
 * This file is injected into each Chrome tab by the Content script to make the FDC3 API available as a global
 */

function _doFdc3(){

const guid = () => {
    const gen = (n) => {
        const rando = () => {
            return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
        };
        let r = "";
        let i = 0;
        n = n ? n : 1;
        while (i < n){
            r += rando();
            i++;
        }
        return r;
    }
    
    return `${gen(2)}-${gen()}-${gen()}-${gen()}-${gen(3)}`;
    };

/**
*  the Listener class 
*/
class Listener {
    constructor(type, listenerId, intent){
        this.id = listenerId;
        this.type = type;
        if (type === "intent"){
            this.intent = intent;
        }
    }

    unsubscribe(){
        if (this.type === "context"){
            delete _contextListeners[this.id];
            //notify the background script
            document.dispatchEvent(new CustomEvent(`FDC3:dropContextListener`,{detail:{id:this.id}}));
        }
        else if (this.type === "intent"){
            delete _intentListeners[this.intent][this.id];
            //notify the background script
            document.dispatchEvent(new CustomEvent(`FDC3:dropIntentListener`,{detail:{id:this.id, intent:this.intent}}));
        }
    }
}

const wireMethod = (method, detail, isVoid) => {
    const ts = Date.now();
    const eventId = `${method}_${ts}`;
    detail.eventId = eventId;
    detail.ts = ts;
    if (isVoid){      
        document.dispatchEvent(new CustomEvent(`FDC3:${method}`,{detail:detail}));
    }
    else {
        return new Promise((resolve, reject) => {
           
            document.addEventListener(`FDC3:return_${eventId}`,(evt)=>{
                if (evt.detail){
                    resolve(evt.detail);
                }
                else {
                    reject(evt.detail);
                }           
            },{once:true});
            
            
            document.dispatchEvent(new CustomEvent(`FDC3:${method}`,{detail:detail}));

        });
    }
};

const _contextListeners = {};
const _intentListeners = {};

window.fdc3 = {

    open:function(name, context){
        return wireMethod("open", {name:name, context:context});
    },
    broadcast:function(context){
        //void
        wireMethod("broadcast", {context:context}, true);
    },

    raiseIntent:function(intent, context){
       return wireMethod("raiseIntent",{intent:intent, context:context});
    },

    addContextListener:function(listener){
        const listenerId = guid();
        _contextListeners[listenerId] = listener;
        document.dispatchEvent(new CustomEvent('FDC3:addContextListener', {
            detail:{
                id:listenerId
            }
        }));
        return new Listener("context",listenerId);
    },

    addIntentListener:function(intent, listener){
        const listenerId = guid();
        if (!_intentListeners[intent]){
            _intentListeners[intent] = {};
        }
        _intentListeners[intent][listenerId] = listener;
        document.dispatchEvent(new CustomEvent('FDC3:addIntentListener', {
            detail:{
                id:listenerId,
                intent:intent
            }
        }));
        return new Listener("intent", listenerId, intent)
    },

    findIntent: function(intent, context){
        return wireMethod("findIntent",{intent:intent, context:context});
    },


    findIntentsByContext: function(context){
        return wireMethod("findIntentsByContext",{context:context});
    },

    getSystemChannels: function(){
        return new Promise((resolve, reject) => {
            document.addEventListener("FDC3:returnSystemChannels",evt =>{
                resolve(evt.detail.data);
            }, {once : true});
            document.dispatchEvent(new CustomEvent('FDC3:getSystemChannels', {
  
            }));
        });
    },

    joinChannel: function(channel){
        return new Promise((resolve, reject) => {
            document.addEventListener("FDC3:confirmJoin",evt =>{
                resolve(true);
            }, {once : true});
            document.dispatchEvent(new CustomEvent('FDC3:joinChannel', {
                detail:{
                    channel:channel
                }
            }));
                

        });
    }

   
 };

 document.addEventListener("FDC3:context",evt => {
     const listeners = _contextListeners;
     const keys = Object.keys(listeners);
     keys.forEach(k => {
         let l = listeners[k];
         l.call(this,evt.detail.data.context);
     });
 });

 document.addEventListener("FDC3:intent",evt => {
    const listeners = _intentListeners[evt.detail.data.intent];
     if (listeners){
        const keys = Object.keys(listeners); 
        keys.forEach(k => {
            let l = listeners[k];
            l.call(this,evt.detail.data.context);
        });
       
     }
});



//look for onFDC3 function set by the window...
try{
    if (onFDC3){
        onFDC3.call();
    }
} catch (e) {
    console.log("onFDC3 not set");
}
};

_doFdc3();

