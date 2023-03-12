/*Copyright (c) 2013-2016, Rob Schmuecker
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* The name Rob Schmuecker may not be used to endorse or promote products
  derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL MICHAEL BOSTOCK BE LIABLE FOR ANY DIRECT,
INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.*/
/*
    Version No.  |  Author  |  Change Request  | Description             |
      1.0           dvn        N/A               Initial version
*/
    /*| dvn | Ver 1.0| Custom functionality |*/
    //Basically a way to get the path to an object

//added jquery script and css
jQuery.loadCSS = function(url) {
    if (!$('link[href="' + url + '"]').length)
        $('head').append('<link rel="stylesheet" type="text/css" href="' + url + '">');
}
    var script = document.createElement('script');
$.loadCSS('https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.css');

script.src = 'https://code.jquery.com/ui/1.12.1/jquery-ui.js';
script.src = 'https://code.jquery.com/jquery-1.12.4.js';
script.src = 'https://code.jquery.com/ui/1.12.1/jquery-ui.js';
document.getElementsByTagName('head')[0].appendChild(script); 

count=0;

function searchTree(obj,search,path, paths){
    if(obj.name.indexOf(search) != -1){ //if search is found return, add the object to the path and return it
        path.push(obj);
        paths.push(path.slice(0)); // clone array
    }
    else if(obj.children || obj._children){ //if children are collapsed d3 object will have them instantiated as _children
        var children = (obj.children) ? obj.children : obj._children;
        for(var i=0;i<children.length;i++){
            path.push(obj);// we assume this path is the right one			  
            searchTree(children[i],search,path, paths);
            path.pop();
        }
    }
}

function searchTreeForCompliance(obj,search,path, paths){
    //searchTreeForCompliance(children[i],search,path, paths);
    if(obj.classification.indexOf(search) != -1){ //if search is found return, add the object to the path and return it
        path.push(obj);
        paths.push(path.slice(0)); // clone array
    }
    else if(obj.children || obj._children){ //if children are collapsed d3 object will have them instantiated as _children
        var children = (obj.children) ? obj.children : obj._children;
        for(var i=0;i<children.length;i++){
            path.push(obj);// we assume this path is the right one			  
            paths.push(path.slice(0)); 
            searchTreeForCompliance(children[i],search,path, paths);
            //path.pop();
        }
    }
}


