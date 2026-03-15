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
      2.0           dvn        N/A               Migrated to D3 v7
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

count = 0;

// Search through hierarchy nodes by name
function searchTree(obj, search, path, paths) {
    if (obj.data.name.indexOf(search) != -1) {
        path.push(obj);
        paths.push(path.slice(0));
    } else if (obj.children || obj._children) {
        var children = (obj.children) ? obj.children : obj._children;
        for (var i = 0; i < children.length; i++) {
            path.push(obj);
            searchTree(children[i], search, path, paths);
            path.pop();
        }
    }
}

function searchTreeForCompliance(obj, search, path, paths) {
    if (obj.data.classification.indexOf(search) != -1) {
        path.push(obj);
        paths.push(path.slice(0));
    } else if (obj.children || obj._children) {
        var children = (obj.children) ? obj.children : obj._children;
        for (var i = 0; i < children.length; i++) {
            path.push(obj);
            paths.push(path.slice(0));
            searchTreeForCompliance(children[i], search, path, paths);
        }
    }
}

function extract_select2_data(node, leaves, index) {
    if (node.children) {
        for (var i = 0; i < node.children.length; i++) {
            index = extract_select2_data(node.children[i], leaves, index)[0];
        }
    }
    leaves.push({ id: ++index, text: node.data.name });
    return [index, leaves];
}

function extract_explosion_data(node, leaves, index) {
    for (var i = 0; i <= 20; i++) {
        leaves.push({ id: i, text: "" + i });
    }
    return [index, leaves];
}

var url = "/flatbom/" + vPid;

