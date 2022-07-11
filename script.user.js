// ==UserScript==
// @name         DemonTheorizer
// @namespace    what does this do
// @version      1.1.2
// @homepage     https://github.com/FiNiTe-Weeb/DemonTheorizer
// @updateURL    https://raw.githubusercontent.com/FiNiTe-Weeb/DemonTheorizer/main/script.user.js
// @downloadURL  https://raw.githubusercontent.com/FiNiTe-Weeb/DemonTheorizer/main/script.user.js
// @description  How many list Geometry Dash Pointercrate official demonlist points would I have if I got x% on y demon?????
// @author       FiNiTe#8429 on Discord
// @match        https://pointercrate.com/demonlist/statsviewer/
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    const VERSION = "1.1.2";
    const VERSION_CHECKING=true;
    window.getVersionOnGithub=function(){
        return fetch("https://raw.githubusercontent.com/FiNiTe-Weeb/DemonTheorizer/main/VERSION").then(function(resp){return resp.text();})
    }
    window.getCurrentVersion=function(){
        return VERSION;
    }
    //return 1 if current version is newer (should only happen on dev), return -1 if current version is outdated, return 0 if both versions same
    window.versionCompare=async function(){
        let curVerArr=window.getCurrentVersion().split(".");
        let newVerArr = (await window.getVersionOnGithub()).replaceAll("\n","").split(".");
        let i=0;
        while(curVerArr[i]&&newVerArr[i]){
            if(curVerArr[i]>newVerArr[i]){
                return 1;
            }
            if(curVerArr[i]<newVerArr[i]){
                return -1;
            }
            i++;
        }
        return 0;
    }

    //get my info
    //fetch("https://pointercrate.com/api/v1/players/3936/").then(function(dat){return dat.text();}).then(function(resp){console.log(JSON.parse(resp));});

    //todo: handle errors
    //todo: check if my thing disagrees with list, if yes then tell user to tell me to update it

    //DEFINE CLASSES
    class PlayerState{
        constructor(id=null){
            this.id=id; //id is integer
            this.rRecs=null; //rRecs is real records, tRecs is theoretical records
            this.tRecs=null; //both rRecs and tRecs are null at first, when initialized, they are object where key is demonID, and value is record info todo: update desc
            this.ptsLocal=0;//real pts calculated by this script
            this.ptsTheoretical=0;//theoretical pts calculated by this script
            this.ptsRemote=null;//unused until api outputs it, todo: ask sta to add it so i can check if my script is working properly in realtime
            this.oHandler=new OverridesHandler();
            this.ready=false;
            if(id!=null){
                this.loadPlayerInfo();
            }
        }

        loadPlayerInfo(){
            let thisRef=this;
            fetch("https://pointercrate.com/api/v1/players/"+thisRef.id+"/").then(function(resp){
                return resp.json();
            }).then(function(playerDat){
                let unsortedRecords=playerDat.data.records;
                thisRef.rRecs={};
                for(let i=0;i<unsortedRecords.length;i++){
                    let item=unsortedRecords[i];
                    if(!(item.demon.position>LIMIT_DEMONS_NUMBER)){
                        thisRef.rRecs[item.demon.id]={progress:item.progress};
                    }
                }
                let verifiedRecords=playerDat.data.verified;
                for(let i=0;i<verifiedRecords.length;i++){
                    let item=verifiedRecords[i];
                    if(!(item.position>LIMIT_DEMONS_NUMBER)){
                        thisRef.rRecs[item.id]={progress:100};
                    }
                }

                //calc real pts
                let pts=getPtsFromArr(thisRef.rRecs);
                thisRef.ptsLocal=pts;
                thisRef.initTRecs();
                thisRef.updateTheoreticalPoints();
                thisRef.oHandler.reloadHTMLList();
                thisRef.ready=true;
            });
        }

        initTRecs(){
            this.tRecs={...this.rRecs};
        }

        addTheoreticalRecord(demID,prog){
            if(this.tRecs==null){
                this.initTRecs();
            }
            this.tRecs[demID]={progress:prog};
            this.updateTheoreticalPoints();
        }

        undoTRec(demID){
            let rRec=this.rRecs[demID];
            if(rRec){
                this.tRecs[demID]={prog:rRec.prog};
            }else{
                delete this.tRecs[demID];
            }
            this.updateTheoreticalPoints();
        }

        updateTheoreticalPoints(){
            let theoreticalPts=getPtsFromArr(this.tRecs);
            this.ptsTheoretical=theoreticalPts;
        }

        getPtsDelta(){
            return this.ptsTheoretical-this.ptsLocal;
        }
    }

    class OverridesHandler{
        constructor(){
            this.overrides={}; //e.g. {1:{prog:Number(progress1)}, {2:{prog:Number(progress2)}}}
        }

        regenTRecs(player){
            log.w("regenTRecs shouldn't be necessary if everything is working right");
            player.tRecs={...player.rRecs};
            for(let key in this.overrides){
                let o=this.overrides[key];
                player.tRecs[key]=o.prog;
            }
        }

        clearOverrides(){
            this.overrides={};
        }

        //plan: give a set of tRecs and this func should figure out the differences
        figureOutOverrides(tRecs){
            //todo
        }

        //todo: actually show overrides if they exist when this command runs, (atm its just used for clearing so not an issue lol)
        reloadHTMLList(){
            let listEl=document.getElementById("override-list");
            listEl.innerHTML="";//idk if theres a more elegant way to delete children
            this.updateOutput();
        }

        findOverrideEl(demID){
            let listEl=document.getElementById("override-list");
            for(let i=0;i<listEl.children.length;i++){
                let item=listEl.children[i];
                if(item.getAttribute("data-demID")==demID){
                    return item;
                }
            }
            return null;
        }

        updateOutput(){
            let diff=calcState.currentPlayer.getPtsDelta();
            let resultEl=document.getElementById("overrides-result");
            switch(Math.sign(diff)){
                case 1:
                    resultEl.style.backgroundColor="rgba(0,255,0,0.20)";
                    resultEl.style.borderColor="rgba(0,255,0,1)";
                break;
                case 0:
                    resultEl.style.backgroundColor="rgba(191,191,191,0.20)";
                    resultEl.style.borderColor="rgba(191,191,191,1)";
                break;
                case -1:
                    resultEl.style.backgroundColor="rgba(255,0,0,0.20)";
                    resultEl.style.borderColor="rgba(255,0,0,1)";
                break;
            }
            resultEl.innerText="Theoretical pts: "+round(calcState.currentPlayer.ptsTheoretical)+", real pts: "+round(calcState.currentPlayer.ptsLocal)+", resulting in a difference of "+(diff>0?"+":"")+round(diff)+" pts.";
        }

        /*
        * @param demID - lvl id
        * @param override - e.g. {prog:100}
        */
        addOverride(demID,prog,player){
            let overrideExisted=!!this.overrides[demID];
            this.overrides[demID]={prog:prog};
            player.addTheoreticalRecord(demID,prog);
            let listEl=document.getElementById("override-list");

            let overrideEl;
            if(overrideExisted){
                overrideEl=this.findOverrideEl(demID);
            }

            //if override didnt exist OR if it existed but couldnt find the element for it
            if(!overrideEl){
                overrideEl=document.createElement("li");
                overrideEl.setAttribute("data-demID",demID);
                overrideEl.setAttribute("style","font-size:16px;");
                listEl.appendChild(overrideEl);
            }

            overrideEl.innerText=prog+"% on "+calcState.getDemonByID(demID).name+", for "+round(getPointsForRecord(demID,prog))+"pts";
            let btnRemove=document.createElement("button");
            btnRemove.innerHTML="&#10060;";
            btnRemove.setAttribute("style","margin-left:4px; border:none;");
            btnRemove.addEventListener("click",function(){calcState.currentPlayer.oHandler.removeOverride(demID,calcState.currentPlayer);});
            overrideEl.appendChild(btnRemove);

            this.updateOutput();
        }

        removeOverride(demID,player){
            delete this.overrides[demID];
            player.undoTRec(demID);
            let listEl=document.getElementById("override-list");
            let trgEl=this.findOverrideEl(demID);
            if(trgEl){
                listEl.removeChild(trgEl);
            }
            this.updateOutput();
        }
    }

    class CalcState{
        constructor(){
            this.currentPlayer=new PlayerState();
            this.demonsData=null;
            this.demonPositionToId=null;
            this.demonIDtoIndex=null;
            this.ready=false;
        }


        getDemonByID(id){
            if(!this.ready){
                log.e("Demons data not loaded yet.");
                return null;
            }
            return this.demonsData[this.demonIDtoIndex[id]];
        }

        getDemonByPosition(pos){
            return this.getDemonByID(this.demonPositionToId[pos]);
        }

        processNewDemons(demons){
            this.demonsData=demons;
            this.demonPositionToId={};
            this.demonIDtoIndex={};
            for(let i=0;i<demons.length;i++){
                this.demonPositionToId[demons[i].position]=demons[i].id;
                this.demonIDtoIndex[demons[i].id]=i;
            }
            this.ready=true;
        }
    }

    class Logger{
        constructor(){
            if(TEST){
                this.i=function (){console.log(...arguments);}
                this.w=function (){console.warn(...arguments);}
            }else{
                this.i=this.w=function(){};
            }
            this.e=function(){console.error(...arguments);}
        }
    }

    //DEFINE VARS/CONSTS

    let calcState=new CalcState();

    const TEST=false;
    const LIMIT_DEMONS_NUMBER=150;

    let log=new Logger();
    if(TEST){
        window.calcState=calcState;
    }
    let demonLoaderProm=null;
    let postDemonLoaderProm=null;

    //DEFINE FUNCTIONS

    function round(value=1,decimalPlaces=2){
        let scale=Math.pow(10,decimalPlaces);
        return Math.round(value*scale)/scale;
    }

    /*
    * Function I use to stack data from different pages
    * @param existingArr - array to append to.
    * @param promiseArr - promise which is expected to resolve to an array, the elements of which will be appended to existingArr
    * @returns - The concatanated array
    */
    function appendPromiseArr(existingArr,promiseArr){
        let appendArrPromise=new Promise(function(res,rej){//todo: error handling
            promiseArr.then(function(newArr){
                res(existingArr.concat(newArr));
            });
        });
        return appendArrPromise;
    }


    /*
    * load demons via proise
    * @param page - Page to start loading from, used for recursion
    * @param pageLength - Self explanatory, also please make sure its a number
    * @returns - Promise that resolves in array of demons.
    */
    function demonLoader(afterPage=0,pageLength=75,limit=LIMIT_DEMONS_NUMBER){//todo: this is a mess omfg
        log.i("loading page "+(afterPage+1));
        let fetchPromise=new Promise(function(res,rej){//todo: handle error idk
            fetch("https://pointercrate.com/api/v2/demons/listed?limit="+Math.min(pageLength,limit)+"&after="+(afterPage*pageLength)).then(function(resp){
                return resp.json();
            }).then(function(data){
                if(data.length>=pageLength&&limit>pageLength){//probably not last page
                    let prom=appendPromiseArr(data,demonLoader(afterPage+1,pageLength,limit-pageLength));
                    res(prom);
                }else{//last page
                    res(data);
                }
            });
        });
        return fetchPromise;
    }

    function postDemonLoader(demons){
        log.i(demons);
        calcState.processNewDemons(demons);

    }

    if(TEST){window.getDemonByID=calcState.getDemonByID}

    /*
    * calc points for a given demon id and percentage
    * @param demonID - ID of Demon
    * @param progress - % Achieved by player
    */
    function getPointsForRecord(demonID,progress){
        if(calcState.ready){
            let demon=calcState.getDemonByID(demonID);
            if(demon){
                if(demon.position>75&&(progress<100)){
                    return 0;
                }else{
                    return pointFormula(demon.position,progress,demon.requirement);
                }
            }else{
                log.e("Attempted to call getPointsForRecord on non-existant demon!! id: "+demonID);
                return 0;
            }
        }else{
            log.w("Attempted to call getPointsForRecord before demon data loaded");
            return 0;
        }
    }

    if(TEST){window.getPointsForRecord=getPointsForRecord;}

    /*
    * points formula
    * @param position - Ranking on the list
    * @param progress - % Achieved by player
    * @param requirement - % Required for points
    */
    function pointFormula(position=1,progress=100,requirement=50){
        if(progress>100){progress=100;}//sorry guys ur not allowed to have fun :trol
        if(progress<requirement){
            return 0;
        }else{//god this was a pain to write out
            let score;
            if(55<position && position<=150){
                let b=6.273;
                score=56.191*Math.pow(2,(54.147-(position+3.2))*Math.log(50)/99)+b;
            } else if(35 < position && position <= 55){
                let g = 1.036;
                let h = 25.071;
                score=212.61 * (
                    Math.pow(g, 1 - position)
                ) + h;
            }else if(20 < position && position <= 35){
                let c = 1.0099685;
                let d = 31.152;
                score= (250 - 83.389) * (Math.pow(c,2-position)) - d
            }else if(0 < position && position <= 20){
                let e = 1.168;
                let f = 100.39;
                score=(250 - f) * (
                    Math.pow(e,1-position)
                ) + f
            }else{
                score=0;
            }
            if(progress!==100){
                score=
                (
                    score * Math.pow(5,
                    (
                        (progress - requirement)
                        /
                        (100 - requirement))
                    )
                )/10;
            }
            return score;
        }
    }

    /*
    * @param arr - Array where keys are demonIDs, and values have "progress" property, which is integer percentage progress.
    */
    function getPtsFromArr(arr){
        let pts=0;
        for(let key in arr){
            let r=arr[key];
            pts+=getPointsForRecord(key,r.progress);
        }
        return pts;
    }



    //(todo:)load player's levels, and setup calc if it hasnt, and set it up to be used for this player
    function playerClickedListener(evt){
        //todo: add promise e.g. demonsLoaded.then(callback)
        log.i(evt);
        let item=evt.target.closest("li");
        let playerID=item.getAttribute("data-id");

        log.i("click on item",item,"playerID",playerID);
        if(playerID==calcState.currentPlayer.id){return;} //break if player already selected

        calcState.currentPlayer=new PlayerState(playerID);
        //todo: set loading screen in the meantime maybe



    }

    //whenever a new page on stat viewer is loaded, this will apply necessary click event listeners to every item in the list
    function addListenersToCurrentPage(mutationsList, observer){
        let list=calcState.listContainer.children;
        log.i("Mutated, current length:",list.length);
        for(let i=0;i<list.length;i++){
            let item=list[i];
            item.addEventListener("click",playerClickedListener);
        }
    }

    //initial calc loading func
    function loadCalc(){
        addOverridesBox();
        calcState.listContainer=document.getElementsByClassName("selection-list")[0];

        //mutationObserver is used to trigger callback when html is changed in stat viewer
        let mutationObserver=new MutationObserver(addListenersToCurrentPage);
        mutationObserver.observe(calcState.listContainer,{attributes:true,childList:true,subtree:true});
    }

    //searchable dropdown
    function initSearchableDropdown(containerEl){
        let listOuterEl=containerEl.querySelector("#theory-calc-demon-menu-outer");
        let list=containerEl.querySelector("#theory-calc-demon-menu-inner");
        let search=containerEl.querySelector("#theory-calc-demon-search");
        search.addEventListener("click",function(){
            if(listOuterEl.style.display=="none"){
                listOuterEl.style.display="block";
            }else{
                listOuterEl.style.display="none";
            }
        });
    }


    //Start it all
    demonLoaderProm=demonLoader();
    postDemonLoaderProm=demonLoaderProm.then(postDemonLoader);

    log.i("uwu");
    window.addEventListener('load', loadCalc);

    //html editing stuff
    /*
    da plan:
    <div>
        <select>Test
    　　　　<option>asd</option>
    　　　　<option>bsd</option>
　　　　</select>
       <input type="number" />
　　　　<button>add override</button>
　　　　<ul id="overrides-list">
           ＜li>tartasus 100% <button>remove</button></li>
　　　　</ul>
       <div>newpts: 123</div>
　　</div>
    */

    //pro tip: dont EVER user js to build a dom tree (unless u hate urself)
    //i should've just made a div and shoved it an html string with styles and ids that would've been alot less painful i swear to god
    function addOverridesBox(){
        postDemonLoaderProm.then(function(){
            let container=document.createElement("div");
            container.setAttribute("id","fnt-calc-overrides-container");

            let selectionBox=document.createElement("select");
            selectionBox.setAttribute("style","border:none; font-family: \"Montserrat\", sans-serif; font-size:20px;");
            let selectionBoxLabel=document.createElement("div");
            selectionBoxLabel.innerText="Demon:";
            selectionBoxLabel.setAttribute("style","display:inline-block; margin-left:2px; margin-right:auto; float:left;");
            let selectionBoxContainer=document.createElement("div");
            selectionBoxContainer.style.fontSize="20px";


            /*
            <div>
                <input>
                <div id="menu-outer">
                    <div>
                        <ul></ul>
                    </div>
                </div>
            </div>
            */
            let newSelectorContainer=document.createElement("div");
            let newSelectorSearch=document.createElement("input");
            let newSelectorMenuOuter=document.createElement("div");
            let newSelectorMenuInner=document.createElement("ul");
            newSelectorContainer.appendChild(newSelectorSearch);
            newSelectorSearch.setAttribute("style","width:90%;");
            newSelectorSearch.setAttribute("id","theory-calc-demon-search");
            newSelectorSearch.setAttribute("placeholder","Click to Select");
            newSelectorContainer.appendChild(newSelectorMenuOuter);
            newSelectorMenuOuter.setAttribute("style","background:red; width:100%; height:400px; position:absolute; z-index:100; display:none;");
            newSelectorMenuOuter.setAttribute("id","theory-calc-demon-menu-outer");
            newSelectorMenuOuter.appendChild(newSelectorMenuInner);
            newSelectorMenuInner.setAttribute("style","background:blue; width:90%; height:400px; margin:auto; overflow-y:scroll; overflow-x:hidden;");
            newSelectorMenuInner.setAttribute("id","theory-calc-demon-menu-inner");

            let pos=1;
            let demon=null;
            while(demon=calcState.getDemonByPosition(pos)){//yes u can put assignments in there, condition is true if value assigned is truthy
                try{
                    let option=document.createElement("option");
                    option.setAttribute("value",demon.id);
                    option.innerText=demon.name;
                    selectionBox.appendChild(option);

                    let listItem=document.createElement("li");
                    listItem.setAttribute("data-value",demon.id);
                    listItem.innerText=demon.name;
                    newSelectorMenuInner.appendChild(listItem);
                    pos++;
                }catch(deezNutz){log.e(deezNutz,pos); break;}
            }
            let progInput=document.createElement("input");
            let progInputLabel=document.createElement("div");
            let progInputContainer=document.createElement("div");
            progInput.setAttribute("style","font-family: \"Montserrat\", sans-serif; font-size:20px; display:inline-block;");
            progInputLabel.innerText="Progress:";
            progInputLabel.setAttribute("style","display:inline-block; margin-left:2px; margin-right:auto; float:left; margin-top:15px;");
            progInputContainer.style.fontSize="20px";

            progInput.classList.add("form-input","flex","col");
            progInput.setAttribute("type","number");
            progInput.setAttribute("min","0");
            progInput.setAttribute("max","100");
            progInput.setAttribute("placeholder","0");

            let addOverride=document.createElement("button");
            addOverride.classList.add("blue","hover","button");
            addOverride.innerText="Add Override";
            addOverride.setAttribute("style","display:inline-block;");
            addOverride.addEventListener("click",function(){
                let demID=selectionBox.value;
                let prog=Number(progInput.value);
                if(!(demID&&(prog==0||prog))){return;}

                calcState.currentPlayer.oHandler.addOverride(demID,prog,calcState.currentPlayer);

            });

            let overrideList=document.createElement("ul");
            overrideList.setAttribute("id","override-list");
            let result=document.createElement("div");
            result.setAttribute("id","overrides-result");
            result.setAttribute("style","font-size: 16px; background-color: rgba(191,191,191,0.20); border: solid rgba(191,191,191,1) 4px; border-radius: 8px; padding: 4px; transition: 600ms; font-size:16px;");

            selectionBoxContainer.appendChild(selectionBoxLabel);
            selectionBoxContainer.appendChild(selectionBox);
            container.appendChild(selectionBoxContainer);

            //container.appendChild(newSelectorContainer);
            progInputContainer.appendChild(progInputLabel);
            progInputContainer.appendChild(progInput);
            container.appendChild(progInputContainer);
            container.appendChild(addOverride);
            container.appendChild(overrideList);
            container.appendChild(result);

            //add version checker shit
            if(VERSION_CHECKING){
                let versionNotice=document.createElement("div");
                versionNotice.setAttribute("id","version-notice");
                versionNotice.setAttribute("style","font-size: 16px; background-color: rgba(191,191,191,0.20); border: solid rgba(191,191,191,1) 4px; border-radius: 8px; padding: 4px; transition: 600ms; font-size:16px; margin-top:8px;");
                let msg="";
                window.versionCompare().then(function(value){
                    switch(value){
                        case 1:
                            msg="Current version suggests your version is newer than what github file says";
                            versionNotice.style.backgroundColor="rgba(0,255,255,0.20)";
                            versionNotice.style.borderColor="rgba(0,255,255,1)";
                        break;
                        case -1:
                            msg="Your version appears outdated, (if this is incorrect then I did an oopsie)";
                            versionNotice.style.backgroundColor="rgba(255,0,0,0.20)";
                            versionNotice.style.borderColor="rgba(255,0,0,1)";
                        break;
                        default:
                            versionNotice.setAttribute("style","");
                        break;
                    }
                    versionNotice.innerText=msg;
                })
                container.appendChild(versionNotice);
            }

            document.getElementsByClassName("viewer-content")[0].children[0].children[0].append(container);
            //initSearchableDropdown(newSelectorContainer);
        });
    }
    if(TEST){
        window.addOverridesBox=addOverridesBox;
    }

})();
