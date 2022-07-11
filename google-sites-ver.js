<!DOCTYPE html>
<html>
<head>
	<title>aa</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<style>
	
		*{
			font-size:20px;
			font-family:montserrat,sans-serif;
		}
		
		/*selector styling begin*/
		.selector{
			width:300px;
			font-size:20px;
		}
		
		.selector input{
			width:100%;
			box-sizing:border-box;
			font-size:20px;
			border:none;
		}
		
		.selector>ul{
			position:absolute;
			background-color:rgba(255,255,255,1);
			width:300px;
			margin:0px;
			padding-inline-start:0px;
			max-height:600px;
			overflow-y:scroll;
			box-shadow:0px 0px 15px rgba(0,0,0,0.2); 
			
			display:none;
			opacity:0;
		}
		
		.selector>ul.show{
			display:block;
			opacity:1;
		}
		
		.selector li{
			padding:4px;
			text-align:center;
			transition: background-color 500ms;
			background-color:rgba(255,255,255,1);
		}
		
		.selector li:hover{
			background-color:rgba(193,193,193,1);
		}
		/*selector styling end*/
		
		::-webkit-scrollbar{
			background-color:white;
			width:12px;
		}
		
		::-webkit-scrollbar-thumb{
			background-color:#bfbfbf;
			border-radius:1024px;
		}
		
		#overrides-container span{
			font-size:20px;
			display:inline-block;
			margin-left:2px;
		}
		
		.selector-outer .selector{
			display:inline-block;
		}
		
		button{
			margin:0px;
			margin-top:8px;
			margin-bottom:8px;
			padding: 8px;
			border: none;
			transition:background-color 500ms;
			box-sizing:border-box;
			width:100%;
		}
		
		button:hover{
			background-color:rgb(223, 223, 223)
		}
		
		span{
			font-size:20px;
		}
		
		.records-list{
			max-height:500px;
			overflow-y:scroll;
			border: 4px solid #efefef;
			box-shadow: 0px 0px 8px rgb(0 0 0 / 10%);
			border-radius: 16px;
		}
		
		#overrides-result{
			font-size: 16px;
			background-color: rgba(191,191,191,0.20);
			border: solid rgba(191,191,191,1) 4px;
			border-radius: 8px; padding: 4px;
			transition: 600ms; font-size:16px;
		}
		
		.remove-override{
			margin:0px;
			padding:6px;
			margin-left:4px;
			width:initial;
			font-size:16px;
		}
		
	</style>