d3.json(url).then(function(treeData) {
    console.log("check  URL =" + url);

    var totalNodes = 0;
    var maxLabelLength = 0;
    // variables for drag/drop
    var selectedNode = null;
    var draggingNode = null;
    // panning variables
    var panSpeed = 200;
    var panBoundary = 20;
    // Misc. variables
    var i = 0;
    var duration = 750;
    var root;
    var vCurrentAction = "";
    // size of the diagram
    var viewerWidth = window.innerWidth;
    var viewerHeight = window.innerHeight - 50; // reserve space for bottom controls bar

    // D3 v7: d3.tree() replaces d3.layout.tree()
    var tree = d3.tree().size([viewerHeight, viewerWidth]);

    // D3 v7: d3.linkHorizontal() replaces d3.svg.diagonal()
    // x/y accessors are swapped because tree layout uses x=rank(vertical), y=depth(horizontal)
    var diagonal = d3.linkHorizontal()
        .x(function(d) { return d.y; })
        .y(function(d) { return d.x; });

    // Separate diagonal for temp drag connector (data already in screen coords)
    var tempDiagonal = d3.linkHorizontal()
        .x(function(d) { return d.x; })
        .y(function(d) { return d.y; });

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

    // Call visit function to establish maxLabelLength (operates on raw data)
    visit(treeData, function(d) {
        totalNodes++;
        maxLabelLength = Math.max(d.name.length, maxLabelLength);
    }, function(d) {
        return d.children && d.children.length > 0 ? d.children : null;
    });

    // D3 v7: sort on the hierarchy node (root must exist before calling sortTree)
    function sortTree() {
        root.sort(function(a, b) {
            return b.data.name.toLowerCase() < a.data.name.toLowerCase() ? 1 : -1;
        });
    }

    // TODO: Pan function
    function pan(domNode, direction) {
        var speed = panSpeed;
        if (panTimer) {
            clearTimeout(panTimer);
            // D3 v7: d3.zoomTransform() replaces d3.transform()
            var currentTransform = d3.zoomTransform(baseSvg.node());
            var translateX, translateY;
            if (direction == 'left' || direction == 'right') {
                translateX = direction == 'left' ? currentTransform.x + speed : currentTransform.x - speed;
                translateY = currentTransform.y;
            } else if (direction == 'up' || direction == 'down') {
                translateX = currentTransform.x;
                translateY = direction == 'up' ? currentTransform.y + speed : currentTransform.y - speed;
            }
            var scale = currentTransform.k;
            svgGroup.transition().attr("transform", "translate(" + translateX + "," + translateY + ")scale(" + scale + ")");
            d3.select(domNode).select('g.node').attr("transform", "translate(" + translateX + "," + translateY + ")");
            baseSvg.call(zoomListener.transform, d3.zoomIdentity.translate(translateX, translateY).scale(scale));
            panTimer = setTimeout(function() {
                pan(domNode, direction);
            }, 50);
        }
    }

    // D3 v7: zoom handler receives event as first argument
    function zoom(event) {
        svgGroup.attr("transform", event.transform);
    }

    // D3 v7: d3.zoom() replaces d3.behavior.zoom()
    // Filter out dblclick so it doesn't trigger zoom-in when double-clicking nodes
    var zoomListener = d3.zoom()
        .scaleExtent([0.1, 3])
        .filter(function(event) { return event.type !== 'dblclick'; })
        .on("zoom", zoom);

    // define the baseSvg, attaching a class for styling and the zoomListener
    var baseSvg = d3.select("#tree-container").append("svg")
        .attr("width", viewerWidth)
        .attr("height", viewerHeight)
        .attr("class", "overlay")
        .call(zoomListener);

    // D3 v7: d3.drag() replaces d3.behavior.drag(); handlers receive (event, d)
    dragListener = d3.drag()
        .on("start", function(event, d) {
            if (d === root) return;
            dragStarted = true;
            nodes = root.descendants();
            event.sourceEvent.stopPropagation();
        })
        .on("drag", function(event, d) {
            if (d === root) return;
            if (dragStarted) {
                domNode = this;
                initiateDrag(d, domNode);
            }
            // D3 v7: d3.pointer() replaces d3.mouse()
            relCoords = d3.pointer(event, $('svg').get(0));
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
                try { clearTimeout(panTimer); } catch (e) {}
            }
            d.x0 += event.dy;
            d.y0 += event.dx;
            var node = d3.select(this);
            node.attr("transform", "translate(" + d.y0 + "," + d.x0 + ")");
            updateTempConnector();
        })
        .on("end", function(event, d) {
            if (d === root) return;
            domNode = this;
            if (selectedNode) {
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
            data = [{
                source: { x: selectedNode.y0, y: selectedNode.x0 },
                target: { x: draggingNode.y0, y: draggingNode.x0 }
            }];
        }
        var link = svgGroup.selectAll(".templink").data(data);

        link.enter().append("path")
            .attr("class", "templink")
            .attr("d", function(d) { return tempDiagonal(d); })
            .attr('pointer-events', 'none');

        link.attr("d", function(d) { return tempDiagonal(d); });

        link.exit().remove();
    };

    // Function to center node when clicked/dropped
    function centerNode(source) {
        var t = d3.zoomTransform(baseSvg.node());
        var scale = t.k;
        var x = -source.y0 * scale + viewerWidth / 2;
        var y = -source.x0 * scale + viewerHeight / 2;
        // D3 v7: use zoom.transform with transition for smooth centering
        baseSvg.transition()
            .duration(duration)
            .call(zoomListener.transform, d3.zoomIdentity.translate(x, y).scale(scale));
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

    // Dialog box on node double-click
    function check(d) {
        $(document).ready(function() {
            var DialogContentHtml = '<div id=dialog><h5><b>Failure cases : </b>' + d.data.failure_cases +
                '</h5><h5><b>Impacted PIDs :</b> ' + d.data.Impacted_PIDs +
                '</h5><h5><b># RMA units in last 1 year : </b>' + d.data.RMA_Units +
                '</h5><h5><b>Potential Warranty Impact : </b>' + d.data.Warranty_Cost_Impact + '</h5></div>';
            $(DialogContentHtml).dialog({
                autoOpen: false,
                title: 'Failure Analysis',
                show: { effect: "blind", duration: 1000 },
                hide: { effect: "explode", duration: 1000 }
            });
        });
        $("#dialog").dialog("open");
        console.log("check function !!");
    }

    function click(d) {
        d = toggleChildren(d);
        update(d);
        centerNode(d);
    }

    function update(source) {
        // Compute the new height based on visible nodes
        var levelWidth = [1];
        var childCount = function(level, n) {
            if (n.children && n.children.length > 0) {
                if (levelWidth.length <= level + 1) levelWidth.push(0);
                levelWidth[level + 1] += n.children.length;
                n.children.forEach(function(d) { childCount(level + 1, d); });
            }
        };
        childCount(0, root);
        var newHeight = d3.max(levelWidth) * 25; // 25 pixels per line

        // D3 v7: tree.size() then tree(root) to compute layout
        tree.size([newHeight, viewerWidth]);
        tree(root);

        // D3 v7: root.descendants() replaces tree.nodes(); root.links() replaces tree.links()
        var nodes = root.descendants().reverse();
        var links = root.links();

        // Set widths between levels based on maxLabelLength
        nodes.forEach(function(d) {
            d.y = (d.depth * (maxLabelLength * 10));
        });

        // Update the nodes
        var node = svgGroup.selectAll("g.node")
            .data(nodes, function(d) {
                return d.id || (d.id = ++i);
            });

        dblclick_timer = false;

        // Enter any new nodes at the parent's previous position
        var nodeEnter = node.enter().append("g")
            //.call(dragListener)
            .attr("class", "node")
            .attr("transform", function(d) {
                return "translate(" + source.y0 + "," + source.x0 + ")";
            })
            // D3 v7: event handlers receive (event, d) instead of (d)
            .on('click', function(event, d) {
                if (dblclick_timer) {
                    clearTimeout(dblclick_timer);
                    dblclick_timer = false;
                    console.log("double click fired");
                    check(d);
                } else {
                    dblclick_timer = setTimeout(function() {
                        dblclick_timer = false;
                        console.log("single click fired");
                        click(d);
                    }, 250);
                }
            });

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
                return d.data.name;
            })
            .style("fill-opacity", 0);

        // phantom node to give us mouseover in a radius around it
        nodeEnter.append("circle")
            .attr('class', 'ghostCircle')
            .attr("r", 30)
            .attr("opacity", 0.2)
            .style("fill", "red")
            .attr('pointer-events', 'mouseover')
            .on("mouseover", function(event, d) { overCircle(d); })
            .on("mouseout", function(event, d) { outCircle(d); });

        // D3 v7: merge enter + update selections for shared operations
        var nodeAll = nodeEnter.merge(node);

        // Update the text to reflect whether node has children or not
        nodeAll.select('text')
            .attr("x", function(d) {
                return d.children || d._children ? -10 : 10;
            })
            .attr("text-anchor", function(d) {
                return d.children || d._children ? "end" : "start";
            })
            .attr("class", function(d) {
                return "event-text";
            })
            .text(function(d) {
                str = d.data.cost;
                return d.data.name;
            })
            .append("tspan")
            .attr("class", function(d) {
                return "event-text-blue";
            })
            .text(function(d) {
                if (count % 2 != 0 && d.data.cost != null)
                    return " \xa0{" + d.data.cost + "}";
            });

        // Change the circle fill depending on whether it has children and is collapsed
        nodeAll.select("circle.nodeCircle")
            .attr("r", 4.5)
            .style("fill", function(d) {
                if (d.class === "found") {
                    return "red";
                } else if (d.class === "compliant") {
                    return "#72cc0c";
                } else if (d.class === "non-compliant") {
                    return "#f99334";
                } else if (d.class === "TPSD-Yes") {
                    return "#d6870a";
                } else if (d.class === "TPSD-No") {
                    return "#508e9e";
                } else if (d.class === "fails-Yes") {
                    return "#fc0303";
                } else if (d.data.cost == null && count % 2 != 0) {
                    return "#B22222";
                } else {
                    return d._children ? "lightsteelblue" : "orange";
                }
            })
            .style("stroke", function(d) {
                if (d.class === "found") {
                    return "red";
                } else if (d.class === "fails-Yes") {
                    return "#fc0303";
                } else {
                    return "black";
                }
            });

        // Transition nodes to their new position
        nodeAll.transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + d.y + "," + d.x + ")";
            });

        // Fade the text in
        nodeAll.select("text").transition()
            .duration(duration)
            .style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position
        var nodeExit = node.exit().transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + source.y + "," + source.x + ")";
            })
            .remove();

        nodeExit.select("circle").attr("r", 0);
        nodeExit.select("text").style("fill-opacity", 0);

        // Update the links
        var link = svgGroup.selectAll("path.link")
            .data(links, function(d) {
                return d.target.id;
            });

        // Enter any new links at the parent's previous position
        var linkEnter = link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("d", function(d) {
                var o = { x: source.x0, y: source.y0 };
                return diagonal({ source: o, target: o });
            });

        // D3 v7: merge enter + update for links
        var linkAll = linkEnter.merge(link);

        // Transition links to their new position
        linkAll.transition()
            .duration(duration)
            .attr("d", diagonal)
            .style("stroke", function(d) {
                if (d.target.class === "found") {
                    return "red";
                } else if (d.target.class === "fails-Yes") {
                    return "red";
                }
            });

        // Transition exiting links to the parent's new position
        link.exit().transition()
            .duration(duration)
            .attr("d", function(d) {
                var o = { x: source.x, y: source.y };
                return diagonal({ source: o, target: o });
            })
            .remove();

        // Stash the old positions for transition
        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    // Append a group which holds all nodes and which the zoom Listener can act upon
    var svgGroup = baseSvg.append("g");

    // D3 v7: d3.hierarchy() wraps raw data; node.data holds the original data properties
    root = d3.hierarchy(treeData, function(d) { return d.children; });
    root.x0 = viewerHeight / 2;
    root.y0 = 0;

    // Sort after hierarchy is created
    sortTree();

    select2_data   = extract_select2_data(root, [], 0)[1];
    explosion_data = extract_explosion_data(root, [], 0)[1];

    // Layout the tree initially and center on the root node
    update(root);
    centerNode(root);
    document.getElementById("controls").style = "display";

    // init search box
    $("#search").select2({
        data: select2_data,
        containerCssClass: "search",
        width: "16%"
    });
    $("#explosion_level").select2({
        data: explosion_data,
        containerCssClass: "search",
        width: "10%"
    });

    // attach search box listener
    $("#search").on("select2-selecting", function(e) {
        var paths = [];
        searchTree(root, e.object.text, [], paths);
        if (paths.length > 0) {
            paths.forEach(function(p) { openPaths(p); });
        } else {
            alert(e.object.text + " not found!");
        }
    });

    // attach explosion level box listener
    $("#explosion_level").on("select2-selecting", function(e) {
        var nodes = root.descendants().reverse();
        var vPreviousExplosionLevel = $(this).val();
        var vSelectedExplosionLevel = e.object.id;
        if (vPreviousExplosionLevel != "") {
            if (vPreviousExplosionLevel > vSelectedExplosionLevel) {
                nodes.forEach(function(d) {
                    if (d.depth >= vSelectedExplosionLevel) { collapse(d); }
                });
            } else {
                nodes.forEach(function(d) {
                    if (d.depth >= vSelectedExplosionLevel) { expand(d); }
                    else { alert(d.depth); }
                });
            }
        } else {
            nodes.forEach(function(d) {
                if (d.depth >= vSelectedExplosionLevel) {
                    d._children = d.children;
                    d.children = null;
                }
            });
        }
        update(root);
        centerNode(root);
    });

    // Highlight compliant items
    $("#btnHighlightCompliance").on("click", function(e) {
        var nodes = root.descendants().reverse();
        nodes.forEach(function(d) {
            if (d.data.Risk_Level == "compliant") {
                d.class = 'compliant';
            } else {
                d.class = 'non-compliant';
            }
        });
        update(root);
    });

    // Highlight failure case items
    $("#btnHighlightFails").on("click", function(e) {
        var nodes = root.descendants().reverse();
        var failedCount = 0;
        nodes.forEach(function(d) {
            try { failedCount = d.data.failure_cases.length; }
            catch(e) { failedCount = 0; }
            if (failedCount == 0) {
                d.class = 'fails-No';
                console.log("no failure cases found");
            } else {
                d.class = 'fails-Yes';
                console.log("yes failure cases found");
            }
        });
        update(root);
    });

    $("#btnHighlightTPSD").on("click", function(e) {
        var nodes = root.descendants().reverse();
        nodes.forEach(function(d) {
            if (d.data.TPSD == "Yes") {
                d.class = 'TPSD-Yes';
            } else {
                d.class = 'TPSD-No';
            }
        });
        update(root);
    });

    // Reset to original BOM
    $("#btnReset").on("click", function(e) {
        var nodes = root.descendants().reverse();
        nodes.forEach(function(d) { d.class = ''; });
        update(root);
    });

    // Display cost
    $("#btnCost").on("click", function(e) {
        count = count + 1;
        update(root);
    });

    function openPaths(paths) {
        for (var i = 0; i < paths.length; i++) {
            if (paths[i].id !== "1") {
                console.log(paths[i].class);
                if (paths[i].class !== 'fails-Yes') {
                    console.log("Renamed to found");
                    paths[i].class = 'found';
                }
                if (paths[i]._children) {
                    paths[i].children = paths[i]._children;
                    paths[i]._children = null;
                }
                update(paths[i]);
            }
        }
    }

    function openPathsForCompliance(paths) {
        for (var i = 0; i < paths.length; i++) {
            if (paths[i].id !== "1") {
                if (paths[i].data.classification == "COMPONENT") {
                    paths[i].class = 'compliant';
                } else {
                    paths[i].class = 'non-compliant';
                }
            }
        }
    }

}).catch(function(error) {
    console.error("Error loading data:", error);
});