function extract_select2_data(node,leaves,index){
        if (node.children){
            for(var i = 0;i<node.children.length;i++){
                index = extract_select2_data(node.children[i],leaves,index)[0];
            }
        }
        leaves.push({id:++index,text:node.name});
        return [index,leaves];
}    
function extract_explosion_data(node,leaves,index){  
   for(var i = 0;i<=20;i++){           
    leaves.push({id:i,text:""+i});
    }
    return [index,leaves];

}
var url = "/flatbom/"+vPid;
treeJSON = d3.json(url, function(error, treeData) {
console.log("check  URL ="+url);
// Calculate total nodes, max label length
var totalNodes = 0;
var maxLabelLength = 0;
// variables for drag/drop
var selectedNode = null;
var draggingNode = null;
// panning variables
var panSpeed = 200;
var panBoundary = 20; // Within 20px from edges will pan when dragging.
// Misc. variables
var i = 0;
var duration = 750;
var root;
var vCurrentAction = "";
// size of the diagram
var viewerWidth = $(document).width();
var viewerHeight = $(document).height();

var tree = d3.layout.tree()
    .size([viewerHeight, viewerWidth]);

// define a d3 diagonal projection for use by the node paths later on.
var diagonal = d3.svg.diagonal()
    .projection(function(d) {
        return [d.y, d.x];
    });

// A recursive helper function for performing some setup by walking through all nodes

function visit(parent, visitFn, childrenFn) {
    if (!parent) return;

    visitFn(parent);

    var children = childrenFn(parent);
    if (children) {
        var count = children.length;
        for (var i = 0; i < count; i++) {
            visit(children[i], visitFn, childrenFn);
        }
    }
}

// Call visit function to establish maxLabelLength
visit(treeData, function(d) {
    totalNodes++;
    maxLabelLength = Math.max(d.name.length, maxLabelLength);

}, function(d) {
    return d.children && d.children.length > 0 ? d.children : null;
});


// sort the tree according to the node names

function sortTree() {
    tree.sort(function(a, b) {
        return b.name.toLowerCase() < a.name.toLowerCase() ? 1 : -1;
    });
}
// Sort the tree initially incase the JSON isn't in a sorted order.
sortTree();

// TODO: Pan function, can be better implemented.

function pan(domNode, direction) {
    var speed = panSpeed;
    if (panTimer) {
        clearTimeout(panTimer);
        translateCoords = d3.transform(svgGroup.attr("transform"));
        if (direction == 'left' || direction == 'right') {
            translateX = direction == 'left' ? translateCoords.translate[0] + speed : translateCoords.translate[0] - speed;
            translateY = translateCoords.translate[1];
        } else if (direction == 'up' || direction == 'down') {
            translateX = translateCoords.translate[0];
            translateY = direction == 'up' ? translateCoords.translate[1] + speed : translateCoords.translate[1] - speed;
        }
        scaleX = translateCoords.scale[0];
        scaleY = translateCoords.scale[1];
        scale = zoomListener.scale();
        svgGroup.transition().attr("transform", "translate(" + translateX + "," + translateY + ")scale(" + scale + ")");
        d3.select(domNode).select('g.node').attr("transform", "translate(" + translateX + "," + translateY + ")");
        zoomListener.scale(zoomListener.scale());
        zoomListener.translate([translateX, translateY]);
        panTimer = setTimeout(function() {
            pan(domNode, speed, direction);
        }, 50);
    }
}

// Define the zoom function for the zoomable tree

function zoom() {
    svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}


// define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);

    // remove parent link
    

// define the baseSvg, attaching a class for styling and the zoomListener
var baseSvg = d3.select("#tree-container").append("svg")
    .attr("width", viewerWidth)
    .attr("height", viewerHeight)
    .attr("class", "overlay")
    .call(zoomListener);


// Define the drag listeners for drag/drop behaviour of nodes.
dragListener = d3.behavior.drag()
    .on("dragstart", function(d) {
        if (d == root) {
            return;
        }
        dragStarted = true;
        nodes = tree.nodes(d);
        d3.event.sourceEvent.stopPropagation();
        // it's important that we suppress the mouseover event on the node being dragged. Otherwise it will absorb the mouseover event and the underlying node will not detect it d3.select(this).attr('pointer-events', 'none');
    })
    .on("drag", function(d) {
        if (d == root) {
            return;
        }
        if (dragStarted) {
            domNode = this;
            initiateDrag(d, domNode);
        }

        // get coords of mouseEvent relative to svg container to allow for panning
        relCoords = d3.mouse($('svg').get(0));
        if (relCoords[0] < panBoundary) {
            panTimer = true;
            pan(this, 'left');
        } else if (relCoords[0] > ($('svg').width() - panBoundary)) {

            panTimer = true;
            pan(this, 'right');
        } else if (relCoords[1] < panBoundary) {
            panTimer = true;
            pan(this, 'up');
        } else if (relCoords[1] > ($('svg').height() - panBoundary)) {
            panTimer = true;
            pan(this, 'down');
        } else {
            try {
                clearTimeout(panTimer);
            } catch (e) {

            }
        }

        d.x0 += d3.event.dy;
        d.y0 += d3.event.dx;
        var node = d3.select(this);
        node.attr("transform", "translate(" + d.y0 + "," + d.x0 + ")");
        updateTempConnector();
    }).on("dragend", function(d) {
        if (d == root) {
            return;
        }
        domNode = this;
        if (selectedNode) {
            // now remove the element from the parent, and insert it into the new elements children
            var index = draggingNode.parent.children.indexOf(draggingNode);
            if (index > -1) {
                draggingNode.parent.children.splice(index, 1);
            }
            if (typeof selectedNode.children !== 'undefined' || typeof selectedNode._children !== 'undefined') {
                if (typeof selectedNode.children !== 'undefined') {
                    selectedNode.children.push(draggingNode);
                } else {
                    selectedNode._children.push(draggingNode);
                }
            } else {
                selectedNode.children = [];
                selectedNode.children.push(draggingNode);
            }
            // Make sure that the node being added to is expanded so user can see added node is correctly moved
            expand(selectedNode);
            sortTree();
            endDrag();
        } else {
            endDrag();
        }
    });

function endDrag() {
    selectedNode = null;
    d3.selectAll('.ghostCircle').attr('class', 'ghostCircle');
    d3.select(domNode).attr('class', 'node');
    // now restore the mouseover event or we won't be able to drag a 2nd time
    d3.select(domNode).select('.ghostCircle').attr('pointer-events', '');
    updateTempConnector();
    if (draggingNode !== null) {
        update(root);
        centerNode(draggingNode);
        draggingNode = null;
    }
}

// Helper functions for collapsing and expanding nodes.

function collapse(d) {
    if (d.children) {
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
    }
}

function expand(d) {
    if (d._children) {
        d.children = d._children;
        d.children.forEach(expand);
        d._children = null;
    }
}

var overCircle = function(d) {
    selectedNode = d;
    updateTempConnector();
};
var outCircle = function(d) {
    selectedNode = null;
    updateTempConnector();
};

// Function to update the temporary connector indicating dragging affiliation
var updateTempConnector = function() {
    var data = [];
    if (draggingNode !== null && selectedNode !== null) {
        // have to flip the source coordinates since we did this for the existing connectors on the original tree
        data = [{
            source: {
                x: selectedNode.y0,
                y: selectedNode.x0
            },
            target: {
                x: draggingNode.y0,
                y: draggingNode.x0
            }
        }];
    }
    var link = svgGroup.selectAll(".templink").data(data);

    link.enter().append("path")
        .attr("class", "templink")
        .attr("d", d3.svg.diagonal())
        .attr('pointer-events', 'none');

    link.attr("d", d3.svg.diagonal());

    link.exit().remove();
};

// Function to center node when clicked/dropped so node doesn't get lost when collapsing/moving with large amount of children.

function centerNode(source) {
    scale = zoomListener.scale();
    x = -source.y0;
    y = -source.x0;
    x = x * scale + viewerWidth / 2;
    y = y * scale + viewerHeight / 2;
    d3.select('g').transition()
        .duration(duration)
        .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
    zoomListener.scale(scale);
    zoomListener.translate([x, y]);
}

// Toggle children function

function toggleChildren(d) {
    if (d.children) {
        d._children = d.children;
        d.children = null;
    } else if (d._children) {
        d.children = d._children;
        d._children = null;
    }
    return d;
}

// Dialog box on node click
function check(d){
//var dialogText ="<div id='dialog'> <h1>Some text</h1></div>";
// $('body').append(dialogText);
//$('<div id=dialog><h1>Some text</h1></div>').prop('title' ,'test');
//console.log(" clicked node is " +d.cost);
$(document).ready(function(){

// Initialize the dialog
//var sampleData='details will be here !!!';
var DialogContentHtml='<div id=dialog><h5><b>Failure cases : </b>'+d.failure_cases+'</h5><h5><b>Impacted PIDs :</b> '+ d.Impacted_PIDs+'</h5><h5><b># RMA units in last 1 year : </b>'+d.RMA_Units+'</h5><h5><b>Potential Warranty Impact : </b>'+d.Warranty_Cost_Impact+'</h5></div>';
$(DialogContentHtml).dialog({
    autoOpen: false,
    title:'Failure Analysis',
    show: {
            effect: "blind",
            duration: 1000
         },
    hide: {
            effect: "explode",
            duration: 1000
          }
});

});
//open the dialog box
 $("#dialog").dialog("open");

console.log("check function !!")
}

function click(d) {
    //if (d3.event.defaultPrevented) return; // click suppressed
    d = toggleChildren(d);
    update(d);
    //check();
    centerNode(d);
}

function update(source) {
    // Compute the new height, function counts total children of root node and sets tree height accordingly.
    // This prevents the layout looking squashed when new nodes are made visible or looking sparse when nodes are removed
    // This makes the layout more consistent.
    var levelWidth = [1];
    var childCount = function(level, n) {

        if (n.children && n.children.length > 0) {
            if (levelWidth.length <= level + 1) levelWidth.push(0);

            levelWidth[level + 1] += n.children.length;
            n.children.forEach(function(d) {
                childCount(level + 1, d);
            });
        }
    };
    childCount(0, root);
    var newHeight = d3.max(levelWidth) * 25; // 25 pixels per line  
    tree = tree.size([newHeight, viewerWidth]);

    // Compute the new tree layout.
    var nodes = tree.nodes(root).reverse(),
        links = tree.links(nodes);
    
    // Set widths between levels based on maxLabelLength.
    nodes.forEach(function(d) {
        d.y = (d.depth * (maxLabelLength * 10)); //maxLabelLength * 10px
        // alternatively to keep a fixed scale one can set a fixed depth per level
        // Normalize for fixed-depth by commenting out below line
        // d.y = (d.depth * 500); //500px per level.
    });

    // Update the nodes…
    node = svgGroup.selectAll("g.node")
        .data(nodes, function(d) {
            return d.id || (d.id = ++i);
        });        

    // Enter any new nodes at the parent's previous position.
    dblclick_timer = false
    // var nodeEnter = node.enter().append("g")
    //     //.call(dragListener)
    //     .attr("class", "node")
    //     .attr("transform", function(d) {
    //         return "translate(" + source.y0 + "," + source.x0 + ")";
    //     })
    //     // .on('click', click)
    //     .on('dblclick',function(d){ alert("node was double clicked"); });
    var nodeEnter = node.enter().append("g")
    //.call(dragListener)
    .attr("class", "node")
    .attr("transform", function(d) {
        return "translate(" + source.y0 + "," + source.x0 + ")";
    })
    // .on('click', click)
    .on('click',function(d) {
        // if double click timer is active, this click is the double click
        if ( dblclick_timer )
        {
            clearTimeout(dblclick_timer)
            dblclick_timer = false
            // double click code code comes here
            console.log("double click fired");
            check(d);
        }
        // otherwise, what to do after single click (double click has timed out)
        else dblclick_timer = setTimeout( function(){
            dblclick_timer = false
            // single click code code comes here
            console.log("single click fired");
            click(d);
        }, 250)
    } );
    
    nodeEnter.append("circle")
        .attr('class', 'nodeCircle')
        .attr("r", 0)
        .style("fill", function(d) {
            return d._children ? "lightsteelblue" : "#fff";
        });

    nodeEnter.append("text")
        .attr("x", function(d) {
            return d.children || d._children ? -10 : 10;
        })
        .attr("dy", ".35em")
        .attr('class', 'nodeText')
        .attr("text-anchor", function(d) {
            return d.children || d._children ? "end" : "start";
        })
        .text(function(d) {
            return d.name;
        })
        .style("fill-opacity", 0);

    // phantom node to give us mouseover in a radius around it
    nodeEnter.append("circle")
        .attr('class', 'ghostCircle')
        .attr("r", 30)
        .attr("opacity", 0.2) // change this to zero to hide the target area
    .style("fill", "red")
        .attr('pointer-events', 'mouseover')
        .on("mouseover", function(node) {
            overCircle(node);
        })
        .on("mouseout", function(node) {
            outCircle(node);
        });

    // Update the text to reflect whether node has children or not.
    node.select('text')
        .attr("x", function(d) {
            return d.children || d._children ? -10 : 10;
        })
        .attr("text-anchor", function(d) {
            return d.children || d._children ? "end" : "start";
        })
        .attr("class", function(d) {
           
            // text elements "blue"
            return "event-text"
            // if (count % 2 == 0){
            //      return "event-text"
            //  }
            //   else {
            //      return "event-text-blue"
            //  }
         })
        .text(function(d) {
            str=d.cost;
            // res=str.bold();
            return d.name;
            //if (count%2 == 0) return d.name +" ";
            //else return d.name+" \xa0{"+str+"}"
        })
        .append("tspan")
        .attr("class", function(d) {
           
            // text elements "blue"
                   return "event-text-blue"
             
         })
        .text(function(d) {
            if(count%2!=0 && d.cost !=null)
                return " \xa0{"+d.cost+"}";
        });

    // Change the circle fill depending on whether it has children and is collapsed
    node.select("circle.nodeCircle")
        .attr("r", 4.5)
        .style("fill", function(d) {
            if(d.class === "found"){
                return "#d7e81c"; //yellow
            }else if(d.class ==="compliant"){
                return "#72cc0c"; 
            }else if(d.class ==="non-compliant"){
                return "#f99334"; 
            }else if(d.class ==="TPSD-Yes"){
                return "#d6870a"; 
            }else if(d.class ==="TPSD-No"){
                return "#508e9e";
            }else if(d.class ==="fails-Yes"){
                return "#fc0303";
            }else if (d.cost == null && count%2!=0) {
                return "#B22222";
            }
            else{
                return d._children ? "lightsteelblue" : "#fff";
            }
        }).style("stroke", function(d) {
            if(d.class === "found"){
                return "#d7e81c"; //red
            }else if(d.class === "fails-Yes"){
                return "#fc0303"; //red
            }});

    // Transition nodes to their new position.
    var nodeUpdate = node.transition()
        .duration(duration)
        .attr("transform", function(d) {
            return "translate(" + d.y + "," + d.x + ")";
        });

    // Fade the text in
    nodeUpdate.select("text")
        .style("fill-opacity", 1);

    // Transition exiting nodes to the parent's new position.
    var nodeExit = node.exit().transition()
        .duration(duration)
        .attr("transform", function(d) {
            return "translate(" + source.y + "," + source.x + ")";
        })
        .remove();

    nodeExit.select("circle")
        .attr("r", 0);

    nodeExit.select("text")
        .style("fill-opacity", 0);

    // Update the links…
    var link = svgGroup.selectAll("path.link")
        .data(links, function(d) {
            return d.target.id;
        });

    // Enter any new links at the parent's previous position.
    link.enter().insert("path", "g")
        .attr("class", "link")
        .attr("d", function(d) {
            var o = {
                x: source.x0,
                y: source.y0
            };
            return diagonal({
                source: o,
                target: o
            });
        });

    // Transition links to their new position.
    link.transition()
        .duration(duration)
        .attr("d", diagonal)
        .style("stroke",function(d){
            console.log();
            if(d.target.class==="found"){
                return "#d7e81c";
            }else if (d.target.class==="fails-Yes"){
                return "#d7e81c";
            }
        });

    // Transition exiting nodes to the parent's new position.
    link.exit().transition()
        .duration(duration)
        .attr("d", function(d) {
            var o = {
                x: source.x,
                y: source.y
            };
            return diagonal({
                source: o,
                target: o
            });
        })
        .remove();
    // Stash the old positions for transition.
    nodes.forEach(function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
    });

}

// Append a group which holds all nodes and which the zoom Listener can act upon.
var svgGroup = baseSvg.append("g");

// Define the root
//root = treeData;
root = treeData;
root.x0 = viewerHeight / 2;
root.y0 = 0;

//Added by dvn
select2_data         = extract_select2_data(treeData,[],0)[1];
explosion_data       = extract_explosion_data(treeData,[],0)[1];
// Layout the tree initially and center on the root node.
update(root);
centerNode(root);  
document.getElementById("controls").style = "display";
//init search box
$("#search").select2({
    data: select2_data,
    containerCssClass: "search",
    width:"16%"
});
$("#explosion_level").select2({
    data: explosion_data,
    containerCssClass: "search",
    width:"10%"
});          
//attach search box listener
$("#search").on("select2-selecting", function(e) {
    var paths = [];
    searchTree(root,e.object.text,[], paths);
    if(paths.length > 0)
    {
        paths.forEach(function(p) { openPaths(p) });
        //openPaths(paths);
    }
    else{
        alert(e.object.text+" not found!");
    }
})
//attach explosion level box listener
$("#explosion_level").on("select2-selecting", function(e) {
    var nodes = tree.nodes(root).reverse();
    var vPreviousExplosionLevel = $(this).val();
    var vSelectedExplosionLevel = e.object.id;
    if (vPreviousExplosionLevel!=""){
        if (vPreviousExplosionLevel>vSelectedExplosionLevel){
            nodes.forEach(function(d) {
                if (d.depth >=vSelectedExplosionLevel){
                    collapse(d);
                }
            });
        }else{
            nodes.forEach(function(d) {
                if (d.depth >=vSelectedExplosionLevel){
                    expand(d);
                }else{
                    alert(d.depth);
                }
            });
        }
    }else{
        nodes.forEach(function(d) {
            if (d.depth >=vSelectedExplosionLevel){
                d._children = d.children;
                d.children = null;
            }
        });
    }
    update(root);
    centerNode(root);
})
//Highlight compliant items
$("#btnHighlightCompliance").on("click", function(e) {
    /*var paths = [];
    searchTreeForCompliance(root,"COMPONENT",[], paths);
    console.log(paths);
    if(paths.length > 0)
    {
        paths.forEach(function(p) { openPathsForCompliance(p) });
    }
    else{
        alert("Found nothing");
    }*/
    var nodes = tree.nodes(root).reverse();

    nodes.forEach(function(d) {
        if(d.Risk_Level == "compliant"){
            
            d.class = 'compliant';
        }else{
            d.class = 'non-compliant';
        }
    });
    update(root);
    //centerNode(root);
})
//Highlight failure case items
$("#btnHighlightFails").on("click", function(e) {
    var nodes = tree.nodes(root).reverse();
    var failedCount = 0;
    nodes.forEach(function(d) {
        try{
            failedCount = d.failure_cases.length;
        }catch{
            failedCount =0;
        }
        
        if(failedCount == 0){
            d.class = 'fails-No';
            console.log("no failure cases found");
        }else{
            d.class = 'fails-Yes';
            console.log("yes failure cases found");
        }
    });
    update(root);
    //centerNode(root);
})
$("#btnHighlightTPSD").on("click", function(e) {
    var nodes = tree.nodes(root).reverse();
    nodes.forEach(function(d) {
        if(d.TPSD == "Yes"){
            d.class = 'TPSD-Yes';
        }else{
            d.class = 'TPSD-No';
        }
    });
    update(root);
    //centerNode(root);
})
//Rest to original BOM
$("#btnReset").on("click", function(e) {
    var nodes = tree.nodes(root).reverse();
    nodes.forEach(function(d) {
        d.class = '';
    });
    update(root);
    //centerNode(root);
})


//displaying cost
$("#btnCost").on("click", function(e) {
    var nodes = tree.nodes(root).reverse();
    // nodes.forEach(function(d) {
    //     d.class = '';
    // });
    count=count+1;
    update(root);
    //centerNode(root);
})

function openPaths(paths){
    
    for(var i =0;i<paths.length;i++){
        if(paths[i].id !== "1"){//i.e. not root
            console.log(paths[i].class);
            if(paths[i].class !== 'fails-Yes'){
                console.log("Renamed to found");
                paths[i].class = 'found';
            }
            if(paths[i]._children){ //if children are hidden: open them, otherwise: don't do anything
                paths[i].children = paths[i]._children;
                paths[i]._children = null;
            }
            update(paths[i]);
        }
    }
}
function openPathsForCompliance(paths){
    for(var i =0;i<paths.length;i++){
        if(paths[i].id !== "1"){//i.e. not root
            if(paths[i].classification == "COMPONENT"){
                paths[i].class = 'compliant';
            }else{
                paths[i].class = 'non-compliant';
            }
        }
    }
}
})