</head>
<body>
	<div class="selector-outer">
		<span>Player: </span>
		<div id="player-selector" class="selector" data-endpoint="https://pointercrate.com/api/v1/players/ranking/?name_contains=">
			<input placeholder="Click to Select" type="search">
			<ul>
			</ul>
		</div>
		<button id="load-player-records">Load records of player</button>
	</div>
	<br>
	<div>
		<span>Original Records:</span>
		<ul id="og-record-list" class="records-list"></ul>
	</div>
	<div id="overrides-container" class="selector-outer">
		<span>Demon: </span>
		<div id="level-selector" class="selector">
			<input placeholder="Click to Select">
			<ul>
			</ul>
		</div>
		<br>
		<div>
			<span>Progress:<span>
			<input type="number" id="progress-input" min=0 max=100 placeholder="%">
		</div>
		<button id="add-override-button">Add Override</button>
		<br>
		<br>
		<span>Overrides:</span>
		<ul id="override-list" class="records-list"></ul>
		<div id="overrides-result"></div>
	</div>
	<script>
			
    const VERSION = "1.1.2";
    const VERSION_CHECKING=false;
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
			if(id===0){
				this.initEmptyPlayer();
			}
            else if(id!=null){
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
				
				//put real records
				let rRecsList=document.getElementById("og-record-list");
				rRecsList.innerHTML=""; //clear old
				for(let key in thisRef.rRecs){
				let demID=Number(key);
					let r=thisRef.rRecs[key];
					let demon=calcState.getDemonByID(demID);
					if(demon){
						let item=document.createElement("span");
						item.innerText=r.progress+"% on "+demon.name+", for "+getPointsForRecord(demID,r.progress)+" pts";
						rRecsList.appendChild(item);
						rRecsList.appendChild(document.createElement("br"));
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
		
		initEmptyPlayer(){
            let thisRef=this;
            thisRef.rRecs={};
			let rRecsList=document.getElementById("og-record-list");
			rRecsList.innerHTML=""; //clear old
            thisRef.ptsLocal=0;
            thisRef.initTRecs();
            thisRef.updateTheoreticalPoints();
            let diff=0;
            let resultEl=document.getElementById("overrides-result");
            resultEl.style.backgroundColor="rgba(191,191,191,0.20)";
            resultEl.style.borderColor="rgba(191,191,191,1)";
            resultEl.innerText="Theoretical pts: "+0+", real pts: "+0+", resulting in a difference of "+(diff>0?"+":"")+round(diff)+" pts.";
            thisRef.ready=true;
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
			if(listEl){
				listEl.innerHTML="";//idk if theres a more elegant way to delete children
				this.updateOutput();
			}
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
            btnRemove.addEventListener("click",function(){calcState.currentPlayer.oHandler.removeOverride(demID,calcState.currentPlayer);});
            btnRemove.classList.add("remove-override");
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
            this.currentPlayer=new PlayerState(0);
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

    const TEST=true;
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
	
	function loadRecordsOfPlayer(evt){
		evt.preventDefault();
        //todo: add promise e.g. demonsLoaded.then(callback)
        log.i(evt);
		let selector=document.getElementById("player-selector");
        let playerID=selector.getAttribute("data-id");

        log.i("loading records for playerID",playerID);
        if(playerID==calcState.currentPlayer.id){return;} //return if player already selected
        if(isNaN(playerID)||(playerID==null)||(playerID==0)){return;} //return if playerID invalid (non-type-specific compare to 0 is intentional)

        calcState.currentPlayer=new PlayerState(playerID);
        //todo: set loading screen in the meantime maybe
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
    function loadCalc(){
        addOverridesBox();
        
        let loadRecordsBtn=document.getElementById("load-player-records");
		loadRecordsBtn.addEventListener("click",loadRecordsOfPlayer);
		
		initSelectors();
		function initSelectors(){
			let selectors=document.getElementsByClassName("selector");
			for(let i=0;i<selectors.length;i++){
				let selector=selectors[i];
				if(!selector.classList.contains("initialized")){
					let selectorSearch=selector.getElementsByTagName("input")[0];
					let selectorList=selector.getElementsByTagName("ul")[0];
					
					selectorSearch.addEventListener("click",function(){
						selectorSearch.value="";
						selectorSearch.dispatchEvent(new InputEvent("input"));//so search is empty when u click it again
						selectorList.classList.toggle("show");
					});
					
					//close when clicking elsewhere
					document.addEventListener("click",function(evt){
						if(!selector.contains(evt.target)){
							selectorList.classList.remove("show");
							let selectedID=selector.getAttribute("data-id");
							if(selectedID){
								let listItem=selectorList.querySelector("[data-id=\""+selectedID+"\"]");
								if(listItem){
									selectorSearch.value=listItem.innerHTML;
								}
							}
						}
					});
					
					selectorSearch.addEventListener("input",function(){
						let search=selectorSearch.value.toLowerCase();
						for(let j=0;j<selectorList.children.length;j++){
							let item=selectorList.children[j];
							if(item.innerText.toLowerCase().indexOf(search)>=0){
								item.style.display="list-item";
							}else{
								item.style.display="none";
							}
						}
					});
					
					selectorList.addEventListener("click",function(evt){
						let item=evt.target;
						let id=item.getAttribute("data-id");
						let text=item.innerText;
						if(item&&(id||id===0)){
							selectorList.classList.toggle("show");
							selector.setAttribute("data-id",id);
							selectorSearch.value=text;
						}
					});
					
					let dataEndpoint=selector.getAttribute("data-endpoint");
					//searchable stuff
					if(dataEndpoint){
						
						function runSearch(evt){
							let search=evt.target.value;
							fetch(dataEndpoint+search).then(function(resp){return resp.json();}).then(function(dat){
								selectorList.innerHTML="";
								for(let j=0;j<dat.length;j++){
									let item=dat[j];
									let listEl=document.createElement("li");
									
									//this was made for players thing only so far, to make it usable for other stuff will need some extra attribute usages prob, e.g. a way to say what properties to use for data-id and innerText, as well as innerText format
									listEl.setAttribute("data-id",item.id);
									listEl.innerText="#"+item.rank+" "+item.name;
									selectorList.appendChild(listEl);
								}
							});
						}
						
						let debouceWait=false;
						let timeoutID=null;
						selectorSearch.addEventListener("input",function(evt){
							if(debouceWait){
								clearTimeout(timeoutID);
								timeoutID=setTimeout(function(){
									debouceWait=false;
									timeoutID=null;
									runSearch(evt);
								},500);
							}else{
								let debouceWait=true;
								setTimeout(function(){
									debouceWait=false;
									timeoutID=null;
									runSearch(evt);
								},500);
							}
						});
						selectorSearch.dispatchEvent(new Event("input")); //so it loads default
					}
					
					selector.classList.add("initialized");
				}
			}
		}
    }

    //pro tip: dont EVER user js to build a dom tree (unless u hate urself)
    function addOverridesBox(){
		let levelSelector=document.getElementById("level-selector");
		let levelSelectorList=levelSelector.getElementsByTagName("ul")[0];
        postDemonLoaderProm.then(function(){
            let container=document.createElement("div");
            container.setAttribute("id","fnt-calc-overrides-container");

            let pos=1;
            let demon=null;
            while(demon=calcState.getDemonByPosition(pos)){//yes u can put assignments in there, condition is true if value assigned is truthy
                try{
                    let option=document.createElement("li");
                    option.setAttribute("data-id",demon.id);
                    option.innerText="#"+pos+" "+demon.name;
                    levelSelectorList.appendChild(option);
					
                    pos++;
                }catch(deezNutz){log.e(deezNutz,pos); break;}
            }
			let addOverride=document.getElementById("add-override-button");
			let progInput=document.getElementById("progress-input");
            addOverride.addEventListener("click",function(){
                let demID=levelSelector.getAttribute("data-id");
                let prog=Number(progInput.value);
                if(!(demID&&(prog==0||prog))){return;}

                calcState.currentPlayer.oHandler.addOverride(demID,prog,calcState.currentPlayer);

            });

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
            document.getElementById("overrides-container").append(container);
        });
    }
    if(TEST){
        window.addOverridesBox=addOverridesBox;
    }
	</script>
</body>
</html>
